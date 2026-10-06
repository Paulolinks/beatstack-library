import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/get-session";
import { importPackFromArchive } from "@/lib/import/service";
import {
  discardUploadSession,
  getUploadSessionDir,
  listUploadedFiles,
  readUploadSession,
  removeUploadSessionMeta,
} from "@/lib/import/upload-session";

export const runtime = "nodejs";
export const maxDuration = 3600;

async function guard() {
  try {
    await requireAdmin();
    return null;
  } catch {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }
}

/** Lista arquivos já recebidos (para retomar upload). */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await guard();
  if (denied) return denied;
  const { id } = await params;
  try {
    readUploadSession(id);
    return NextResponse.json({ files: listUploadedFiles(id) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sessão inválida" },
      { status: 404 },
    );
  }
}

/** Finaliza: indexa a pasta recebida como pack. */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await guard();
  if (denied) return denied;
  const { id } = await params;

  let session;
  try {
    session = readUploadSession(id);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sessão inválida" },
      { status: 404 },
    );
  }

  try {
    removeUploadSessionMeta(id);
    const result = await importPackFromArchive({
      sourceDirectory: getUploadSessionDir(id),
      originalFileName: session.packName,
      packName: session.packName,
      producer: session.producer ?? undefined,
      genre: session.genre ?? undefined,
    });
    return NextResponse.json({
      success: true,
      ...result,
      message: `Pack importado com ${result.sampleCount} samples`,
    });
  } catch (err) {
    console.error("[import/session/finalize]", id, err);
    discardUploadSession(id);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao importar pack" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await guard();
  if (denied) return denied;
  const { id } = await params;
  try {
    discardUploadSession(id);
  } catch {
    /* ignore */
  }
  return NextResponse.json({ ok: true });
}
