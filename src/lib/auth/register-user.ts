import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { assignableRole } from "@/lib/auth/admin-policy";
import { hashPassword, normalizeEmail, validatePassword } from "@/lib/auth/password";

export function generateRandomPassword(length = 12): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(length);
  let password = "";
  for (let i = 0; i < length; i += 1) {
    password += chars[bytes[i]! % chars.length];
  }
  return password;
}

export type RegisterUserInput = {
  email: string;
  password?: string;
  name?: string | null;
  approved?: boolean;
  source?: string | null;
};

export type RegisterUserResult =
  | {
      ok: true;
      created: boolean;
      user: {
        id: string;
        email: string;
        name: string | null;
        approved: boolean;
      };
      password: string;
    }
  | { ok: false; error: string; status: number };

export async function registerUserFromWebhook(
  input: RegisterUserInput,
): Promise<RegisterUserResult> {
  const email = normalizeEmail(input.email);
  if (!email) {
    return { ok: false, error: "E-mail obrigatório", status: 400 };
  }

  const password = input.password?.trim() || generateRandomPassword();
  const pwdError = validatePassword(password);
  if (pwdError) {
    return { ok: false, error: pwdError, status: 400 };
  }

  const passwordHash = await hashPassword(password);
  const name = input.name?.trim() || null;
  const approved = input.approved ?? true;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const user = await prisma.user.update({
      where: { email },
      data: {
        passwordHash,
        name: name ?? existing.name,
        approved,
        role: assignableRole(email, existing.role),
      },
      select: {
        id: true,
        email: true,
        name: true,
        approved: true,
      },
    });

    return {
      ok: true,
      created: false,
      user,
      password,
    };
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      role: assignableRole(email, "user"),
      approved,
    },
    select: {
      id: true,
      email: true,
      name: true,
      approved: true,
    },
  });

  return {
    ok: true,
    created: true,
    user,
    password,
  };
}
