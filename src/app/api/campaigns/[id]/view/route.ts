import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isLicenseServerMode, isManagerMode } from "@/lib/app-mode";
import { getSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/prisma";
import { hasManagerLicense } from "@/lib/auth/product-access";
import {
  getLicenseCookieName,
  markCampaignViewed,
} from "@/lib/campaigns/license-client";
import { markCampaignOpened } from "@/lib/campaigns/service";

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
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (isManagerMode()) {
    const token = (await cookies()).get(getLicenseCookieName())?.value;
    if (!token) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const ok = await markCampaignViewed(token, id);
    if (!ok) {
      return NextResponse.json({ error: "Falha ao registrar abertura" }, { status: 502 });
    }
    return NextResponse.json({ success: true });
  }

  if (isLicenseServerMode()) {
    const auth = await requireLicensedManagerUser();
    if ("error" in auth) return auth.error;
    await markCampaignOpened(id, auth.email);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Indisponível" }, { status: 404 });
}
