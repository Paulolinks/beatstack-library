import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { fromRelativeStoragePath } from "@/lib/storage";
import {
  ensureLibraryFolder,
  sanitizePathSegment,
  type LibraryFolder,
} from "@/lib/library-paths";

const VALID_FOLDERS = new Set<LibraryFolder>(["downloads", "likes", "copied"]);

function parseFolder(body: unknown, searchParams: URLSearchParams): LibraryFolder {
  let raw: string | undefined;
  if (body && typeof body === "object" && "folder" in body) {
    raw = String((body as { folder?: string }).folder ?? "");
  }
  if (!raw) raw = searchParams.get("folder") ?? undefined;
  if (raw && VALID_FOLDERS.has(raw as LibraryFolder)) {
    return raw as LibraryFolder;
  }
  return "downloads";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

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
    return NextResponse.json({ error: "Arquivo ausente" }, { status: 404 });
  }

  const libraryDir = ensureLibraryFolder(folder);
  const packDir = path.join(libraryDir, sanitizePathSegment(sample.pack.slug));
  if (!fs.existsSync(packDir)) {
    fs.mkdirSync(packDir, { recursive: true });
  }

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
}
