import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/get-session";
import { isSyncVpsEnabled } from "@/lib/sync-vps/config";
import { getSyncQueueState, notCloudSavedPack, startSyncQueue } from "@/lib/sync-vps/queue";
import { requireCurrentLegalAcceptance } from "@/lib/legal/require-acceptance";

export async function GET() {
  if (!isSyncVpsEnabled()) {
    return NextResponse.json({ enabled: false });
  }
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Admin necessário" }, { status: 403 });
  }
  return NextResponse.json({ queue: getSyncQueueState() });
}

export async function POST(request: NextRequest) {
  if (!isSyncVpsEnabled()) {
    return NextResponse.json({ error: "Sync VPS desativado" }, { status: 400 });
  }
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Admin necessário" }, { status: 403 });
  }

  const legalBlock = await requireCurrentLegalAcceptance();
  if (legalBlock) return legalBlock;

  let body: { packIds?: string[]; all?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { prisma } = await import("@/lib/prisma");
  let packIds = body.packIds ?? [];

  if (body.all) {
    const packs = await prisma.pack.findMany({ where: notCloudSavedPack, select: { id: true } });
    packIds = packs.map((p) => p.id);
  }

  const result = await startSyncQueue(packIds);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, queue: getSyncQueueState() });
}
