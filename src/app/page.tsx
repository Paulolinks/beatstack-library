import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PackCard } from "@/components/PackCard";
import { Upload } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const packs = await prisma.pack.findMany({
    where: { published: true },
    orderBy: { importedAt: "desc" },
  });

  return (
    <div>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sua biblioteca</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {packs.length} sample pack{packs.length !== 1 ? "s" : ""} importado
            {packs.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/admin/import"
          className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500"
        >
          <Upload className="h-4 w-4" />
          Importar pack
        </Link>
      </div>

      {packs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-24 text-center">
          <p className="text-lg text-zinc-400">Nenhum pack importado ainda</p>
          <p className="mt-2 max-w-md text-sm text-zinc-600">
            Faça upload de um ZIP com seu sample pack para começar. O app extrai,
            classifica kicks/snares/bass/guitar e detecta a capa automaticamente.
          </p>
          <Link
            href="/admin/import"
            className="mt-6 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
          >
            Importar primeiro pack
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {packs.map((pack) => (
            <PackCard key={pack.id} pack={pack} />
          ))}
        </div>
      )}
    </div>
  );
}
