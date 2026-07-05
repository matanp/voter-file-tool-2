import { z } from 'zod';

/** Canonical form for auth identity emails (User, PrivilegedUser, Invite). */
export function canonicalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Returns canonical email or null when input is empty. */
export function canonicalizeAuthEmailOrNull(
  email: string | null | undefined
): string | null {
  if (!email) return null;
  return canonicalizeAuthEmail(email);
}

/** True when both emails refer to the same auth identity after canonicalization. */
export function authEmailsEqual(a: string, b: string): boolean {
  return canonicalizeAuthEmail(a) === canonicalizeAuthEmail(b);
}

/** Zod schema for auth identity emails: trim, validate, lowercase. */
export const canonicalEmailSchema = z
  .string()
  .trim()
  .email('Invalid email address')
  .transform((value) => value.toLowerCase());
