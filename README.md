# BeatStack Library

Sample pack manager estilo Splice — roda local no PC, com plano de deploy no VPS depois.

## Funcionalidades (v0.1)

- Importar sample packs via **ZIP**
- Extração automática + detecção de capa
- Classificação por pasta/nome (kick, snare, bass, guitar, loop, etc.)
- Grid de packs com capas
- Busca global com filtros
- Preview de áudio + favoritos + estrelas (1–5)

## Stack

- Next.js 16 + TypeScript + Tailwind
- Prisma + SQLite (local)
- Storage em `./storage/`

## Como rodar

```bash
npm install
npm run db:push
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) → **Importar** → envie um `.zip` do seu pack.

## Plano completo

Veja [PLAN.md](./PLAN.md) para as fases (local → polish → VPS → pagamentos).

## Estrutura

```text
src/app/          # páginas e API routes
src/lib/import/   # extração, scan, classificação
prisma/           # schema e banco SQLite
storage/          # packs importados (gitignored)
```

## GitHub

Repositório: configure com `scripts/setup-github.ps1` após autenticar no GitHub CLI.
