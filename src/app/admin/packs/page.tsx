import Image from "next/image";
import Link from "next/link";
import { Music2, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPacksPage() {
  const packs = await prisma.pack.findMany({
    orderBy: { importedAt: "desc" },
    include: { _count: { select: { samples: true } } },
  });

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Gerenciar packs</h1>
      <p className="mb-8 text-sm text-zinc-500">
        Edite nome e capa de cada pack. (Modo admin — sem login por enquanto.)
      </p>

      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-[#0d0d12] text-left text-[10px] uppercase tracking-wider text-zinc-500">
              <th className="px-4 py-3">Capa</th>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Samples</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {packs.map((pack) => {
              const coverUrl = pack.coverPath ? `/api/covers/${pack.id}` : null;
              return (
                <tr key={pack.id} className="border-b border-white/[0.06] hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="relative h-12 w-12 overflow-hidden rounded bg-zinc-800">
                      {coverUrl ? (
                        <Image src={coverUrl} alt="" fill className="object-cover" unoptimized />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Music2 className="h-5 w-5 text-zinc-600" />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-100">{pack.name}</p>
                    {pack.producer && (
                      <p className="text-xs text-zinc-500">{pack.producer}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{pack._count.samples}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/packs/${pack.slug}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/15"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
