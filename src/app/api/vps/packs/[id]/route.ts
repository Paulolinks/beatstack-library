import { NextRequest, NextResponse } from "next/server";
import { requireCloudConfig } from "@/lib/sync-vps/cloud-guard";
import { findLocalPackForRemote } from "@/lib/sync-vps/save-cloud-sample";
import { prisma } from "@/lib/prisma";
import {
  deleteRemotePack,
  listRemotePacks,
  vpsFetch,
  type RemotePackSummary,
} from "@/lib/sync-vps/vps-client";

/** relativePath (minúsculo) dos samples deste pack que já estão em alguma pasta favorita no PC. */
async function listSavedRelativePaths(pack: RemotePackSummary): Promise<Set<string>> {
  const local = await findLocalPackForRemote(pack);
  if (!local) return new Set();
  const rows = await prisma.sample.findMany({
    where: { packId: local.id, favoriteEntries: { some: {} } },
    select: { relativePath: true },
  });
  return new Set(rows.map((r) => r.relativePath.toLowerCase()));
}

export const runtime = "nodejs";
export const maxDuration = 300;

/** Pack do VPS + todos os samples dele. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = requireCloudConfig();
  if (guard.error) return guard.error;
  const { id } = await params;

  try {
    const packs = await listRemotePacks(guard.config);
    const pack = packs.find((p) => p.id === id);
    if (!pack) {
      return NextResponse.json({ error: "Pack não encontrado no VPS" }, { status: 404 });
    }

    const pageSize = 2000;
    const samples: unknown[] = [];
    for (let offset = 0; offset < 50_000; offset += pageSize) {
      const res = await vpsFetch(
        guard.config,
        `/api/samples?packId=${encodeURIComponent(id)}&limit=${pageSize}&offset=${offset}`,
      );
      if (!res.ok) {
        throw new Error(`VPS respondeu ${res.status} ao listar samples`);
      }
      const data = (await res.json()) as { samples: unknown[] };
      samples.push(...data.samples);
      // VPS antigo devolve no máximo 500 e ignora offset — página menor encerra o loop
      if (data.samples.length < pageSize) break;
    }

    const savedPaths = await listSavedRelativePaths(pack);
    return NextResponse.json({
      pack,
      samples: (samples as Array<{ relativePath?: string; fileName?: string }>).map((s) => ({
        ...s,
        meta: { rating: null, favorite: savedPaths.has((s.relativePath ?? s.fileName ?? "").toLowerCase()) },
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao carregar pack do VPS" },
      { status: 502 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = requireCloudConfig();
  if (guard.error) return guard.error;
  const { id } = await params;

  try {
    const result = await deleteRemotePack(guard.config, id);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao excluir no VPS" },
      { status: 502 },
    );
  }
}
