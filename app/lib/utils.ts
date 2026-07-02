export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function formatDate(date: Date): string {
  return date.toISOString();
}

export function isOTPExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

export function getOTPExpiry(): Date {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 5);
  return now;
}
