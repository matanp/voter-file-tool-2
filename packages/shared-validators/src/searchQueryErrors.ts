/**
 * Error class for search query field conversion/validation errors
 */
export class SearchQueryFieldError extends Error {
  constructor(
    message: string,
    public field?: unknown,
    public cause?: Error
  ) {
    super(message);
    this.name = 'SearchQueryFieldError';
  }
}
