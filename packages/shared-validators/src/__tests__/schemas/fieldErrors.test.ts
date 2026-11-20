import { z } from 'zod';
import {
  fieldErrorsSchema,
  firstFieldMessages,
  validationErrorResponseSchema,
  zodFieldErrors,
} from '../../schemas/fieldErrors';

describe('zodFieldErrors', () => {
  const schema = z
    .object({
      email: z.string().email('Bad email'),
      phone: z.string().min(7, 'Too short').regex(/^\d+$/, 'Digits only'),
    })
    .refine(() => false, 'Whole form is wrong');

  it('maps each top-level field to all its messages, leaving out form errors', () => {
    const result = schema.safeParse({ email: 'nope', phone: 'ab' });
    if (result.success) throw new Error('expected a failure');

    expect(zodFieldErrors(result.error)).toEqual({
      email: ['Bad email'],
      phone: ['Too short', 'Digits only'],
    });
  });

  it('is empty when only the object-level check fails', () => {
    const result = schema.safeParse({ email: 'a@b.co', phone: '5551234' });
    if (result.success) throw new Error('expected a failure');

    expect(zodFieldErrors(result.error)).toEqual({});
  });
});

describe('firstFieldMessages', () => {
  it('keeps the first message per field and drops empty lists', () => {
    expect(
      firstFieldMessages({ phone: ['Too short', 'Digits only'], email: [] }),
    ).toEqual({ phone: 'Too short' });
  });
});

describe('fieldErrorsSchema', () => {
  it('accepts field → messages and rejects other shapes', () => {
    expect(fieldErrorsSchema.safeParse({ phone: ['Too short'] }).success).toBe(
      true,
    );
    expect(fieldErrorsSchema.safeParse({ phone: 'Too short' }).success).toBe(
      false,
    );
    expect(fieldErrorsSchema.safeParse({ phone: [1] }).success).toBe(false);
  });
});

describe('validationErrorResponseSchema', () => {
  it('accepts the 422 body with or without fieldErrors, and nothing extra', () => {
    expect(
      validationErrorResponseSchema.safeParse({
        success: false,
        error: 'Invalid request data',
        fieldErrors: { phone: ['Too short'] },
      }).success,
    ).toBe(true);
    expect(
      validationErrorResponseSchema.safeParse({
        success: false,
        error: 'Invalid request data',
      }).success,
    ).toBe(true);
    expect(
      validationErrorResponseSchema.safeParse({
        success: false,
        error: 'Invalid request data',
        details: [],
      }).success,
    ).toBe(false);
  });
});
