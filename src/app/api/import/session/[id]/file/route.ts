import { NextRequest, NextResponse } from "next/server";
import type { ReadableStream as WebReadableStream } from "stream/web";
import { requireAdmin } from "@/lib/auth/get-session";
import { writeUploadChunk } from "@/lib/import/upload-session";

export const runtime = "nodejs";
export const maxDuration = 600;

/** PUT ?path=<relativo>&offset=<bytes> — corpo binário com o pedaço do arquivo. */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;
  const relativePath = request.nextUrl.searchParams.get("path") ?? "";
  const offset = Number.parseInt(request.nextUrl.searchParams.get("offset") ?? "0", 10);
  if (!relativePath || !Number.isFinite(offset) || offset < 0) {
    return NextResponse.json({ error: "Parâmetros path/offset inválidos" }, { status: 400 });
  }
  if (!request.body) {
    return NextResponse.json({ error: "Corpo vazio" }, { status: 400 });
  }

  try {
    const result = await writeUploadChunk({
      sessionId: id,
      relativePath,
      offset,
      body: request.body as unknown as WebReadableStream<Uint8Array>,
    });
    return NextResponse.json({ ok: true, size: result.size });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.startsWith("OFFSET_MISMATCH:")) {
      return NextResponse.json(
        { error: "Offset fora de ordem", size: Number(message.split(":")[1]) },
        { status: 409 },
      );
    }
    console.error("[import/session/file]", id, relativePath, err);
    const diskFull = /ENOSPC|no space left/i.test(message);
    return NextResponse.json(
      { error: diskFull ? "Disco do VPS cheio" : message },
      { status: diskFull ? 507 : 500 },
    );
  }
}
