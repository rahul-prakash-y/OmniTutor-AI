# OmniTutor AI: Ingestion Pipeline & Troubleshooting Manual

## 1. Overview & Architecture

OmniTutor AI converts unstructured course materials (textbooks, slide decks, documents, notes, audio, and video) into semantically structured, searchable educational knowledge. The pipeline guarantees full provenance: every vector in the Qdrant store traces back to its exact course ID, material ID, page number, slide index, or audio/video time range.

```text
 ┌─────────────────┐       ┌──────────────────────┐       ┌──────────────────────┐
 │ Upload Request  │──────▶│ Storage & Validation │──────▶│ Asynchronous Queue   │
 │ (Multipart/API) │       │ (Magic Byte & Bomb)  │       │ (IngestionQueue)     │
 └─────────────────┘       └──────────────────────┘       └──────────┬───────────┘
                                                                     │
 ┌───────────────────────────────────────────────────────────────────┘
 ▼
 ┌──────────────────────┐       ┌──────────────────────┐       ┌──────────────────────┐
 │ Pipeline Adapters    │──────▶│ Chunking & Provenance│──────▶│ Embeddings & Qdrant  │
 │ (PDF, PPTX, DOCX...) │       │ (Semantic Overlap)   │       │ (Vector Upsert)      │
 └──────────────────────┘       └──────────────────────┘       └──────────┬───────────┘
                                                                          │
 ┌────────────────────────────────────────────────────────────────────────┘
 ▼
 ┌──────────────────────┐
 │ Confirmed Status     │
 │ (Indexed & Verified) │
 └──────────────────────┘
```

---

## 2. Supported Formats & File Signature (Magic Byte) Security

OmniTutor AI strictly inspects raw file signatures (magic bytes) and archive structures. Browser-supplied MIME headers and file extensions are never trusted.

| Source Type | Extension | Max Size | Magic Byte Signature / Validation | Notes |
|---|---|---|---|---|
| **PDF** | `.pdf` | 25 MB | `0x25 0x50 0x44 0x46` (`%PDF-`) | Page-by-page extraction; scanned document threshold detection. |
| **PPTX** | `.pptx` | 30 MB | `0x50 0x4B 0x03 0x04` (`PK\x03\x04`) + Zip contains `ppt/` | XML slide parser extracts slide numbers and slide titles. |
| **DOCX** | `.docx` | 20 MB | `0x50 0x4B 0x03 0x04` (`PK\x03\x04`) + Zip contains `word/` | Paragraph and heading hierarchy (`Heading1..Heading4`). |
| **TXT** | `.txt` | 5 MB | UTF-8 encoded text | Verified against binary/null bytes. |
| **Markdown**| `.md`, `.markdown` | 5 MB | UTF-8 encoded text | Heading hierarchy (`#`, `##`, `###`) preserved. |
| **Audio** | `.mp3` | 50 MB | `0x49 0x44 0x33` (`ID3`) or MPEG sync `0xFF 0xFB/F3/F2` | Timestamped transcription with segment boundaries. |
| **Audio** | `.wav` | 50 MB | `0x52 0x49 0x46 0x46` (`RIFF`) + `WAVE` | PCM/WAV speech transcription segments. |
| **Video** | `.mp4` | 100 MB | First 32 bytes contain `ftyp` marker | Gemini multimodal audio/video transcription with offline fallback. |

---

## 3. Storage Security & Abuse Defenses

