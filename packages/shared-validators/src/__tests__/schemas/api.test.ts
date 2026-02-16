import {
  uuidSchema,
  httpStatusSchema,
  webhookSignatureSchema,
  nonEmptyStringSchema,
  apiRequestSchema,
  apiResponseSchema,
  environmentSchema,
  callbackUrlSchema,
  simpleSuccessResponseSchema,
  simpleErrorResponseSchema,
  simpleApiResponseSchema,
} from '../../schemas/api';

describe('uuidSchema', () => {
  it('accepts valid UUID', () => {
    const result = uuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000');
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID', () => {
    expect(uuidSchema.safeParse('not-a-uuid').success).toBe(false);
    expect(uuidSchema.safeParse('').success).toBe(false);
    expect(uuidSchema.safeParse('550e8400-e29b-41d4-a716').success).toBe(false);
  });

  it('rejects non-string inputs', () => {
    expect(uuidSchema.safeParse(123).success).toBe(false);
    expect(uuidSchema.safeParse(null).success).toBe(false);
    expect(uuidSchema.safeParse({}).success).toBe(false);
  });
});

describe('nonEmptyStringSchema', () => {
  it('accepts non-empty strings', () => {
    expect(nonEmptyStringSchema.safeParse('hello').success).toBe(true);
    expect(nonEmptyStringSchema.safeParse(' ').success).toBe(true);
  });

  it('rejects empty string', () => {
    expect(nonEmptyStringSchema.safeParse('').success).toBe(false);
  });

  it('rejects non-string types', () => {
    expect(nonEmptyStringSchema.safeParse(123).success).toBe(false);
    expect(nonEmptyStringSchema.safeParse(null).success).toBe(false);
  });
});

describe('httpStatusSchema', () => {
  it('accepts valid HTTP status codes', () => {
    expect(httpStatusSchema.safeParse(200).success).toBe(true);
    expect(httpStatusSchema.safeParse(404).success).toBe(true);
    expect(httpStatusSchema.safeParse(500).success).toBe(true);
  });

  it('accepts boundary values', () => {
    expect(httpStatusSchema.safeParse(100).success).toBe(true);
    expect(httpStatusSchema.safeParse(599).success).toBe(true);
  });

  it('rejects out-of-range codes', () => {
    expect(httpStatusSchema.safeParse(99).success).toBe(false);
    expect(httpStatusSchema.safeParse(600).success).toBe(false);
  });

  it('rejects non-integer float', () => {
    expect(httpStatusSchema.safeParse(200.5).success).toBe(false);
  });

  it('rejects non-number input', () => {
    expect(httpStatusSchema.safeParse('200').success).toBe(false);
  });
});

