export type MemberContactSource = {
  submissionMetadata: unknown;
  voterRecord: { email: string | null; telephone: string | null };
};

export type MemberContact = {
  email: string | null;
  telephone: string | null;
};

const nonBlankString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

/**
 * Resolves a member's contact details under SRS 2.1a: the Leader-entered value
 * first, then the voter record, each field on its own. Leader-entered contact
 * lives only on the membership because voter imports overwrite VoterRecord.
 */
export function resolveMemberContact({
  submissionMetadata,
  voterRecord,
}: MemberContactSource): MemberContact {
  const metadata =
    typeof submissionMetadata === 'object' && submissionMetadata !== null
      ? (submissionMetadata as Record<string, unknown>)
      : {};

  return {
    email: nonBlankString(metadata.email) ?? voterRecord.email,
    telephone: nonBlankString(metadata.phone) ?? voterRecord.telephone,
  };
}
