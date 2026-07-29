import {
  authEmailsEqual,
  canonicalEmailSchema,
  canonicalizeAuthEmail,
  canonicalizeAuthEmailOrNull,
} from '../emailIdentity';

describe('canonicalizeAuthEmail', () => {
  it('trims and lowercases email', () => {
    expect(canonicalizeAuthEmail('  Leader@Example.COM  ')).toBe(
      'leader@example.com'
    );
  });
});

describe('canonicalizeAuthEmailOrNull', () => {
  it('returns null for empty input', () => {
    expect(canonicalizeAuthEmailOrNull(null)).toBeNull();
    expect(canonicalizeAuthEmailOrNull(undefined)).toBeNull();
    expect(canonicalizeAuthEmailOrNull('')).toBeNull();
  });

  it('canonicalizes non-empty input', () => {
    expect(canonicalizeAuthEmailOrNull(' A@B.COM ')).toBe('a@b.com');
  });
});

describe('authEmailsEqual', () => {
  it('matches emails that differ only by case or whitespace', () => {
    expect(authEmailsEqual('Leader@Example.com', ' leader@example.com ')).toBe(
      true
    );
  });

  it('rejects different emails', () => {
    expect(authEmailsEqual('a@example.com', 'b@example.com')).toBe(false);
  });
});

describe('canonicalEmailSchema', () => {
  it('validates, trims, and lowercases', () => {
    expect(canonicalEmailSchema.parse('  Admin@Example.COM  ')).toBe(
      'admin@example.com'
    );
  });

  it('rejects invalid email', () => {
    expect(() => canonicalEmailSchema.parse('not-an-email')).toThrow();
  });
});
