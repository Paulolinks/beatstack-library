import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fromRelativeStoragePath } from "@/lib/storage";
import { extractWaveformPeaks } from "@/lib/audio/waveform";
import fs from "fs";

export async function POST() {
  const samples = await prisma.sample.findMany();
  let updated = 0;

  for (const sample of samples) {
    const filePath = fromRelativeStoragePath(sample.storagePath);
    if (!fs.existsSync(filePath)) continue;

    const peaks = extractWaveformPeaks(filePath);
    if (peaks.length === 0) continue;

    await prisma.sample.update({
      where: { id: sample.id },
      data: { waveformPeaks: JSON.stringify(peaks) },
    });
    updated++;
  }

  return NextResponse.json({
    success: true,
    message: `${updated} waveforms WAV atualizados. MP3/FLAC são gerados no browser ao abrir.`,
    updated,
  });
}
