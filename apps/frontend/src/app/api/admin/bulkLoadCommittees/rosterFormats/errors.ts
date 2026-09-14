/**
 * The file as a whole is not the declared format. Thrown by a parser before any row is
 * read as data, and distinct from a row rejection: a rejection keeps the rest of the
 * roster, while this refuses the file so the caller can answer with the reason rather
 * than treat it as an unexpected failure.
 */
export class RosterFormatError extends Error {
  readonly formatId: string;

  constructor(formatId: string, reason: string) {
    super(`File is not the ${formatId} format: ${reason}`);
    this.name = "RosterFormatError";
    this.formatId = formatId;
  }
}
