import {
  createIdempotencyKey,
  isValidAccountNumber,
  isValidTransferAmount,
} from './transfer-utils';

describe('transfer utilities', () => {
  it('validates an internal 12 digit account', () => {
    expect(isValidAccountNumber('123456789012')).toBe(true);
    expect(isValidAccountNumber('1234')).toBe(false);
    expect(isValidAccountNumber('12345678901A')).toBe(false);
  });

  it('accepts positive amounts with at most two decimals', () => {
    expect(isValidTransferAmount(25.5)).toBe(true);
    expect(isValidTransferAmount(0)).toBe(false);
    expect(isValidTransferAmount(2.555)).toBe(false);
  });

  it('generates a UUID idempotency key', () => {
    expect(createIdempotencyKey()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});
