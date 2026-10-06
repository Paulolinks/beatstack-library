import { NextResponse } from "next/server";
import { isManagerMode } from "@/lib/app-mode";
import { isSyncVpsEnabled, loadSyncVpsConfig, type SyncVpsConfig } from "@/lib/sync-vps/config";

/** Rotas /api/vps/* só existem no Manager com a conexão do VPS configurada. */
export function requireCloudConfig():
  | { config: SyncVpsConfig; error?: undefined }
  | { config?: undefined; error: NextResponse } {
  if (!isManagerMode() || !isSyncVpsEnabled()) {
    return {
      error: NextResponse.json({ error: "Disponível só no BeatStack Manager" }, { status: 404 }),
    };
  }
  const config = loadSyncVpsConfig();
  if (!config) {
    return {
      error: NextResponse.json(
        { error: "Configure a conexão com o VPS em Enviar para VPS", code: "NO_VPS_CONFIG" },
        { status: 400 },
      ),
    };
  }
  return { config };
}
