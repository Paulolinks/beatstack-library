import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { ensureManagerDbReady } from "@/lib/manager/init-db";
import {
  deleteFavoriteFolder,
  ensureDefaultFavoriteFolder,
  findFavoriteFolderByName,
  getActiveFavoriteFolderId,
  setActiveFavoriteFolderId,
  slugifyFolderName,
} from "@/lib/manager/favorite-folders";
import { ensureFavoriteFolderPath } from "@/lib/library-paths";
import { prisma } from "@/lib/prisma";
import { isManagerMode } from "@/lib/app-mode";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isManagerMode()) {
    return NextResponse.json({ error: "Somente no BeatStack Manager" }, { status: 404 });
  }

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    await ensureManagerDbReady();
    const { id } = await params;

    try {
      const folder = await deleteFavoriteFolder(id);
      return NextResponse.json({ success: true, folder });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "NOT_FOUND") {
        return NextResponse.json({ error: "Pasta não encontrada" }, { status: 404 });
      }
      if (msg === "CANNOT_DELETE_DEFAULT") {
        return NextResponse.json({ error: "Não é possível excluir a pasta padrão" }, { status: 400 });
      }
      throw err;
    }
  } catch (err) {
    console.error("[DELETE favorite-folders]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
