import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/get-session";
import { isLicenseServerMode } from "@/lib/app-mode";
import { prisma } from "@/lib/prisma";
import {
  parseCampaignOptions,
  serializeCampaignOptions,
  type CampaignOption,
  type CampaignType,
} from "@/lib/campaigns/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isLicenseServerMode()) {
    return NextResponse.json({ error: "Indisponível" }, { status: 404 });
  }

  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;
  let body: {
    title?: string;
    titleEn?: string;
    body?: string;
    bodyEn?: string;
    type?: CampaignType;
    options?: CampaignOption[];
    allowText?: boolean;
    autoSubmitOnOption?: boolean;
    active?: boolean;
    startsAt?: string | null;
    endsAt?: string | null;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const existing = await prisma.campaign.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 });
  }

  const campaign = await prisma.campaign.update({
    where: { id },
    data: {
      ...(body.title !== undefined ? { title: body.title.trim() } : {}),
      ...(body.titleEn !== undefined ? { titleEn: body.titleEn?.trim() || null } : {}),
      ...(body.body !== undefined ? { body: body.body.trim() } : {}),
      ...(body.bodyEn !== undefined ? { bodyEn: body.bodyEn?.trim() || null } : {}),
      ...(body.type !== undefined ? { type: body.type } : {}),
      ...(body.options !== undefined
        ? { options: serializeCampaignOptions(body.options) }
        : {}),
      ...(body.allowText !== undefined ? { allowText: body.allowText } : {}),
      ...(body.autoSubmitOnOption !== undefined
        ? { autoSubmitOnOption: body.autoSubmitOnOption }
        : {}),
      ...(body.active !== undefined ? { active: body.active } : {}),
      ...(body.startsAt !== undefined
        ? { startsAt: body.startsAt ? new Date(body.startsAt) : null }
        : {}),
      ...(body.endsAt !== undefined
        ? { endsAt: body.endsAt ? new Date(body.endsAt) : null }
        : {}),
    },
  });

  return NextResponse.json({
    campaign: { ...campaign, options: parseCampaignOptions(campaign.options) },
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isLicenseServerMode()) {
    return NextResponse.json({ error: "Indisponível" }, { status: 404 });
  }

  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.campaign.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
