import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { isManagerMode } from "@/lib/app-mode";
import { ensureStorageDirs, getInboxDir } from "@/lib/storage";
import { importPackFromArchive } from "@/lib/import/service";
import { presetKindLabel, sortPresetKinds } from "@/lib/preset-kinds";
import { requireCurrentLegalAcceptance } from "@/lib/legal/require-acceptance";

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
export const maxDuration = 3600;

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
    const legalBlock = await requireCurrentLegalAcceptance();
    if (legalBlock) return legalBlock;

    ensureStorageDirs();

    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      if (!isManagerMode()) {
        return NextResponse.json(
          { error: "Importação por caminho local só está disponível no BeatStack Manager" },
          { status: 400 },
        );
      }

      let body: {
        importType?: string;
        sourceDirectory?: string;
        packName?: string;
        producer?: string;
        genre?: string;
        cover?: {
          base64?: string;
          mimeType?: string;
          fileName?: string;
        };
      };
      try {
        body = (await request.json()) as typeof body;
      } catch {
        return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
      }

      if (body.importType !== "localPath" || !body.sourceDirectory?.trim()) {
        return NextResponse.json(
          { error: "Informe importType=localPath e sourceDirectory" },
          { status: 400 },
        );
      }

      const sourceDirectory = path.resolve(body.sourceDirectory.trim());
      if (!fs.existsSync(sourceDirectory) || !fs.statSync(sourceDirectory).isDirectory()) {
        return NextResponse.json({ error: "Pasta não encontrada no disco" }, { status: 400 });
      }

      let coverFile: { buffer: Buffer; mimeType: string; fileName: string } | undefined;
      if (body.cover?.base64) {
        const mimeType = body.cover.mimeType || "image/jpeg";
        if (!COVER_MIMES.has(mimeType)) {
          return NextResponse.json(
            { error: "Capa inválida — use JPG, PNG ou WebP" },
            { status: 400 },
          );
        }
        const buffer = Buffer.from(body.cover.base64, "base64");
        if (buffer.length > 8 * 1024 * 1024) {
          return NextResponse.json({ error: "Capa muito grande (máx. 8 MB)" }, { status: 400 });
        }
        coverFile = {
          buffer,
          mimeType,
          fileName: body.cover.fileName || "cover.jpg",
        };
      }

      const result = await importPackFromArchive({
        sourceDirectory,
        originalFileName: path.basename(sourceDirectory),
        packName: body.packName?.trim() || undefined,
        producer: body.producer?.trim() || undefined,
        genre: body.genre?.trim() || undefined,
        coverFile,
      });

      return NextResponse.json({
        success: true,
        ...result,
        message: buildImportMessage(result),
      });
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (parseErr) {
      console.error("[import] formData parse", parseErr);
      return NextResponse.json(
        {
          error:
            "Arquivo muito grande ou upload incompleto. Para packs grandes (5 GB+), use “Pasta no disco” no BeatStack Manager (extraia antes e selecione a pasta).",
        },
        { status: 413 },
      );
    }
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

    try {
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
    } finally {
      try {
        if (fs.existsSync(inboxPath)) fs.unlinkSync(inboxPath);
      } catch {
        /* ignore */
      }
    }
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
