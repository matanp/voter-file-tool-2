import { z } from "zod";

/**
 * SRS 2.1a — the optional member contact sent with an add or a submission.
 * The API schemas (`committeeDataSchema`, `committeeRequestDataSchema`) and
 * the workspace drawer's details step use the same rules, so whatever the
 * drawer accepts, the server accepts too.
 */

export const CONTACT_EMAIL_MESSAGE = "Enter a valid email address, like name@example.com.";
export const CONTACT_PHONE_MESSAGE =
  "Enter a phone number using digits, like 585-555-0123.";

const PHONE_MIN_DIGITS = 7;
const PHONE_MAX_DIGITS = 15;
/** Digits and the usual separators, with an optional leading "+" and extension. */
const PHONE_PATTERN = /^\+?[\d\s().-]+(?:\s*(?:x|ext\.?)\s*\d{1,6})?$/i;

/** True when `value` reads as a phone number (7–15 digits, before any extension). */
export function isValidContactPhone(value: string): boolean {
  if (!PHONE_PATTERN.test(value)) return false;
  const main = value.replace(/(?:x|ext\.?)\s*\d+$/i, "");
  const digits = main.replace(/\D/g, "").length;
  return digits >= PHONE_MIN_DIGITS && digits <= PHONE_MAX_DIGITS;
}

/** Trimmed; blank is allowed and means "no email". */
export const contactEmailSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || z.string().email().safeParse(v).success, {
    message: CONTACT_EMAIL_MESSAGE,
  })
  .optional();

/** Trimmed; blank is allowed and means "no phone". */
export const contactPhoneSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || isValidContactPhone(v), {
    message: CONTACT_PHONE_MESSAGE,
  })
  .optional();

export type ContactField = "email" | "phone";
export type ContactErrors = Partial<Record<ContactField, string>>;

/** The drawer's step-3 check: the message for each invalid field, by field. */
export function contactErrors(contact: { email: string; phone: string }): ContactErrors {
  const errors: ContactErrors = {};
  const email = contactEmailSchema.safeParse(contact.email);
  if (!email.success) errors.email = email.error.issues[0]?.message ?? CONTACT_EMAIL_MESSAGE;
  const phone = contactPhoneSchema.safeParse(contact.phone);
  if (!phone.success) errors.phone = phone.error.issues[0]?.message ?? CONTACT_PHONE_MESSAGE;
  return errors;
}
