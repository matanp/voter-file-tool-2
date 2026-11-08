import { resolveMemberContact } from '../memberContact';

const voterRecord = {
  email: 'voter@example.invalid',
  telephone: '5855550100',
};

describe('resolveMemberContact', () => {
  it('should prefer Leader-entered values', () => {
    expect(
      resolveMemberContact({
        submissionMetadata: {
          email: 'leader@example.invalid',
          phone: '5855550199',
        },
        voterRecord,
      }),
    ).toEqual({ email: 'leader@example.invalid', telephone: '5855550199' });
  });

  it('should fall back on each field separately', () => {
    expect(
      resolveMemberContact({
        submissionMetadata: { email: 'leader@example.invalid' },
        voterRecord,
      }),
    ).toEqual({ email: 'leader@example.invalid', telephone: '5855550100' });
    expect(
      resolveMemberContact({
        submissionMetadata: { phone: '5855550199' },
        voterRecord,
      }),
    ).toEqual({ email: 'voter@example.invalid', telephone: '5855550199' });
  });

  it.each([
    ['null metadata', null],
    ['non-object metadata', 'not-an-object'],
    ['blank values', { email: '   ', phone: '' }],
    ['non-string values', { email: 42, phone: { number: '5855550199' } }],
  ])('should fall back to the voter record for %s', (_, submissionMetadata) => {
    expect(resolveMemberContact({ submissionMetadata, voterRecord })).toEqual(
      voterRecord,
    );
  });
});
