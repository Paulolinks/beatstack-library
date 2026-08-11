import { NextRequest, NextResponse } from "next/server";
import { isManagerMode } from "@/lib/app-mode";
import { requireCurrentLegalAcceptance } from "@/lib/legal/require-acceptance";
import { syncPacksFromStorageFolder } from "@/lib/import/sync-packs-folder";
import { getPacksDir, getStorageRoot } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 3600;

export async function GET() {
  if (!isManagerMode()) {
    return NextResponse.json({ error: "Somente no BeatStack Manager" }, { status: 404 });
  }
  return NextResponse.json({
    storageRoot: getStorageRoot(),
    packsDir: getPacksDir(),
  });
}

export async function POST(request: NextRequest) {
  if (!isManagerMode()) {
    return NextResponse.json({ error: "Somente no BeatStack Manager" }, { status: 404 });
  }

  const legalBlock = await requireCurrentLegalAcceptance();
  if (legalBlock) return legalBlock;

  let removeMissing = true;
  try {
    const body = (await request.json()) as { removeMissing?: boolean };
    if (typeof body.removeMissing === "boolean") {
      removeMissing = body.removeMissing;
    }
  } catch {
    /* body opcional */
  }

  try {
    const result = await syncPacksFromStorageFolder({ removeMissing });
    const parts: string[] = [];
    if (result.added.length) parts.push(`${result.added.length} adicionado(s)`);
    if (result.removed.length) parts.push(`${result.removed.length} removido(s)`);
    if (result.skipped.length) parts.push(`${result.skipped.length} ignorado(s)`);
    if (result.errors.length) parts.push(`${result.errors.length} erro(s)`);

    return NextResponse.json({
      ok: true,
      packsDir: getPacksDir(),
      ...result,
      message:
        parts.length > 0
          ? `Atualização concluída: ${parts.join(", ")}`
          : `Nada novo em ${result.scanned} pasta(s) verificada(s)`,
    });
  } catch (error) {
    console.error("[sync-packs]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao atualizar packs" },
      { status: 500 },
    );
  }
}
