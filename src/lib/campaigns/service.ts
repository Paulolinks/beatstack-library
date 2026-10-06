import { prisma } from "@/lib/prisma";
import { parseCampaignOptions, type CampaignInboxItem, type CampaignPayload } from "@/lib/campaigns/types";

function isCampaignActive(
  c: { active: boolean; startsAt: Date | null; endsAt: Date | null },
  now: Date,
): boolean {
  if (!c.active) return false;
  if (c.startsAt && c.startsAt > now) return false;
  if (c.endsAt && c.endsAt < now) return false;
  return true;
}

export async function getInboxCampaignsForUser(userEmail: string): Promise<CampaignInboxItem[]> {
  const now = new Date();
  const email = userEmail.toLowerCase();

  const campaigns = await prisma.campaign.findMany({
    where: {
      active: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    orderBy: { createdAt: "desc" },
    include: {
      responses: {
        where: { userEmail: email },
        take: 1,
      },
    },
  });

  return campaigns
    .filter((c) => isCampaignActive(c, now))
    .map((c) => {
      const response = c.responses[0];
      return {
        id: c.id,
        title: c.title,
        body: c.body,
        type: c.type as CampaignPayload["type"],
        options: parseCampaignOptions(c.options),
        allowText: c.allowText,
        autoSubmitOnOption: c.autoSubmitOnOption,
        unread: !response?.openedAt,
        responded: !!response?.respondedAt,
        createdAt: c.createdAt.toISOString(),
      };
    });
}

export async function getActiveCampaignsForUser(userEmail: string): Promise<CampaignPayload[]> {
  const now = new Date();

  const campaigns = await prisma.campaign.findMany({
    where: {
      active: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    orderBy: { createdAt: "desc" },
    include: {
      responses: {
        where: { userEmail: userEmail.toLowerCase() },
        take: 1,
      },
    },
  });

  return campaigns
    .filter((c) => {
      const r = c.responses[0];
      return !r?.respondedAt;
    })
    .map((c) => ({
      id: c.id,
      title: c.title,
      body: c.body,
      type: c.type as CampaignPayload["type"],
      options: parseCampaignOptions(c.options),
      allowText: c.allowText,
      autoSubmitOnOption: c.autoSubmitOnOption,
    }));
}

export async function markCampaignOpened(campaignId: string, userEmail: string) {
  const email = userEmail.toLowerCase();
  const existing = await prisma.campaignResponse.findUnique({
    where: { campaignId_userEmail: { campaignId, userEmail: email } },
  });

  if (existing?.openedAt) return existing;

  return prisma.campaignResponse.upsert({
    where: { campaignId_userEmail: { campaignId, userEmail: email } },
    create: {
      campaignId,
      userEmail: email,
      openedAt: new Date(),
    },
    update: {
      openedAt: existing?.openedAt ?? new Date(),
    },
  });
}

export async function submitCampaignResponse(
  campaignId: string,
  userEmail: string,
  data: { selectedOption?: string | null; textResponse?: string | null },
) {
  const email = userEmail.toLowerCase();
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign?.active) {
    throw new Error("Campanha inativa");
  }

  return prisma.campaignResponse.upsert({
    where: { campaignId_userEmail: { campaignId, userEmail: email } },
    create: {
      campaignId,
      userEmail: email,
      openedAt: new Date(),
      respondedAt: new Date(),
      selectedOption: data.selectedOption ?? null,
      textResponse: data.textResponse?.trim() || null,
    },
    update: {
      openedAt: new Date(),
      respondedAt: new Date(),
      selectedOption: data.selectedOption ?? null,
      textResponse: data.textResponse?.trim() || null,
    },
  });
}

export async function getCampaignStatsList() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: { responses: true },
  });

  return campaigns.map((c) => {
    const options = parseCampaignOptions(c.options);
    const opened = c.responses.filter((r) => r.openedAt).length;
    const responded = c.responses.filter((r) => r.respondedAt).length;

    const optionCounts = options.map((opt) => ({
      id: opt.id,
      label: opt.label,
      count: c.responses.filter((r) => r.selectedOption === opt.id).length,
    }));

    return {
      id: c.id,
      title: c.title,
      body: c.body,
      type: c.type,
      options,
      allowText: c.allowText,
      autoSubmitOnOption: c.autoSubmitOnOption,
      active: c.active,
      startsAt: c.startsAt?.toISOString() ?? null,
      endsAt: c.endsAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
      opened,
      responded,
      optionCounts,
    };
  });
}
