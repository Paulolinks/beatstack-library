import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { ensureManagerDbReady } from "@/lib/manager/init-db";
import {
  ensureDefaultFavoriteFolder,
  findFavoriteFolderByName,
  getActiveFavoriteFolderId,
  setActiveFavoriteFolderId,
  slugifyFolderName,
} from "@/lib/manager/favorite-folders";
import { ensureFavoriteFolderPath, getFavoriteFolderPath } from "@/lib/library-paths";
import { prisma } from "@/lib/prisma";
import { isManagerMode } from "@/lib/app-mode";

export async function GET() {
  if (!isManagerMode()) {
    return NextResponse.json({ error: "Somente no BeatStack Manager" }, { status: 404 });
  }

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    await ensureManagerDbReady();
    await ensureDefaultFavoriteFolder();

    const activeFavoriteFolderId = await getActiveFavoriteFolderId();
    const folders = await prisma.favoriteFolder.findMany({
      orderBy: [{ isDefault: "desc" }, { name: "asc" }, { createdAt: "asc" }],
    });

    const foldersWithPath = folders.map((f) => ({
      ...f,
      diskPath: getFavoriteFolderPath(f.isDefault ? null : f.slug),
    }));

    return NextResponse.json({ folders: foldersWithPath, activeFavoriteFolderId });
  } catch (err) {
    console.error("[GET favorite-folders]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isManagerMode()) {
    return NextResponse.json({ error: "Somente no BeatStack Manager" }, { status: 404 });
  }

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    await ensureManagerDbReady();

    let body: { name?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "Nome da pasta obrigatório" }, { status: 400 });
    }

    const existing = await findFavoriteFolderByName(name);
    if (existing) {
      return NextResponse.json(
        { error: "Já existe uma pasta com este nome", folder: existing },
        { status: 409 },
      );
    }

    let slug = slugifyFolderName(name);
    const taken = await prisma.favoriteFolder.findUnique({ where: { slug } });
    if (taken) {
      slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    }

    const folder = await prisma.favoriteFolder.create({
      data: { name, slug, isDefault: false },
    });

    try {
      ensureFavoriteFolderPath(folder.slug);
    } catch (diskErr) {
      console.error("[POST favorite-folders] disk:", diskErr);
    }

    return NextResponse.json({
      folder: {
        ...folder,
        diskPath: getFavoriteFolderPath(folder.slug),
      },
    });
  } catch (err) {
    console.error("[POST favorite-folders]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!isManagerMode()) {
    return NextResponse.json({ error: "Somente no BeatStack Manager" }, { status: 404 });
  }

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    await ensureManagerDbReady();

    let body: { activeFavoriteFolderId?: string | null };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const folderId = body.activeFavoriteFolderId ?? null;
    if (folderId) {
      const folder = await prisma.favoriteFolder.findUnique({ where: { id: folderId } });
      if (!folder) {
        return NextResponse.json({ error: "Pasta não encontrada" }, { status: 404 });
      }
    }

    await setActiveFavoriteFolderId(folderId);
    return NextResponse.json({ success: true, activeFavoriteFolderId: folderId });
  } catch (err) {
    console.error("[PATCH favorite-folders]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
