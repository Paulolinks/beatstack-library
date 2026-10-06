import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/get-session";
import { isSyncVpsEnabled, loadSyncVpsConfig, maskSyncVpsConfig } from "@/lib/sync-vps/config";
import { getSyncStatusOverview } from "@/lib/sync-vps/queue";

export async function GET() {
  if (!isSyncVpsEnabled()) {
    return NextResponse.json({ enabled: false, error: "Sync VPS desativado neste servidor" });
  }
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Admin necessário" }, { status: 403 });
  }

  const status = await getSyncStatusOverview();
  return NextResponse.json({
    ...status,
    config: maskSyncVpsConfig(loadSyncVpsConfig()),
  });
}
