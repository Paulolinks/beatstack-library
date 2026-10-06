import { NextRequest, NextResponse } from "next/server";
import { requireCloudConfig } from "@/lib/sync-vps/cloud-guard";
import {
  saveCloudSampleToFavorites,
  unsaveCloudSample,
  type CloudSampleInput,
} from "@/lib/sync-vps/save-cloud-sample";
import type { RemotePackSummary } from "@/lib/sync-vps/vps-client";

export const runtime = "nodejs";
export const maxDuration = 300;

type Body = {
  favorite?: boolean;
  pack?: RemotePackSummary;
  sample?: CloudSampleInput;
};

export async function POST(request: NextRequest) {
  const guard = requireCloudConfig();
  if (guard.error) return guard.error;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (!body.pack?.id || !body.pack.slug || !body.sample?.id || !body.sample.fileName) {
    return NextResponse.json({ error: "Informe pack e sample" }, { status: 400 });
  }

  try {
    if (body.favorite === false) {
      await unsaveCloudSample(body.pack, body.sample);
      return NextResponse.json({ ok: true, favorite: false });
    }
    const result = await saveCloudSampleToFavorites(guard.config, body.pack, body.sample);
    return NextResponse.json({ ok: true, favorite: true, ...result });
  } catch (err) {
    console.error("[vps/save-sample]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao salvar sample no PC" },
      { status: 502 },
    );
  }
}
