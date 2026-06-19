"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Disc3, Loader2, LogIn } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/";
  const pending = searchParams.get("pending") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    pending ? "Sua conta ainda não foi aprovada pelo administrador." : null,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as {
        error?: string;
        pending?: boolean;
      };

      if (!res.ok) {
        setError(data.error ?? "Falha no login");
        return;
      }

      router.push(from.startsWith("/login") ? "/" : from);
      router.refresh();
    } catch {
      setError("Erro de rede. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0c] px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141418] p-8 shadow-xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/15">
            <Disc3 className="h-8 w-8 text-sky-400" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">BeatStack Library</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Entre com sua conta aprovada para acessar a biblioteca
          </p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-zinc-400">E-mail</label>
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
            <label className="mb-1.5 block text-sm text-zinc-400">Senha</label>
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

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 py-2.5 text-sm font-medium text-white transition hover:bg-sky-500 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Entrando...
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                Entrar
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-600">
          Acesso somente para contas aprovadas. Fale com o administrador se ainda não tem acesso.
        </p>

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
          Carregando...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
