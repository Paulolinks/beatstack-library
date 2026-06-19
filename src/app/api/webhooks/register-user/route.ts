import { NextRequest, NextResponse } from "next/server";
import { registerUserFromWebhook } from "@/lib/auth/register-user";
import { verifyRegistrationWebhookSecret } from "@/lib/auth/webhook-secret";

function readWebhookSecret(request: NextRequest): string | null {
  const header =
    request.headers.get("x-beatstack-webhook-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return header?.trim() || null;
}

export async function POST(request: NextRequest) {
  if (!verifyRegistrationWebhookSecret(readWebhookSecret(request))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let body: {
    email?: string;
    password?: string;
    name?: string;
    approved?: boolean;
    source?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const result = await registerUserFromWebhook({
    email: body.email ?? "",
    password: body.password,
    name: body.name,
    approved: body.approved,
    source: body.source,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    success: true,
    created: result.created,
    user: result.user,
    password: result.password,
    message: result.created
      ? "Usuário criado e aprovado"
      : "Usuário já existia — senha e aprovação atualizadas",
  });
}
