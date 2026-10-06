import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCloudConfig } from "@/lib/sync-vps/cloud-guard";
import { listRemotePacks } from "@/lib/sync-vps/vps-client";

export const runtime = "nodejs";

export async function GET() {
  const guard = requireCloudConfig();
  if (guard.error) return guard.error;

  try {
    const remote = await listRemotePacks(guard.config);
    const local = await prisma.pack.findMany({ select: { slug: true, name: true } });
    const localSlugs = new Set(local.map((p) => p.slug.toLowerCase()));
    const localNames = new Set(local.map((p) => p.name.trim().toLowerCase()));

    return NextResponse.json({
      vpsUrl: guard.config.vpsUrl,
      packs: remote.map((p) => ({
        ...p,
        hasLocal:
          localSlugs.has(p.slug.toLowerCase()) || localNames.has(p.name.trim().toLowerCase()),
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao conectar no VPS" },
      { status: 502 },
    );
  }
}
