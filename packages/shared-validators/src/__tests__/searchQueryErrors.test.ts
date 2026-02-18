import { SearchQueryFieldError } from '../searchQueryErrors';

describe('SearchQueryFieldError', () => {
  it('is an instance of Error', () => {
    const error = new SearchQueryFieldError('test');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(SearchQueryFieldError);
  });

  it('sets name to SearchQueryFieldError', () => {
    const error = new SearchQueryFieldError('test');
    expect(error.name).toBe('SearchQueryFieldError');
  });

  it('stores the message', () => {
    const error = new SearchQueryFieldError('something went wrong');
    expect(error.message).toBe('something went wrong');
  });

  it('stores the field when provided', () => {
    const field = { field: 'lastName', values: ['Smith'] };
    const error = new SearchQueryFieldError('bad field', field);
    expect(error.field).toBe(field);
  });

  it('field is undefined when not provided', () => {
    const error = new SearchQueryFieldError('test');
    expect(error.field).toBeUndefined();
  });

  it('stores the cause when provided', () => {
    const cause = new Error('root cause');
    const error = new SearchQueryFieldError('wrapped', undefined, cause);
    expect(error.cause).toBe(cause);
  });

  it('cause is undefined when not provided', () => {
    const error = new SearchQueryFieldError('test');
    expect(error.cause).toBeUndefined();
  });
});
