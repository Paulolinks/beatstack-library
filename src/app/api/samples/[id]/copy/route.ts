import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { isManagerMode } from "@/lib/app-mode";
import { fromRelativeStoragePath } from "@/lib/storage";
import { ensureManagerDbReady } from "@/lib/manager/init-db";
import {
  getLibraryFolder,
  getLibraryRoot,
  sanitizePathSegment,
  type LibraryFolder,
} from "@/lib/library-paths";

export const runtime = "nodejs";

function mkdirIfMissing(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const LIBRARY_FOLDERS = new Set<LibraryFolder>(["downloads", "likes", "copied", "presets", "favoritos"]);

function normalizeFolder(raw: string): LibraryFolder {
  if (isManagerMode() && raw === "likes") return "favoritos";
  if (LIBRARY_FOLDERS.has(raw as LibraryFolder)) return raw as LibraryFolder;
  return "downloads";
}

function parseFolder(body: unknown, searchParams: URLSearchParams): LibraryFolder {
  let raw: string | undefined;
  if (body && typeof body === "object" && "folder" in body) {
    raw = String((body as { folder?: string }).folder ?? "");
  }
  if (!raw) raw = searchParams.get("folder") ?? undefined;
  return normalizeFolder(raw ?? "downloads");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (isManagerMode()) {
      await ensureManagerDbReady();
    }

    let body: unknown = null;
    try {
      body = await request.json();
    } catch {
      /* sem body */
    }

    const folder = parseFolder(body, request.nextUrl.searchParams);

    const sample = await prisma.sample.findUnique({
      where: { id },
      include: { pack: { select: { slug: true, name: true } } },
    });
    if (!sample) {
      return NextResponse.json({ error: "Sample não encontrado" }, { status: 404 });
    }

    const sourcePath = fromRelativeStoragePath(sample.storagePath);
    if (!fs.existsSync(sourcePath)) {
      return NextResponse.json(
        { error: "Arquivo do sample não encontrado no disco" },
        { status: 404 },
      );
    }

    const libraryDir = getLibraryFolder(folder);
    mkdirIfMissing(getLibraryRoot());
    mkdirIfMissing(libraryDir);
    const packDir = path.join(libraryDir, sanitizePathSegment(sample.pack.slug));
    mkdirIfMissing(packDir);

    const safeName = sample.fileName.replace(/[<>:"/\\|?*]/g, "_");
    const destPath = path.join(packDir, safeName);

    fs.copyFileSync(sourcePath, destPath);

    await prisma.userSampleMeta.upsert({
      where: { sampleId: id },
      create: { sampleId: id, downloadedAt: new Date() },
      update: { downloadedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      path: destPath,
      fileName: safeName,
      folder,
      packName: sample.pack.name,
      message: `Copiado para ${destPath}`,
    });
  } catch (err) {
    console.error("[POST /api/samples/copy]", err);
    const message = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
