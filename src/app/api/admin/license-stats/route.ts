import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/get-session";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const [total, activeLicenses, onlineNow] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { managerLicensed: true } }),
    prisma.user.count({
      where: { managerLicensed: true, activeManagerSessionId: { not: null } },
    }),
  ]);

  return NextResponse.json({
    total,
    activeLicenses,
    onlineNow,
    offlineLicensed: activeLicenses - onlineNow,
  });
}
