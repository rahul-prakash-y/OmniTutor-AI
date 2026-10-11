import crypto from 'crypto';

/**
 * Generate a cryptographically secure random token in hex format.
 * Default length: 32 bytes (64 hex characters).
 */
export function generateRandomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Hash a sensitive token (session token, password reset token, email verification token)
 * using SHA-256 for secure storage in the database.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate an HMAC-based CSRF token tied to the user's session token and server secret.
 */
export function generateCsrfToken(sessionToken: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(sessionToken).digest('hex');
}

/**
 * Constant-time comparison of candidate CSRF token against the expected CSRF token.
 */
export function verifyCsrfToken(sessionToken: string, candidateToken: string, secret: string): boolean {
  if (!sessionToken || !candidateToken || typeof candidateToken !== 'string') {
    return false;
  }

  const expectedToken = generateCsrfToken(sessionToken, secret);
  if (candidateToken.length !== expectedToken.length) {
    return false;
  }

  try {
    const candidateBuf = Buffer.from(candidateToken, 'hex');
    const expectedBuf = Buffer.from(expectedToken, 'hex');
    if (candidateBuf.length !== expectedBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(candidateBuf, expectedBuf);
  } catch {
    return false;
  }
}
