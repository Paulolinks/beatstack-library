import { timingSafeEqual } from "crypto";

export function getRegistrationWebhookSecret(): string | null {
  const secret = process.env.REGISTRATION_WEBHOOK_SECRET?.trim();
  return secret || null;
}

export function verifyRegistrationWebhookSecret(provided: string | null | undefined): boolean {
  const expected = getRegistrationWebhookSecret();
  if (!expected || !provided) return false;

  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}
