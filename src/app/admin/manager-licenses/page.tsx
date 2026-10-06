"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, HardDrive, Loader2, UserPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  role: string;
  approved: boolean;
  managerLicensed: boolean;
  licensePurchasedAt: string | null;
  licenseActivatedAt: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  lastLoginDevice: string | null;
  activeManagerSessionId: string | null;
}

export default function AdminManagerLicensesPage() {
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
        body: JSON.stringify({
          email,
          password,
          name,
          approved: true,
          managerLicensed: true,
          role: "user",
        }),
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

  async function toggleManagerLicense(user: UserRow) {
    await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ managerLicensed: !user.managerLicensed }),
    });
    await load();
  }

  async function approveLibraryAccess(user: UserRow) {
    await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: true }),
    });
    await load();
  }

  const licensed = users.filter((u) => u.managerLicensed);
  const pending = users.filter((u) => !u.managerLicensed);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-2 flex items-center gap-2">
        <HardDrive className="h-6 w-6 text-sky-400" />
        <h1 className="text-2xl font-semibold tracking-tight">Licenças BeatStack Manager</h1>
      </div>
      <p className="mb-2 text-sm text-zinc-500">
        Clientes do app desktop <strong className="text-zinc-300">BeatStack Manager</strong> — onde
        ficam os packs no PC. Máximo 1 PC logado por conta. A conta também fica aprovada no Library
        online (VPS).
      </p>
      <p className="mb-8 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200/90">
        Importante: faça login no app <strong>BeatStack Manager</strong> instalado no PC — não no
        site library.srv983653 no navegador. Para enviar packs ao VPS, use Admin → Sync VPS dentro
        do Manager.
      </p>

      <form
        onSubmit={(e) => void createUser(e)}
        className="mb-8 space-y-4 rounded-xl border border-white/10 bg-[#141418] p-6"
      >
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
          <UserPlus className="h-4 w-4" />
          Nova licença Manager
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="email"
            required
            placeholder="E-mail do comprador"
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
          {creating ? "Criando..." : "Criar com licença Manager ativa"}
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
        <UserLicenseTable
          title={`Ativas (${licensed.length})`}
          users={licensed}
          onToggle={toggleManagerLicense}
          onApproveLibrary={approveLibraryAccess}
          active
        />
      )}

      {!loading && pending.length > 0 && (
        <div className="mt-8">
          <UserLicenseTable
            title={`Sem licença Manager (${pending.length})`}
            users={pending}
            onToggle={toggleManagerLicense}
            onApproveLibrary={approveLibraryAccess}
            active={false}
          />
        </div>
      )}
    </div>
  );
}

function UserLicenseTable({
  title,
  users,
  onToggle,
  onApproveLibrary,
  active,
}: {
  title: string;
  users: UserRow[];
  onToggle: (user: UserRow) => void | Promise<void>;
  onApproveLibrary: (user: UserRow) => void | Promise<void>;
  active: boolean;
}) {
  if (users.length === 0) return null;

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-zinc-400">{title}</h2>
      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-[#0d0d12] text-left text-[10px] uppercase tracking-wider text-zinc-500">
              <th className="px-4 py-2">E-mail</th>
              <th className="px-4 py-2">Nome</th>
              <th className="px-4 py-2">Compra / ativação</th>
              <th className="px-4 py-2">Sessão</th>
              <th className="px-4 py-2">Último login</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-white/[0.06]">
                <td className="px-4 py-3">{user.email}</td>
                <td className="px-4 py-3 text-zinc-400">{user.name ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-zinc-500">
                  {user.licensePurchasedAt && (
                    <div>
                      Compra:{" "}
                      {new Date(user.licensePurchasedAt).toLocaleDateString("pt-BR")}
                    </div>
                  )}
                  {user.licenseActivatedAt ? (
                    <div className="text-emerald-400/90">
                      Ativada:{" "}
                      {new Date(user.licenseActivatedAt).toLocaleString("pt-BR")}
                    </div>
                  ) : (
                    <div className="text-zinc-600">Ainda não usou o app</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {user.activeManagerSessionId ? (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-400">
                      1 PC online
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-600">Offline</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-500">
                  {user.lastLoginAt ? (
                    <>
                      {new Date(user.lastLoginAt).toLocaleString("pt-BR")}
                      {user.lastLoginDevice ? (
                        <div className="mt-0.5 text-zinc-600">{user.lastLoginDevice}</div>
                      ) : null}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex flex-col items-end gap-1.5">
                    {active && !user.approved && (
                      <button
                        type="button"
                        onClick={() => void onApproveLibrary(user)}
                        className="inline-flex items-center gap-1 rounded-lg border border-sky-500/30 px-2.5 py-1 text-xs text-sky-300 hover:bg-sky-500/10"
                      >
                        <Check className="h-3 w-3" />
                        Aprovar Library
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void onToggle(user)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs hover:bg-white/5",
                        active ? "border-amber-500/30 text-amber-300" : "border-emerald-500/30 text-emerald-300",
                      )}
                    >
                    {active ? (
                      <>
                        <X className="h-3 w-3" />
                        Revogar
                      </>
                    ) : (
                      <>
                        <Check className="h-3 w-3" />
                        Ativar
                      </>
                    )}
                  </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
