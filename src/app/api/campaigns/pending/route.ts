import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isLicenseServerMode, isManagerMode } from "@/lib/app-mode";
import { getSession, requireAdmin } from "@/lib/auth/get-session";
import { prisma } from "@/lib/prisma";
import { hasManagerLicense } from "@/lib/auth/product-access";
import {
  fetchPendingCampaigns,
  getLicenseCookieName,
} from "@/lib/campaigns/license-client";
import { getActiveCampaignsForUser } from "@/lib/campaigns/service";

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

export async function GET() {
  if (isManagerMode()) {
    const token = (await cookies()).get(getLicenseCookieName())?.value;
    if (!token) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const campaigns = await fetchPendingCampaigns(token);
    return NextResponse.json({ campaigns });
  }

  if (isLicenseServerMode()) {
    const auth = await requireLicensedManagerUser();
    if ("error" in auth) return auth.error;
    const campaigns = await getActiveCampaignsForUser(auth.email);
    return NextResponse.json({ campaigns });
  }

  return NextResponse.json({ campaigns: [] });
}
