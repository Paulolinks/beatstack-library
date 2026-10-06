import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/get-session";
import { isManagerMode } from "@/lib/app-mode";
import { ensureManagerDbReady } from "@/lib/manager/init-db";

export async function POST(request: Request) {
  if (!isManagerMode()) {
    return NextResponse.json({ error: "Indisponível" }, { status: 404 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  let body: { locale?: string };
  try {
    body = (await request.json()) as { locale?: string };
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const locale = body.locale === "pt" || body.locale === "es" ? body.locale : "en";

  await ensureManagerDbReady();
  await prisma.managerSetting.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", preferredLocale: locale },
    update: { preferredLocale: locale },
  });

  return NextResponse.json({ locale });
}

export async function GET() {
  if (!isManagerMode()) {
    return NextResponse.json({ locale: "pt" });
  }

  await ensureManagerDbReady();
  const settings = await prisma.managerSetting.findUnique({ where: { id: "singleton" } });
  const locale =
    settings?.preferredLocale === "pt" || settings?.preferredLocale === "es"
      ? settings.preferredLocale
      : "en";
  return NextResponse.json({ locale });
}
