import { hash, verify, Algorithm } from '@node-rs/argon2';

/**
 * Hash a password using Argon2id with secure memory and time cost parameters.
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, {
    algorithm: Algorithm.Argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    outputLen: 32,
  });
}

/**
 * Verify a plain text password against an Argon2id hash.
 */
export async function verifyPassword(hashString: string, candidate: string): Promise<boolean> {
  try {
    return await verify(hashString, candidate);
  } catch {
    return false;
  }
}
