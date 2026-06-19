import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { ensureStorageDirs, getInboxDir } from "@/lib/storage";
import { importPackFromArchive } from "@/lib/import/service";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    ensureStorageDirs();
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const packName = (formData.get("packName") as string | null)?.trim() || undefined;
    const producer = (formData.get("producer") as string | null)?.trim() || undefined;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();
    if (ext !== ".zip") {
      return NextResponse.json(
        { error: "No MVP, envie um arquivo .zip. RAR virá na próxima fase." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const inboxPath = path.join(getInboxDir(), `${uuidv4()}${ext}`);
    fs.writeFileSync(inboxPath, buffer);

    const result = await importPackFromArchive({
      archivePath: inboxPath,
      originalFileName: file.name,
      packName,
      producer,
    });

    return NextResponse.json({
      success: true,
      ...result,
      message: `Pack importado com ${result.sampleCount} samples`,
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
