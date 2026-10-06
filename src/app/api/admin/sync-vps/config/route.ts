import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/get-session";
import {
  clearSyncVpsConfig,
  isSyncVpsEnabled,
  loadSyncVpsConfig,
  maskSyncVpsConfig,
  saveSyncVpsConfig,
} from "@/lib/sync-vps/config";
import { validateSyncVpsConfig } from "@/lib/sync-vps/normalize-url";
import { loginToVps } from "@/lib/sync-vps/vps-client";

export async function GET() {
  if (!isSyncVpsEnabled()) {
    return NextResponse.json({ enabled: false });
  }
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Admin necessário" }, { status: 403 });
  }
  return NextResponse.json({
    enabled: true,
    config: maskSyncVpsConfig(loadSyncVpsConfig()),
  });
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

  let body: { vpsUrl?: string; email?: string; password?: string; clear?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (body.clear) {
    clearSyncVpsConfig();
    return NextResponse.json({ ok: true, config: null });
  }

  const existing = loadSyncVpsConfig();
  const password = body.password?.trim() || existing?.password || "";

  let config;
  try {
    config = validateSyncVpsConfig(body.vpsUrl ?? existing?.vpsUrl ?? "", body.email ?? existing?.email ?? "", password);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Configuração inválida" },
      { status: 400 },
    );
  }

  try {
    await loginToVps(config);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Não foi possível conectar ao VPS. Verifique URL, e-mail e senha do Library (não do SSH).",
      },
      { status: 400 },
    );
  }

  saveSyncVpsConfig(config);
  return NextResponse.json({ ok: true, config: maskSyncVpsConfig(loadSyncVpsConfig()) });
}
