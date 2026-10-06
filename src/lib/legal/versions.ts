/** Increment when Terms of Use text changes materially. */
export const TERMS_VERSION = "2026-06-24";

/** Increment when Privacy Policy text changes materially. */
export const PRIVACY_VERSION = "2026-06-24";

export function needsLegalReaccept(
  acceptedTerms?: string | null,
  acceptedPrivacy?: string | null,
): boolean {
  return acceptedTerms !== TERMS_VERSION || acceptedPrivacy !== PRIVACY_VERSION;
}
