import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { TERMS_VERSION, PRIVACY_VERSION, needsLegalReaccept } from "@/lib/legal/versions";
import { LEGAL_COMPANY, LEGAL_EFFECTIVE_DATE, LEGAL_SUPPORT_EMAIL } from "@/lib/legal/constants";

export type LegalStatus = {
  accepted: boolean;
  needsReaccept: boolean;
  termsVersion: string | null;
  privacyVersion: string | null;
  acceptedAt: string | null;
  currentTermsVersion: string;
  currentPrivacyVersion: string;
};

type AcceptanceRow = {
  termsVersion: string;
  privacyVersion: string;
  acceptedAt: string;
};

async function findLatestAcceptance(
  userId?: string | null,
  email?: string | null,
): Promise<AcceptanceRow | null> {
  if (!userId && !email) return null;

  const rows = await prisma.$queryRaw<AcceptanceRow[]>`
    SELECT termsVersion, privacyVersion, acceptedAt
    FROM legal_acceptances
    WHERE (${userId} IS NOT NULL AND userId = ${userId ?? ""})
       OR (${email} IS NOT NULL AND email = ${email ?? ""})
    ORDER BY acceptedAt DESC
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function getLegalStatusForUser(
  userId?: string | null,
  email?: string | null,
): Promise<LegalStatus> {
  const base = {
    currentTermsVersion: TERMS_VERSION,
    currentPrivacyVersion: PRIVACY_VERSION,
  };

  const latest = await findLatestAcceptance(userId, email);

  if (!latest) {
    return {
      ...base,
      accepted: false,
      needsReaccept: true,
      termsVersion: null,
      privacyVersion: null,
      acceptedAt: null,
    };
  }

  const needsReaccept = needsLegalReaccept(latest.termsVersion, latest.privacyVersion);

  return {
    ...base,
    accepted: !needsReaccept,
    needsReaccept,
    termsVersion: latest.termsVersion,
    privacyVersion: latest.privacyVersion,
    acceptedAt: latest.acceptedAt,
  };
}

export async function recordLegalAcceptance(input: {
  userId?: string | null;
  email?: string | null;
  termsVersion: string;
  privacyVersion: string;
  appVersion?: string | null;
  os?: string | null;
  ipAddress?: string | null;
  source?: string;
}) {
  if (input.termsVersion !== TERMS_VERSION || input.privacyVersion !== PRIVACY_VERSION) {
    throw new Error("Versão legal inválida");
  }

  const id = randomUUID();
  const acceptedAt = new Date().toISOString();

  await prisma.$executeRaw`
    INSERT INTO legal_acceptances (
      id, userId, email, termsVersion, privacyVersion, appVersion, os, ipAddress, source, acceptedAt
    ) VALUES (
      ${id},
      ${input.userId ?? null},
      ${input.email ?? null},
      ${input.termsVersion},
      ${input.privacyVersion},
      ${input.appVersion ?? null},
      ${input.os ?? null},
      ${input.ipAddress ?? null},
      ${input.source ?? "app"},
      ${acceptedAt}
    )
  `;

  return {
    id,
    acceptedAt: new Date(acceptedAt),
    termsVersion: input.termsVersion,
    privacyVersion: input.privacyVersion,
  };
}

export function legalDocumentsMeta() {
  return {
    company: LEGAL_COMPANY,
    effectiveDate: LEGAL_EFFECTIVE_DATE,
    supportEmail: LEGAL_SUPPORT_EMAIL,
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
    termsUrl: "/legal/terms-of-use.md",
    privacyUrl: "/legal/privacy-policy.md",
  };
}
