// packages/shared-validators/src/fileUtils.ts
// Purpose: Shared file utilities to eliminate duplication between frontend and report-server

import { randomUUID } from 'crypto';

/**
 * Sanitizes a string for safe S3 key usage
 * @param input - The string to sanitize
 * @param fallbackToUUID - Whether to fallback to UUID if sanitization results in empty string
 * @param maxLen - Maximum length of the sanitized string
 * @returns Sanitized string safe for S3 keys
 */
export function sanitizeForS3Key(
  input: string,
  fallbackToUUID: boolean = true,
  maxLen: number = 512
): string {
  if (!input || typeof input !== 'string') {
    return fallbackToUUID
      ? typeof randomUUID === 'function'
        ? randomUUID()
        : 'unnamed'
      : '';
  }

  // Handle email addresses specially
  if (input.includes('@')) {
    const [username] = input.split('@');
    input = username ?? input;
  }

  // Remove or replace unsafe characters for S3 keys
  const sanitized = input
    .toLowerCase()
    .replace(/[\/\\\s]+/g, '-') // Replace slashes, backslashes, and whitespace with hyphens
    .replace(/[^a-z0-9\-_]/g, '') // Remove any remaining special characters except hyphens and underscores
    .replace(/-+/g, '-') // Replace multiple consecutive hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

  const trimmed = sanitized.slice(0, Math.max(1, maxLen));

  return (
    trimmed ||
    (fallbackToUUID
      ? typeof randomUUID === 'function'
        ? randomUUID()
        : 'unnamed'
      : '')
  );
}

/**
 * Generates a collision-resistant, human-readable identifier for file paths
 * Uses a combination of name/email with a short hash to prevent collisions
 * while maintaining readability
 */
export function getUserDisplayName(
  id: string,
  name?: string | null,
  email?: string | null
): string {
  // Primary identifier: use name if available, otherwise email username
  let primaryIdentifier: string;

  if (name && name.trim()) {
    primaryIdentifier = name.trim();
  } else if (email) {
    // Extract username from email
    const [username] = email.split('@');
    primaryIdentifier = username ?? email;
  } else {
    // Fallback to user ID (required field)
    primaryIdentifier = id;
  }

  // Sanitize the primary identifier
  const sanitized = sanitizeForS3Key(primaryIdentifier, false);

  // Generate a short, stable hash from user ID for collision prevention
  // Using first 8 characters of UUID hash for readability
  const shortHash = id.slice(-8); // Last 8 chars of UUID

  // Combine sanitized name with short hash
  return `${sanitized}-${shortHash}`;
}

/**
 * Generates a descriptive filename for reports
 * @param reportName - Optional custom report name
 * @param reportType - Type of report (from shared-validators)
 * @param format - File format (pdf, xlsx)
 * @param reportAuthor - Author identifier (will be sanitized internally)
 * @returns Generated filename path
 */
export function generateReportFilename(
  reportName: string | undefined,
  reportType: string,
  format: string,
  reportAuthor: string
): string {
  const sanitizedAuthor = sanitizeForS3Key(reportAuthor, true);
  const now = new Date();
  const isoString = now.toISOString();
  const [datePart, timePart] = isoString.split('T');
  const timestamp = datePart; // YYYY-MM-DD format
  const time = timePart.split('.')[0].replace(/:/g, '-'); // HH-MM-SS format

  const sanitizedName = reportName ? sanitizeForS3Key(reportName) : '';

  const namePart = sanitizedName ? `${sanitizedName}-` : '';

  // Import the report type mapping functions
  const {
    getFilenameReportType,
    validateReportType,
  } = require('./reportTypeMapping');
  const typePart = getFilenameReportType(validateReportType(reportType));

  return `${sanitizedAuthor}/${typePart}/${namePart}${timestamp}-${time}.${format}`;
}
