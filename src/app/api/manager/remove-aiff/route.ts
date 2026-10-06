import { NextResponse } from "next/server";
import { isManagerMode } from "@/lib/app-mode";
import { requireAdmin } from "@/lib/auth/get-session";
import { requireCurrentLegalAcceptance } from "@/lib/legal/require-acceptance";
import { removeUnsupportedAiffFromPacks } from "@/lib/import/remove-unsupported-aiff";

export const runtime = "nodejs";
export const maxDuration = 600;

/** Apaga .aif/.aiff de todos os packs (Manager ou admin do Library no VPS). */
export async function POST() {
  if (!isManagerMode()) {
    try {
      await requireAdmin();
    } catch {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
  }

  const legalBlock = await requireCurrentLegalAcceptance();
  if (legalBlock) return legalBlock;

  try {
    const result = await removeUnsupportedAiffFromPacks();
    const parts: string[] = [];
    if (result.deletedFiles) parts.push(`${result.deletedFiles} arquivo(s) apagado(s)`);
    if (result.deletedSamples) parts.push(`${result.deletedSamples} sample(s) removido(s) do índice`);
    if (result.errors.length) parts.push(`${result.errors.length} erro(s)`);

    return NextResponse.json({
      ok: true,
      ...result,
      message:
        parts.length > 0
          ? `Limpeza AIF concluída: ${parts.join(", ")}`
          : "Nenhum arquivo .aif/.aiff encontrado",
    });
  } catch (error) {
    console.error("[remove-aiff]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao remover AIF" },
      { status: 500 },
    );
  }
}
