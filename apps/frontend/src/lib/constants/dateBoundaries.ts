/**
 * Shared date boundary constants for the application.
 *
 * These constants define the earliest and latest dates that can be used
 * in date range searches, particularly for Date of Birth fields.
 */

export const DATE_BOUNDARIES = {
  /**
   * The earliest date that can be selected in date pickers.
   * Set to 1800-01-01 to accommodate historical voter records.
   */
  EARLIEST_DATE: new Date("1800-01-01"),

  /**
   * The latest date that can be selected in date pickers.
   * Set to 100 years in the future to accommodate future dates.
   */
  LATEST_DATE: (() => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 100);
    return futureDate;
  })(),
} as const;

// Export individual constants for convenience
export const { EARLIEST_DATE, LATEST_DATE } = DATE_BOUNDARIES;
