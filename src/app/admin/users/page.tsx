"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, Shield, UserPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  role: string;
  approved: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  lastLoginDevice: string | null;
  activeSessionId: string | null;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = (await res.json()) as { users?: UserRow[]; error?: string };
      if (!res.ok) throw new Error(data.error);
      setUsers(data.users ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, approved: true, role: "user" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error);
      setEmail("");
      setPassword("");
      setName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar");
    } finally {
      setCreating(false);
    }
  }

  async function toggleApproved(user: UserRow) {
    await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: !user.approved }),
    });
    await load();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Usuários</h1>
      <p className="mb-8 text-sm text-zinc-500">
        Somente e-mails cadastrados e aprovados conseguem entrar no app.
      </p>

      <form
        onSubmit={(e) => void createUser(e)}
        className="mb-8 space-y-4 rounded-xl border border-white/10 bg-[#141418] p-6"
      >
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
          <UserPlus className="h-4 w-4" />
          Adicionar usuário
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="email"
            required
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#0d0d0f] px-3 py-2 text-sm focus:border-sky-500/50 focus:outline-none"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Senha (mín. 8 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#0d0d0f] px-3 py-2 text-sm focus:border-sky-500/50 focus:outline-none"
          />
          <input
            type="text"
            placeholder="Nome (opcional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#0d0d0f] px-3 py-2 text-sm focus:border-sky-500/50 focus:outline-none sm:col-span-2"
          />
        </div>
        <button
          type="submit"
          disabled={creating}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
        >
          {creating ? "Criando..." : "Criar com acesso aprovado"}
        </button>
      </form>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando...
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-[#0d0d12] text-left text-[10px] uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-2">E-mail</th>
                <th className="px-4 py-2">Nome</th>
                <th className="px-4 py-2">Papel</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Último login</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-white/[0.06]">
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3 text-zinc-400">{user.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    {user.role === "admin" ? (
                      <span className="inline-flex items-center gap-1 text-amber-400">
                        <Shield className="h-3.5 w-3.5" />
                        Admin
                      </span>
                    ) : (
                      "Usuário"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs",
                        user.approved
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-amber-500/15 text-amber-400",
                      )}
                    >
                      {user.approved ? "Aprovado" : "Pendente"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {user.activeSessionId ? (
                      <span className="text-emerald-400/90">Online</span>
                    ) : (
                      "—"
                    )}
                    {user.lastLoginAt && (
                      <div className="mt-0.5">
                        {new Date(user.lastLoginAt).toLocaleString("pt-BR")}
                        {user.lastLoginDevice ? ` · ${user.lastLoginDevice}` : ""}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => void toggleApproved(user)}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-xs hover:bg-white/5"
                    >
                      {user.approved ? (
                        <>
                          <X className="h-3 w-3" />
                          Revogar
                        </>
                      ) : (
                        <>
                          <Check className="h-3 w-3" />
                          Aprovar
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
