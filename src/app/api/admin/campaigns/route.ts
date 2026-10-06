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
import { getCampaignStatsList } from "@/lib/campaigns/service";

export async function GET() {
  if (!isLicenseServerMode()) {
    return NextResponse.json({ error: "Indisponível" }, { status: 404 });
  }

  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const campaigns = await getCampaignStatsList();
  return NextResponse.json({ campaigns });
}

export async function POST(request: Request) {
  if (!isLicenseServerMode()) {
    return NextResponse.json({ error: "Indisponível" }, { status: 404 });
  }

  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

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

  if (!body.title?.trim() || !body.body?.trim()) {
    return NextResponse.json({ error: "Título e mensagem são obrigatórios" }, { status: 400 });
  }

  const campaign = await prisma.campaign.create({
    data: {
      title: body.title.trim(),
      titleEn: null,
      body: body.body.trim(),
      bodyEn: null,
      type: body.type ?? "notice",
      options: serializeCampaignOptions(body.options ?? []),
      allowText: body.allowText ?? false,
      autoSubmitOnOption: body.autoSubmitOnOption ?? true,
      active: body.active ?? true,
      startsAt: body.startsAt ? new Date(body.startsAt) : null,
      endsAt: body.endsAt ? new Date(body.endsAt) : null,
    },
  });

  return NextResponse.json({
    campaign: {
      ...campaign,
      options: parseCampaignOptions(campaign.options),
    },
  });
}
