import type { Prisma } from "@prisma/client";

/**
 * Validates if an email address is valid according to our business rules
 * Note: This handles the case where emails might have trailing whitespace from fixed-width data
 * @param email - The email address to validate
 * @returns true if the email is valid, false otherwise
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email || email.trim() === "") {
    return false;
  }

  const trimmedEmail = email.trim();

  // Missing @
  if (!trimmedEmail.includes("@")) {
    return false;
  }

  // Starts or ends with @
  if (trimmedEmail.startsWith("@") || trimmedEmail.endsWith("@")) {
    return false;
  }

  // Missing dot (no domain part)
  if (!trimmedEmail.includes(".")) {
    return false;
  }

  // Starts or ends with dot
  if (trimmedEmail.startsWith(".") || trimmedEmail.endsWith(".")) {
    return false;
  }

  // Contains spaces in the middle (not just trailing/leading)
  // Check if there are spaces that are not at the beginning or end
  if (trimmedEmail.includes(" ")) {
    return false;
  }

  // Double @ (should only be one)
  if (trimmedEmail.includes("@@")) {
    return false;
  }

  // Very short strings (less than 5 characters)
  const shortStrings = ["", "a", "ab", "abc", "abcd"];
  if (shortStrings.includes(trimmedEmail)) {
    return false;
  }

  return true;
}

/**
 * Creates Prisma query conditions for finding records with valid emails
 * @returns Prisma where conditions for valid emails
 */
export function getValidEmailConditions(): Prisma.VoterRecordWhereInput {
  return {
    AND: [{ email: { not: null } }, { email: { not: "" } }],
    NOT: {
      OR: [
        // Missing @
        { email: { not: { contains: "@" } } },
        // Starts or ends with @
        { email: { startsWith: "@" } },
        { email: { endsWith: "@" } },
        // Missing dot (no domain part)
        { email: { not: { contains: "." } } },
        // Starts or ends with dot
        { email: { startsWith: "." } },
        { email: { endsWith: "." } },
        // Contains spaces
        { email: { contains: " " } },
        // Double @ (should only be one)
        { email: { contains: "@@" } },
        // Very short strings (less than 5 characters)
        {
          email: {
            in: ["", "a", "ab", "abc", "abcd"],
          },
        },
      ],
    },
  };
}

/**
 * Creates Prisma query conditions for finding records with invalid emails
 * Note: This handles the case where emails might have trailing whitespace from fixed-width data
 * @returns Prisma where conditions for invalid emails
 */
export function getInvalidEmailConditions(): Prisma.VoterRecordWhereInput {
  return {
    AND: [{ email: { not: null } }, { email: { not: "" } }],
    OR: [
      // Missing @
      { email: { not: { contains: "@" } } },
      // Starts or ends with @
      { email: { startsWith: "@" } },
      { email: { endsWith: "@" } },
      // Missing dot (no domain part)
      { email: { not: { contains: "." } } },
      // Starts or ends with dot
      { email: { startsWith: "." } },
      { email: { endsWith: "." } },
      // Double @ (should only be one)
      { email: { contains: "@@" } },
      // Very short strings (less than 5 characters)
      {
        email: {
          in: ["", "a", "ab", "abc", "abcd"],
        },
      },
    ],
  };
}

/**
 * Creates Prisma query conditions for finding records with any email (valid or invalid)
 * @returns Prisma where conditions for any email
 */
export function getHasEmailConditions(): Prisma.VoterRecordWhereInput {
  return {
    AND: [{ email: { not: null } }, { email: { not: "" } }],
  };
}

/**
 * Debug function to test email validation logic
 * @param email - The email address to test
 * @returns Object with validation result and details
 */
export function debugEmailValidation(email: string | null | undefined): {
  isValid: boolean;
  email: string;
  trimmedEmail: string;
  issues: string[];
} {
  const issues: string[] = [];

  if (!email || email.trim() === "") {
    return {
      isValid: false,
      email: email ?? "",
      trimmedEmail: "",
      issues: ["Email is null, undefined, or empty"],
    };
  }

  const trimmedEmail = email.trim();

  // Missing @
  if (!trimmedEmail.includes("@")) {
    issues.push("Missing @");
  }

  // Starts or ends with @
  if (trimmedEmail.startsWith("@")) {
    issues.push("Starts with @");
  }
  if (trimmedEmail.endsWith("@")) {
    issues.push("Ends with @");
  }

  // Missing dot (no domain part)
  if (!trimmedEmail.includes(".")) {
    issues.push("Missing dot");
  }

  // Starts or ends with dot
  if (trimmedEmail.startsWith(".")) {
    issues.push("Starts with dot");
  }
  if (trimmedEmail.endsWith(".")) {
    issues.push("Ends with dot");
  }

  // Contains spaces
  if (trimmedEmail.includes(" ")) {
    issues.push("Contains spaces");
  }

  // Double @ (should only be one)
  if (trimmedEmail.includes("@@")) {
    issues.push("Contains @@");
  }

  // Very short strings (less than 5 characters)
  const shortStrings = ["", "a", "ab", "abc", "abcd"];
  if (shortStrings.includes(trimmedEmail)) {
    issues.push("Very short string");
  }

  return {
    isValid: issues.length === 0,
    email: email,
    trimmedEmail: trimmedEmail,
    issues: issues,
  };
}
