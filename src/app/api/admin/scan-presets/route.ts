import { NextResponse } from "next/server";
import fs from "fs";
import { prisma } from "@/lib/prisma";
import { getPackDir, toRelativeStoragePath } from "@/lib/storage";
import { scanPresetBundles } from "@/lib/import/scan-presets";

export async function POST() {
  const packs = await prisma.pack.findMany({ select: { id: true, slug: true, name: true, producer: true } });
  let assetsCreated = 0;

  for (const pack of packs) {
    const packDir = getPackDir(pack.slug);
    if (!fs.existsSync(packDir)) continue;

    const bundles = scanPresetBundles(packDir);
    await prisma.packAsset.deleteMany({ where: { packId: pack.id } });

    if (bundles.length > 0) {
      await prisma.packAsset.createMany({
        data: bundles.map((bundle) => {
          const tags = ["presets", ...(bundle.presetKind ? [bundle.presetKind] : [])];
          return {
            packId: pack.id,
            name: bundle.name,
            relativePath: bundle.relativePath,
            storagePath: toRelativeStoragePath(bundle.absolutePath),
            assetType: "preset-folder",
            presetKind: bundle.presetKind,
            fileCount: bundle.fileCount,
            tags: JSON.stringify(tags),
            searchText: [pack.name, pack.producer, bundle.name, bundle.presetKind, ...tags]
              .filter(Boolean)
              .join(" ")
              .toLowerCase(),
          };
        }),
      });
      assetsCreated += bundles.length;
    }

    await prisma.pack.update({
      where: { id: pack.id },
      data: { presetCount: bundles.length },
    });
  }

  return NextResponse.json({
    success: true,
    assetsCreated,
    message: `${assetsCreated} pasta(s) de presets indexadas`,
  });
}
