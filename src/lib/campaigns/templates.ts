import type { CampaignType } from "@/lib/campaigns/types";

export type CampaignTemplate = {
  id: CampaignType;
  label: string;
  description: string;
  allowText: boolean;
  autoSubmitOnOption: boolean;
};

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: "notice",
    label: "Aviso",
    description: "Mensagem simples com botão OK",
    allowText: false,
    autoSubmitOnOption: true,
  },
  {
    id: "poll",
    label: "Enquete",
    description: "Pergunta com opções de resposta",
    allowText: false,
    autoSubmitOnOption: true,
  },
  {
    id: "text",
    label: "Texto livre",
    description: "Pergunta aberta para o usuário escrever",
    allowText: true,
    autoSubmitOnOption: false,
  },
  {
    id: "mixed",
    label: "Misto",
    description: "Enquete com campo de texto opcional",
    allowText: true,
    autoSubmitOnOption: false,
  },
];

export function templateConfig(type: CampaignType): CampaignTemplate {
  return CAMPAIGN_TEMPLATES.find((t) => t.id === type) ?? CAMPAIGN_TEMPLATES[0]!;
}
