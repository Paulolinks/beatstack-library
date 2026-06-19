import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/get-session";
import {
  fromRelativeStoragePath,
  getPackDir,
  toRelativeStoragePath,
} from "@/lib/storage";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;
  const pack = await prisma.pack.findUnique({ where: { id } });
  if (!pack) {
    return NextResponse.json({ error: "Pack não encontrado" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo de capa obrigatório" }, { status: 400 });
  }

  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Use JPG, PNG ou WebP para a capa" },
      { status: 400 },
    );
  }

  const ext = EXT_BY_MIME[file.type] ?? (path.extname(file.name).toLowerCase() || ".jpg");
  const packDir = getPackDir(pack.slug);
  if (!fs.existsSync(packDir)) {
    fs.mkdirSync(packDir, { recursive: true });
  }

  if (pack.coverPath) {
    const oldPath = fromRelativeStoragePath(pack.coverPath);
    if (fs.existsSync(oldPath)) {
      try {
        fs.unlinkSync(oldPath);
      } catch {
        /* ignore */
      }
    }
  }

  const dest = path.join(packDir, `cover${ext}`);
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(dest, buffer);

  const coverRelative = toRelativeStoragePath(dest);
  const updated = await prisma.pack.update({
    where: { id },
    data: { coverPath: coverRelative },
  });

  return NextResponse.json({
    success: true,
    pack: updated,
    coverUrl: `/api/covers/${updated.id}?t=${Date.now()}`,
  });
}