1. **Path Traversal Defense**:
   - Filenames are sanitized via `sanitizeFilename`: stripping null bytes, path separators (`/`, `\`, `..`), control characters, and dangerous symbols.
   - Storage keys use cryptographically secure random UUIDs (`materials/<uuid>/<uuid>.<ext>`).
   - The storage provider enforces path boundary validation: `resolvedPath.startsWith(storageRoot)`.
2. **Decompression / Archive Bomb Defense**:
   - PPTX and DOCX archives are evaluated for compression anomalies before unzipping.
   - Rejects archives containing over 3,000 files, uncompressed payloads over 100MB, or expansion ratios exceeding 50x.
   - Rejects archives with Zip Slip paths (`..` in entry names).
3. **Database Isolation**:
   - Large file contents are **never** stored in MongoDB documents. Files reside in the configured storage provider (`LocalStorageService` or cloud object storage). Only metadata, statuses, and job checkpoints reside in MongoDB.

---

## 4. Pipeline Execution Lifecycle

Each queued ingestion job moves through traceable stages:

1. **`validation`**:
   - Confirms course ownership by authenticated user.
   - Checks file existence in storage provider.
   - Sets material status to `processing`.
2. **`extraction`**:
   - Executes the format-specific adapter (`PdfAdapter`, `PptxAdapter`, `DocxAdapter`, `TextAdapter`, `MediaAdapter`).
   - Limits extraction time to 60 seconds with an execution safety timeout.
3. **`chunking`**:
   - Normalizes whitespace while preserving markdown headers and section boundaries.
   - Splits text into chunks (~450 tokens / 1800 chars) with configurable sliding overlap (~50 tokens / 200 chars).
   - Generates SHA-256 `contentHash` and deterministic UUIDs for Qdrant.
4. **`embedding`**:
   - Generates 768-dimensional embeddings via Google Gemini (`text-embedding-004`) or `MockEmbeddingProvider`.
   - Batches embedding requests in groups of 10 to respect API rate limits.
5. **`vector_upsert`**:
   - Ensures Qdrant collection `omnitutor_materials` exists.
   - **Deletes any existing stale vectors** for the material (`deletePointsByFilter`).
   - Upserts vectors with complete provenance payload.
6. **`completed` / `indexed`**:
   - Marks material status `indexed`.
   - Increments course `materialCount` and `indexedChunkCount`.
   - Finalizes job with progress 100% and tokens used.

---

## 5. Scanned PDF Detection & OCR Handling

- When digital text is extracted from a PDF, `PdfAdapter` computes the average characters per page.
- If average characters per page is below 25 characters (or total document text is under 40 characters for a multi-page file), the file is classified as a **scanned document**.
- OmniTutor AI **never** marks an unreadable scanned PDF as successfully indexed.
- The pipeline attempts OCR processing. If no legible text layer can be recovered, the job fails with a clear diagnostic message:
  `Scanned PDF document detected in '<file>' with no readable digital text layer... Please upload a clear document with readable text.`

---

## 6. Vector Cleanup & Cross-System Consistency

When a material is deleted or reprocessed:
- Stale vectors are purged from Qdrant:
  ```typescript
  await vectorService.deletePointsByFilter('omnitutor_materials', {
    materialId: material.id,
  });
  ```
- File is removed from storage provider:
  ```typescript
  await storageService.delete(material.storageKey);
  ```
- Ingestion jobs are removed from MongoDB.
- Course metrics (`materialCount`, `indexedChunkCount`) are recalculated from active indexed materials.

---

## 7. Ingestion Troubleshooting Guide

### Issue 1: "Unsupported or unrecognized file signature" (HTTP 400)
- **Symptom**: User uploads a file, but the API rejects it with an error citing unrecognized file signature.
- **Cause**: The file extension does not match the actual file header (MIME spoofing, corrupted download, or renaming an executable/image to `.pdf`).
- **Resolution**:
  - Open the file in its native application to verify it is valid.
  - Inspect the first 16 bytes using a hex viewer. Verify that PDF starts with `%PDF-` and PPTX/DOCX starts with `PK`.

### Issue 2: "Scanned PDF document detected with no readable digital text layer" (HTTP 400)
- **Symptom**: A PDF textbook or lecture scan fails extraction.
- **Cause**: The PDF consists solely of scanned raster images without an embedded text layer (OCR).
- **Resolution**:
  - Run the PDF through an OCR tool (e.g. Adobe Acrobat OCR, ocrmypdf) before uploading.
  - Or configure `GEMINI_API_KEY` to enable the multimodal OCR fallback adapter.

### Issue 3: "File exceeds maximum allowed size" (HTTP 400 / 413)
- **Symptom**: Upload rejected immediately.
- **Limits**:
  - Text & Markdown: 5 MB
  - DOCX: 20 MB
  - PDF: 25 MB
  - PPTX: 30 MB
  - Audio (MP3/WAV): 50 MB
  - Video (MP4): 100 MB
- **Resolution**: Compress the file or trim high-bitrate media before uploading.

### Issue 4: "Decompression bomb protection: Uncompressed size exceeds 100MB" (HTTP 400)
- **Symptom**: A complex PPTX or DOCX fails upload validation.
- **Cause**: The presentation has an anomalous compression ratio (>50x) or expands to more than 100MB of XML, triggering the security defense.
- **Resolution**: Split the presentation into smaller decks or optimize high-resolution embedded media.

### Issue 5: Job status stuck in "queued" or "processing"
- **Symptom**: The timeline spinner continues indefinitely.
- **Resolution**:
  - Check API server logs for unhandled exceptions.
  - If Qdrant is offline, check health at `GET /api/v1/health`.
  - Trigger retry via the UI "Retry Ingestion" button or API:
    `POST /api/v1/courses/:courseId/materials/:materialId/retry`

---

## 8. Verification Commands

```powershell
# Run all unit, integration, and acceptance tests
npm run test

# Run API tests only (42 tests)
npm run test:api

# Run Web UI tests only (13 tests)
npm run test:web

# Run TypeScript type check across all workspaces
npm run typecheck
```
