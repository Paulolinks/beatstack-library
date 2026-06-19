import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/get-session";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;

  let body: { name?: string; producer?: string | null; genre?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (name !== undefined && !name) {
    return NextResponse.json({ error: "Nome do pack não pode ser vazio" }, { status: 400 });
  }

  const pack = await prisma.pack.findUnique({ where: { id } });
  if (!pack) {
    return NextResponse.json({ error: "Pack não encontrado" }, { status: 404 });
  }

  const existingTags = (() => {
    try {
      return JSON.parse(pack.tags) as string[];
    } catch {
      return [];
    }
  })();

  const updated = await prisma.pack.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(body.producer !== undefined ? { producer: body.producer?.trim() || null } : {}),
      ...(body.genre !== undefined
        ? {
            genre: body.genre?.trim() || null,
            tags: JSON.stringify(
              body.genre?.trim()
                ? [...new Set([body.genre.trim(), ...existingTags])]
                : existingTags.filter((t) => t !== pack.genre),
            ),
          }
        : {}),
    },
  });

  return NextResponse.json({ pack: updated });
}
