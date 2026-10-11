import crypto from 'node:crypto';
import path from 'node:path';
import AdmZip from 'adm-zip';
import type { SourceType } from '@omnitutor/shared';
import { uploadLimits } from '@omnitutor/shared';
import { BadRequestError } from './errors.js';

export interface FileValidationResult {
  sourceType: SourceType;
  detectedMimeType: string;
  sanitizedFilename: string;
  storageKey: string;
  safeFilename: string;
}

// Magic bytes definitions
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // PK..
const MP3_ID3_MAGIC = Buffer.from([0x49, 0x44, 0x33]); // ID3
const RIFF_MAGIC = Buffer.from([0x52, 0x49, 0x46, 0x46]); // RIFF
const WAVE_MAGIC = Buffer.from([0x57, 0x41, 0x56, 0x45]); // WAVE

/**
 * Sanitize filename to prevent directory traversal and null byte injections
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'unnamed_file';
  }

  // Remove null bytes and control characters
  let clean = filename.replace(/[\x00-\x1f\x80-\x9f]/g, '');

  // Strip paths (both POSIX and Windows)
  clean = path.basename(clean);

  // Replace invalid characters: \ / : * ? " < > |
  clean = clean.replace(/[\\/:*?"<>|]/g, '_').trim();

  // Strip leading dots to prevent hidden file exploits or ..
  clean = clean.replace(/^\.+/, '');

  if (!clean || clean.length === 0) {
    clean = 'material_file';
  }

  // Restrict length
  return clean.slice(0, 150);
}

/**
 * Check if buffer contains binary text or valid UTF-8
 */
function isValidTextBuffer(buffer: Buffer): boolean {
  if (buffer.length === 0) return true;
  // Check first 4KB for null bytes which indicate binary file
  const checkLen = Math.min(buffer.length, 4096);
  for (let i = 0; i < checkLen; i++) {
    if (buffer[i] === 0x00) {
      return false;
    }
  }
  return true;
}

/**
 * Validate ZIP archives (DOCX and PPTX) against archive/decompression bombs
 */
function inspectZipArchive(
  buffer: Buffer,
  expectedKind: 'docx' | 'pptx'
): { isValid: boolean; reason?: string } {
  try {
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();

    if (entries.length > 3000) {
      return { isValid: false, reason: 'Archive bomb protection: Too many entries inside file' };
    }

    let totalUncompressedSize = 0;
    let hasContentTypes = false;
    let hasExpectedDir = false;

    const targetDir = expectedKind === 'docx' ? 'word/' : 'ppt/';

    for (const entry of entries) {
      // Prevent Zip Slip directory traversal inside zip
      if (entry.entryName.includes('..') || path.isAbsolute(entry.entryName)) {
        return { isValid: false, reason: 'Zip slip directory traversal detected in archive' };
      }

      totalUncompressedSize += entry.header.size;

      if (entry.entryName === '[Content_Types].xml') {
        hasContentTypes = true;
      }
      if (entry.entryName.startsWith(targetDir)) {
        hasExpectedDir = true;
      }
    }

    // Expansion bomb check: uncompressed size cannot exceed 100MB
    const maxUncompressed = 100 * 1024 * 1024;
    if (totalUncompressedSize > maxUncompressed) {
      return { isValid: false, reason: 'Decompression bomb protection: Uncompressed size exceeds 100MB' };
    }

    // Ratio check (bomb check)
    const ratio = totalUncompressedSize / Math.max(buffer.length, 1);
    if (ratio > 50) {
      return { isValid: false, reason: 'Decompression ratio anomaly (> 50x) detected' };
    }

    if (!hasContentTypes || !hasExpectedDir) {
      return {
        isValid: false,
        reason: `Corrupted or invalid ${expectedKind.toUpperCase()} archive structure`,
      };
    }

    return { isValid: true };
  } catch (err) {
    return {
      isValid: false,
      reason: `Failed to inspect ${expectedKind.toUpperCase()} archive: ${err instanceof Error ? err.message : 'Invalid zip'}`,
    };
  }
}

/**
 * Inspect magic bytes and verify file structure independently of browser MIME headers
 */