describe('apiRequestSchema', () => {
  it('accepts empty object', () => {
    expect(apiRequestSchema.safeParse({}).success).toBe(true);
  });

  it('accepts request with headers', () => {
    const result = apiRequestSchema.safeParse({
      headers: { 'Content-Type': 'application/json' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts request with body', () => {
    const result = apiRequestSchema.safeParse({
      body: { key: 'value' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts request with headers and body', () => {
    const result = apiRequestSchema.safeParse({
      headers: { Authorization: 'Bearer token' },
      body: { data: 'test' },
    });
    expect(result.success).toBe(true);
  });
});

describe('apiResponseSchema', () => {
  it('accepts valid response with status', () => {
    const result = apiResponseSchema.safeParse({ status: 200 });
    expect(result.success).toBe(true);
  });

  it('accepts response with headers and body', () => {
    const result = apiResponseSchema.safeParse({
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: { data: 'test' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing status', () => {
    expect(apiResponseSchema.safeParse({}).success).toBe(false);
  });

  it('rejects invalid status code', () => {
    expect(apiResponseSchema.safeParse({ status: 99 }).success).toBe(false);
  });
});

describe('webhookSignatureSchema', () => {
  it('accepts valid payload with all required fields', () => {
    const result = webhookSignatureSchema.safeParse({
      signature: 'abc123',
      payload: '{}',
      secret: 'my-secret',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing signature', () => {
    expect(
      webhookSignatureSchema.safeParse({
        payload: '{}',
        secret: 'my-secret',
      }).success,
    ).toBe(false);
  });

  it('rejects missing payload', () => {
    expect(
      webhookSignatureSchema.safeParse({
        signature: 'abc',
        secret: 'my-secret',
      }).success,
    ).toBe(false);
  });

  it('rejects missing secret', () => {
    expect(
      webhookSignatureSchema.safeParse({
        signature: 'abc',
        payload: '{}',
      }).success,
    ).toBe(false);
  });

  it('rejects empty signature', () => {
    expect(
      webhookSignatureSchema.safeParse({
        signature: '',
        payload: '{}',
        secret: 'my-secret',
      }).success,
    ).toBe(false);
  });

  it('rejects empty payload', () => {
    expect(
      webhookSignatureSchema.safeParse({
        signature: 'abc',
        payload: '',
        secret: 'my-secret',
      }).success,
    ).toBe(false);
  });

  it('rejects empty secret', () => {
    expect(
      webhookSignatureSchema.safeParse({
        signature: 'abc',
        payload: '{}',
        secret: '',
      }).success,
    ).toBe(false);
  });
});

describe('environmentSchema', () => {
  const validEnv = {
    WEBHOOK_SECRET: 'secret-value',
    CALLBACK_URL: 'https://example.com/callback',
  };

  it('accepts valid environment with required fields', () => {
    expect(environmentSchema.safeParse(validEnv).success).toBe(true);
  });

  it('accepts environment with all optional fields', () => {
    const result = environmentSchema.safeParse({
      ...validEnv,
      PDF_SERVER_URL: 'https://pdf.example.com',
      ABLY_API_KEY: 'ably-key-123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing WEBHOOK_SECRET', () => {
    const { WEBHOOK_SECRET: _, ...rest } = validEnv;
    expect(environmentSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects empty WEBHOOK_SECRET', () => {
    expect(
      environmentSchema.safeParse({ ...validEnv, WEBHOOK_SECRET: '' }).success,
    ).toBe(false);
  });

  it('rejects missing CALLBACK_URL', () => {
    const { CALLBACK_URL: _, ...rest } = validEnv;
    expect(environmentSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects invalid CALLBACK_URL', () => {
    expect(
      environmentSchema.safeParse({ ...validEnv, CALLBACK_URL: 'not-a-url' })
        .success,
    ).toBe(false);
  });

  it('rejects invalid PDF_SERVER_URL', () => {
    expect(
      environmentSchema.safeParse({
        ...validEnv,
        PDF_SERVER_URL: 'not-a-url',
      }).success,
    ).toBe(false);
  });
});

describe('callbackUrlSchema', () => {
  it('accepts valid URL', () => {
    expect(
      callbackUrlSchema.safeParse('https://example.com/callback').success,
    ).toBe(true);
  });

  it('rejects non-URL string', () => {
    expect(callbackUrlSchema.safeParse('not-a-url').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(callbackUrlSchema.safeParse('').success).toBe(false);
  });
});

describe('simpleSuccessResponseSchema', () => {
  it('accepts object with message', () => {
    expect(
      simpleSuccessResponseSchema.safeParse({ message: 'OK' }).success,
    ).toBe(true);
  });

  it('rejects missing message', () => {
    expect(simpleSuccessResponseSchema.safeParse({}).success).toBe(false);
  });
});

describe('simpleErrorResponseSchema', () => {
  it('accepts object with error', () => {
    expect(
      simpleErrorResponseSchema.safeParse({ error: 'Something failed' })
        .success,
    ).toBe(true);
  });

  it('rejects missing error', () => {
    expect(simpleErrorResponseSchema.safeParse({}).success).toBe(false);
  });
});

describe('simpleApiResponseSchema', () => {
  it('accepts success response', () => {
    expect(
      simpleApiResponseSchema.safeParse({ message: 'OK' }).success,
    ).toBe(true);
  });

  it('accepts error response', () => {
    expect(
      simpleApiResponseSchema.safeParse({ error: 'Failed' }).success,
    ).toBe(true);
  });

  it('rejects object with neither message nor error', () => {
    expect(simpleApiResponseSchema.safeParse({ foo: 'bar' }).success).toBe(
      false,
    );
  });
});
