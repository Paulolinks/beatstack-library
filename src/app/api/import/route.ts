import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { ensureStorageDirs, getInboxDir } from "@/lib/storage";
import { importPackFromArchive } from "@/lib/import/service";
import { presetKindLabel, sortPresetKinds } from "@/lib/preset-kinds";

function buildImportMessage(result: {
  sampleCount: number;
  presetCount: number;
  presetKinds: string[];
}): string {
  const parts: string[] = [];
  if (result.sampleCount > 0) parts.push(`${result.sampleCount} samples`);
  if (result.presetCount > 0) {
    const labels = sortPresetKinds(result.presetKinds).map(presetKindLabel);
    parts.push(
      `${result.presetCount} pasta(s) de presets${labels.length ? ` (${labels.join(", ")})` : ""}`,
    );
  }
  return parts.length ? `Pack importado com ${parts.join(" e ")}` : "Pack importado";
}

export const runtime = "nodejs";
export const maxDuration = 300;

function isSupportedArchive(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith(".zip") || lower.endsWith(".rar");
}

const COVER_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

async function parseCoverFile(formData: FormData) {
  const cover = formData.get("cover");
  if (!(cover instanceof File) || cover.size === 0) return undefined;
  if (!COVER_MIMES.has(cover.type)) {
    throw new Error("Capa inválida — use JPG, PNG ou WebP");
  }
  return {
    buffer: Buffer.from(await cover.arrayBuffer()),
    mimeType: cover.type,
    fileName: cover.name,
  };
}

export async function POST(request: NextRequest) {
  try {
    ensureStorageDirs();
    const formData = await request.formData();
    const importType = (formData.get("importType") as string | null) ?? "archive";
    const packName = (formData.get("packName") as string | null)?.trim() || undefined;
    const producer = (formData.get("producer") as string | null)?.trim() || undefined;
    const genre = (formData.get("genre") as string | null)?.trim() || undefined;
    const coverFile = await parseCoverFile(formData);

    if (importType === "folder") {
      const files = formData.getAll("files") as File[];
      const paths = formData.getAll("paths") as string[];

      if (files.length === 0) {
        return NextResponse.json({ error: "Nenhum arquivo na pasta selecionada" }, { status: 400 });
      }

      const folderFiles = await Promise.all(
        files.map(async (file, i) => ({
          buffer: Buffer.from(await file.arrayBuffer()),
          relativePath: paths[i] || file.name,
        })),
      );

      const folderLabel =
        paths[0]?.split(/[/\\]/)[0] || packName || "Pasta importada";

      const result = await importPackFromArchive({
        originalFileName: folderLabel,
        packName,
        producer,
        genre,
        coverFile,
        folderFiles,
      });

      return NextResponse.json({
        success: true,
        ...result,
        message: buildImportMessage(result),
      });
    }

    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    if (!isSupportedArchive(file.name)) {
      return NextResponse.json(
        {
          error: `"${file.name}" não é suportado. Envie .zip, .rar ou selecione uma pasta.`,
        },
        { status: 400 },
      );
    }

    const ext = path.extname(file.name).toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());
    const inboxPath = path.join(getInboxDir(), `${uuidv4()}${ext}`);
    fs.writeFileSync(inboxPath, buffer);

    const result = await importPackFromArchive({
      archivePath: inboxPath,
      originalFileName: file.name,
      packName,
      producer,
      genre,
      coverFile,
    });

    return NextResponse.json({
      success: true,
      ...result,
      message: buildImportMessage(result),
    });
  } catch (error) {
    console.error("[import]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Falha na importação",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  const { prisma } = await import("@/lib/prisma");
  const jobs = await prisma.importJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { pack: { select: { name: true, slug: true } } },
  });
  return NextResponse.json({ jobs });
}
