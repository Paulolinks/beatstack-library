import { NextRequest, NextResponse } from "next/server";
import { cloudErrorResponse, getCloudUserId } from "@/lib/cloud-favorites/route-helpers";
import { addSampleToFolder, listItems, removeItem } from "@/lib/cloud-favorites/service";

export const runtime = "nodejs";

/** Samples salvos na pasta, no formato da lista de samples (tocam pelo arquivo da pasta). */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getCloudUserId();
  if (typeof userId !== "string") return userId;
  const { id } = await params;
  try {
    const { folder, items } = await listItems(userId, id);
    return NextResponse.json({
      folder: { id: folder.id, name: folder.name, slug: folder.slug, isDefault: folder.isDefault },
      samples: items.map((item) => ({
        id: item.sampleId ?? `fav_${item.id}`,
        folderItemId: item.id,
        source: "folder",
        packDeleted: !item.sample,
        audioUrl: `/api/folder-items/${item.id}/audio`,
        coverUrl: item.coverPath ? `/api/folder-items/${item.id}/cover` : null,
        displayName: item.displayName,
        fileName: item.fileName,
        relativePath: item.relativePath,
        durationMs: item.durationMs,
        type: item.type,
        instrument: item.instrument,
        category: item.category,
        genre: item.genre,
        bpm: item.bpm,
        key: item.key,
        tags: item.tags,
        waveformPeaks: item.waveformPeaks,
        pack: {
          id: item.sample?.packId ?? "",
          name: item.packName,
          slug: item.packSlug,
          producer: item.producer,
          coverPath: null,
        },
        meta: { rating: null, favorite: true },
        addedAt: item.addedAt,
      })),
    });
  } catch (err) {
    return cloudErrorResponse(err);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getCloudUserId();
  if (typeof userId !== "string") return userId;
  const { id } = await params;
  try {
    const body = (await request.json().catch(() => ({}))) as { sampleId?: string };
    if (!body.sampleId) return NextResponse.json({ error: "Informe sampleId" }, { status: 400 });
    const item = await addSampleToFolder(userId, id, body.sampleId);
    return NextResponse.json({ ok: true, itemId: item.id });
  } catch (err) {
    return cloudErrorResponse(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getCloudUserId();
  if (typeof userId !== "string") return userId;
  const { id } = await params;
  const sampleId = request.nextUrl.searchParams.get("sampleId") ?? undefined;
  const itemId = request.nextUrl.searchParams.get("itemId") ?? undefined;
  if (!sampleId && !itemId) {
    return NextResponse.json({ error: "Informe sampleId ou itemId" }, { status: 400 });
  }
  try {
    const item = await removeItem(userId, id, { sampleId, itemId });
    return NextResponse.json({ ok: true, removed: Boolean(item) });
  } catch (err) {
    return cloudErrorResponse(err);
  }
}
