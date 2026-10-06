"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { HardDrive, Monitor, Users, UserCheck } from "lucide-react";

interface Stats {
  total: number;
  activeLicenses: number;
  onlineNow: number;
  offlineLicensed: number;
}

export default function LicenseDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/license-stats");
    const data = (await res.json()) as Stats;
    setStats(data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const cards = [
    {
      label: "Licenças ativas",
      value: stats?.activeLicenses ?? "—",
      icon: UserCheck,
      color: "text-emerald-400",
    },
    {
      label: "PCs online agora",
      value: stats?.onlineNow ?? "—",
      icon: Monitor,
      color: "text-sky-400",
    },
    {
      label: "Licenciados offline",
      value: stats?.offlineLicensed ?? "—",
      icon: HardDrive,
      color: "text-zinc-400",
    },
    {
      label: "Total de contas",
      value: stats?.total ?? "—",
      icon: Users,
      color: "text-violet-400",
    },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Painel de licenças</h1>
      <p className="mb-8 text-sm text-zinc-500">
        BeatStack Manager — produto separado da biblioteca online. Aqui você controla quem pode
        usar o app desktop e quantos PCs estão logados (máximo 1 por conta).
      </p>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-xl border border-white/10 bg-[#0d0d12] p-4"
          >
            <div className="mb-2 flex items-center gap-2 text-xs text-zinc-500">
              <Icon className={`h-4 w-4 ${color}`} />
              {label}
            </div>
            <p className="text-2xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-[#0d0d12] p-6">
        <h2 className="mb-2 text-sm font-semibold text-zinc-300">Como funciona</h2>
        <ul className="space-y-2 text-sm text-zinc-500">
          <li>• O comprador instala o BeatStack Manager no PC e faz login com e-mail/senha.</li>
          <li>• Só funciona com licença ativa (você libera aqui).</li>
          <li>• Pode instalar em vários PCs, mas só <strong className="text-zinc-400">1 logado por vez</strong>.</li>
          <li>• Login em outro PC desloga o anterior automaticamente.</li>
          <li>• Packs ficam no computador do cliente — nada a ver com BeatStack Library.</li>
        </ul>
        <Link
          href="/admin/manager-licenses"
          className="mt-4 inline-flex rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
        >
          Gerenciar licenças
        </Link>
      </div>
    </div>
  );
}
