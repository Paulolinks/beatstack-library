"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Disc3, Loader2, LogIn } from "lucide-react";
import { getAppTitleClient, isLicenseServerModeClient, isManagerModeClient } from "@/lib/app-mode-client";
import { useI18n } from "@/lib/i18n/context";
import { loadSavedLogin, persistSavedLogin } from "@/lib/saved-login";
import { syncLegalAcceptanceToServer } from "@/lib/legal/acceptance-client";
import { SIGNUP_URL } from "@/lib/i18n/messages";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const from = searchParams.get("from") || "/";
  const pending = searchParams.get("pending") === "1";
  const otherDevice =
    !isLicenseServerModeClient() && searchParams.get("reason") === "other_device";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberLogin, setRememberLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [error, setError] = useState<string | null>(
    otherDevice
      ? t("loginOtherDevice")
      : pending
        ? t("loginPendingApproval")
        : null,
  );

  useEffect(() => {
    const saved = loadSavedLogin();
    if (saved.remember) {
      setEmail(saved.email);
      setPassword(saved.password);
      setRememberLogin(true);
    }
  }, []);

  useEffect(() => {
    if (otherDevice) return;
    void fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d: { user?: { email: string } | null; authDisabled?: boolean }) => {
        if (d.authDisabled || d.user) {
          router.replace(from.startsWith("/login") ? "/" : from);
        }
      })
      .catch(() => {});
  }, [otherDevice, from, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setShowSignup(false);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      let data: { error?: string; pending?: boolean; product?: string; code?: string } = {};
      try {
        data = (await res.json()) as typeof data;
      } catch {
        if (!res.ok) {
          setError(
            res.status >= 500
              ? `${t("loginNetworkError")} (HTTP ${res.status})`
              : t("loginNetworkError"),
          );
          return;
        }
      }

      if (!res.ok) {
        if (data.code === "NOT_REGISTERED") {
          setError(t("loginNotRegistered"));
          setShowSignup(true);
          return;
        }
        if (data.product === "manager" && isManagerModeClient()) {
          setError(data.error ?? t("loginFailed"));
        } else if (data.product === "library" && !isManagerModeClient()) {
          setError(`${data.error ?? t("loginFailed")} ${t("loginManagerHint")}`);
        } else {
          setError(data.error ?? t("loginFailed"));
        }
        return;
      }

      persistSavedLogin(email, password, rememberLogin);
      await syncLegalAcceptanceToServer();

      router.push(
        isLicenseServerModeClient()
          ? "/admin/dashboard"
          : from.startsWith("/login")
            ? "/"
            : from,
      );
      router.refresh();
    } catch {
      setError(t("loginNetworkError"));
    } finally {
      setLoading(false);
    }
  }

  const subtitle = isLicenseServerModeClient()
    ? t("loginSubtitleLicense")
    : isManagerModeClient()
      ? t("loginSubtitleManager")
      : t("loginSubtitleLibrary");

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0c] px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141418] p-8 shadow-xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/15">
            <Disc3 className="h-8 w-8 text-sky-400" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{getAppTitleClient()}</h1>
          <p className="mt-2 text-sm text-zinc-500">{subtitle}</p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-zinc-400">{t("loginEmail")}</label>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full rounded-lg border border-white/10 bg-[#0d0d0f] px-3 py-2.5 text-sm focus:border-sky-500/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-zinc-400">{t("loginPassword")}</label>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-white/10 bg-[#0d0d0f] px-3 py-2.5 text-sm focus:border-sky-500/50 focus:outline-none"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-400">
            <input
              type="checkbox"
              checked={rememberLogin}
              onChange={(e) => setRememberLogin(e.target.checked)}
              className="rounded border-white/20 bg-[#0d0d0f]"
            />
            {t("rememberLogin")}
          </label>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
              {error}
            </div>
          )}

          {showSignup && (
            <a
              href={SIGNUP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center rounded-lg border border-sky-500/40 bg-sky-500/10 py-2.5 text-sm font-medium text-sky-300 transition hover:bg-sky-500/20"
            >
              {t("loginCreateAccount")}
            </a>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 py-2.5 text-sm font-medium text-white transition hover:bg-sky-500 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("loginEntering")}
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                {t("login")}
              </>
            )}
          </button>
        </form>

        {!isLicenseServerModeClient() && (
          <p className="mt-6 text-center text-xs text-zinc-600">{t("loginPendingFooter")}</p>
        )}

        {process.env.NODE_ENV === "development" && (
          <div className="mt-4 rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 py-2.5 text-center text-xs text-sky-300">
            <strong>Teste (dev):</strong> admin@gmail.com · senha: admin123
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0a0a0c] text-zinc-500">
          …
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
