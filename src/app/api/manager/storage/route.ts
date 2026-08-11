import { NextRequest, NextResponse } from "next/server";
import { isManagerMode } from "@/lib/app-mode";
import {
  ensureStorageDirs,
  getDefaultStorageRoot,
  getStorageConfigPath,
  getStorageRoot,
  setStorageRoot,
} from "@/lib/storage";

export async function GET() {
  if (!isManagerMode()) {
    return NextResponse.json({ error: "Somente no BeatStack Manager" }, { status: 404 });
  }

  ensureStorageDirs();
  return NextResponse.json({
    storageRoot: getStorageRoot(),
    defaultRoot: getDefaultStorageRoot(),
    configPath: getStorageConfigPath(),
  });
}

export async function PATCH(request: NextRequest) {
  if (!isManagerMode()) {
    return NextResponse.json({ error: "Somente no BeatStack Manager" }, { status: 404 });
  }

  let body: { storageRoot?: string };
  try {
    body = (await request.json()) as { storageRoot?: string };
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const storageRoot = body.storageRoot?.trim();
  if (!storageRoot) {
    return NextResponse.json({ error: "Informe a pasta de armazenamento" }, { status: 400 });
  }

  try {
    const resolved = setStorageRoot(storageRoot);
    return NextResponse.json({ ok: true, storageRoot: resolved });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao salvar pasta" },
      { status: 500 },
    );
  }
}
