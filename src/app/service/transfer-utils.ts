export function createIdempotencyKey(): string {
  return crypto.randomUUID();
}

export function isValidAccountNumber(value: string): boolean {
  return /^\d{12}$/.test(value);
}

export function isValidTransferAmount(value: number): boolean {
  return Number.isFinite(value) && value > 0 && Math.round(value * 100) === value * 100;
}
