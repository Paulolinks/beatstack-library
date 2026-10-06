import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isLicenseServerMode, isManagerMode } from "@/lib/app-mode";
import { getSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/prisma";
import { hasManagerLicense } from "@/lib/auth/product-access";
import {
  getLicenseCookieName,
  respondToCampaign,
} from "@/lib/campaigns/license-client";
import { submitCampaignResponse } from "@/lib/campaigns/service";

async function requireLicensedManagerUser() {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  }

  const user = await prisma.user.findUnique({
    where: { email: session.email },
    select: { email: true, managerLicensed: true },
  });

  if (!user || !hasManagerLicense(user.email, user.managerLicensed)) {
    return { error: NextResponse.json({ error: "Licença Manager necessária" }, { status: 403 }) };
  }

  return { email: user.email };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: { selectedOption?: string | null; textResponse?: string | null };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  if (isManagerMode()) {
    const token = (await cookies()).get(getLicenseCookieName())?.value;
    if (!token) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const result = await respondToCampaign(token, id, body);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }
    return NextResponse.json({ success: true });
  }

  if (isLicenseServerMode()) {
    const auth = await requireLicensedManagerUser();
    if ("error" in auth) return auth.error;
    try {
      await submitCampaignResponse(id, auth.email, body);
      return NextResponse.json({ success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao enviar";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  return NextResponse.json({ error: "Indisponível" }, { status: 404 });
}
