/**
 * Sanitization and regex escaping utilities to prevent ReDoS, query injection,
 * and malicious metacharacter interpretation.
 */

/**
 * Escapes all regular expression metacharacters in a string.
 */
export function escapeRegExp(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Creates a safe, non-vulnerable RegExp from user-supplied search string.
 */
export function safeSearchRegex(input: string, flags = 'i'): RegExp {
  const sanitized = escapeRegExp(input.trim());
  return new RegExp(sanitized, flags);
}
