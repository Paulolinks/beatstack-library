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

Repositório local já inicializado com commit inicial. Para criar no GitHub e enviar o código:

### 1. Autenticar (uma vez)

```powershell
& "$env:LOCALAPPDATA\gh-cli\bin\gh.exe" auth login
```

Escolha: GitHub.com → HTTPS → Login via browser.

### 2. Criar repo e push

```powershell
cd "c:\Users\paulo\Desktop\BeatStack Library"
.\scripts\setup-github.ps1
```

Isso cria `github.com/SEU_USUARIO/beatstack-library` (público) e faz push da branch `main`.

### Commits seguintes

```bash
git add .
git commit -m "sua mensagem"
git push
```