export function verifyFileSignatureAndLimits(
  buffer: Buffer,
  filename: string,
  declaredMimeType?: string
): FileValidationResult {
  const sanitized = sanitizeFilename(filename);
  const ext = path.extname(sanitized).toLowerCase();

  if (buffer.length === 0) {
    throw new BadRequestError('Uploaded file is empty (0 bytes)');
  }

  let detectedSourceType: SourceType | null = null;
  let detectedMimeType = 'application/octet-stream';

  // 1. PDF Check
  if (buffer.length >= 4 && buffer.subarray(0, 4).equals(PDF_MAGIC)) {
    detectedSourceType = 'pdf';
    detectedMimeType = 'application/pdf';
  }
  // 2. ZIP-based check (DOCX, PPTX)
  else if (buffer.length >= 4 && buffer.subarray(0, 4).equals(ZIP_MAGIC)) {
    if (ext === '.pptx') {
      const inspect = inspectZipArchive(buffer, 'pptx');
      if (!inspect.isValid) {
        throw new BadRequestError(`Invalid PPTX file: ${inspect.reason}`);
      }
      detectedSourceType = 'pptx';
      detectedMimeType =
        'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    } else if (ext === '.docx') {
      const inspect = inspectZipArchive(buffer, 'docx');
      if (!inspect.isValid) {
        throw new BadRequestError(`Invalid DOCX file: ${inspect.reason}`);
      }
      detectedSourceType = 'docx';
      detectedMimeType =
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else {
      // General zip uploaded with unexpected extension
      throw new BadRequestError(
        'Zip archives are only supported as .docx or .pptx presentation/document packages'
      );
    }
  }
  // 3. Audio: MP3
  else if (
    (buffer.length >= 3 && buffer.subarray(0, 3).equals(MP3_ID3_MAGIC)) ||
    (buffer.length >= 2 && buffer[0] === 0xff && (buffer[1]! & 0xe0) === 0xe0)
  ) {
    detectedSourceType = 'audio';
    detectedMimeType = 'audio/mpeg';
  }
  // 4. Audio: WAV (RIFF...WAVE)
  else if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).equals(RIFF_MAGIC) &&
    buffer.subarray(8, 12).equals(WAVE_MAGIC)
  ) {
    detectedSourceType = 'audio';
    detectedMimeType = 'audio/wav';
  }
  // 5. Video: MP4 (search for 'ftyp' in first 32 bytes)
  else if (buffer.length >= 8 && buffer.subarray(4, 8).toString('ascii') === 'ftyp') {
    detectedSourceType = 'video';
    detectedMimeType = 'video/mp4';
  }
  // 6. Text / Markdown files
  else if (ext === '.txt' || ext === '.md' || ext === '.markdown') {
    if (!isValidTextBuffer(buffer)) {
      throw new BadRequestError('Invalid text file: binary characters or null bytes detected');
    }
    detectedSourceType = ext === '.txt' ? 'txt' : 'md';
    detectedMimeType = ext === '.txt' ? 'text/plain' : 'text/markdown';
  }

  if (!detectedSourceType) {
    throw new BadRequestError(
      `Unsupported or unrecognized file signature. File '${sanitized}' does not match supported formats (PDF, PPTX, DOCX, TXT, MD, MP3, WAV, MP4). Browser MIME '${declaredMimeType || 'unknown'}' was disregarded.`
    );
  }

  // Size limit validation
  const limitConfig = uploadLimits[detectedSourceType];
  if (limitConfig && buffer.length > limitConfig.maxSizeBytes) {
    const limitMb = Math.round(limitConfig.maxSizeBytes / (1024 * 1024));
    const actualMb = (buffer.length / (1024 * 1024)).toFixed(1);
    throw new BadRequestError(
      `File exceeds maximum allowed size for ${detectedSourceType.toUpperCase()} files. Limit: ${limitMb}MB, Actual: ${actualMb}MB.`
    );
  }

  // Ensure safe storage key and unique safe filename
  const safeId = crypto.randomUUID();
  const safeFilename = `${safeId}${ext}`;
  const storageKey = `materials/${safeId}/${safeFilename}`;

  return {
    sourceType: detectedSourceType,
    detectedMimeType,
    sanitizedFilename: sanitized,
    storageKey,
    safeFilename,
  };
}
