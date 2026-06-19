# BeatStack Library — Plano de implementação

## Filosofia

```text
Local primeiro → funciona no PC → sobe pro VPS → escala só quando precisar
```

## Stack (Fase 1 — local)

| Camada | Tecnologia |
|--------|------------|
| App | Next.js 16 + TypeScript + Tailwind |
| Banco | SQLite + Prisma |
| Storage | `./storage/` (packs, covers, inbox) |
| Áudio | HTML5 + API de stream |
| ZIP | adm-zip |

## Fases

### Fase 1 — Local funcional (atual) ✅

- [x] Schema Prisma estilo Splice (packs, samples, meta, coleções)
- [x] Importador ZIP com extração automática
- [x] Classificação por nome/pasta (kick, snare, bass, guitar, loop…)
- [x] Detecção de capa do pack
- [x] Grid de packs + detalhe + busca
- [x] Preview de áudio + favorito + estrelas
- [x] Página admin de upload

**Critério de sucesso:** importar 1 pack → buscar "kick" → ouvir → favoritar

### Fase 2 — Polimento local

- UI refinada, filtros avançados, coleções, waveform, download, RAR

### Fase 3 — VPS simples

- Docker, login, assinatura anual, Stripe/Mercado Pago, download online

### Fase 4 — Escala (futuro)

- PostgreSQL, Redis, CDN/R2, Meilisearch, BPM/key automático, Tauri

## Modelo de dados (Splice-like)

### Pack
`name`, `producer`, `slug`, `coverPath`, `description`, `genre`, `tags`, `sampleCount`, `published`, `importedAt`

### Sample
`fileName`, `displayName`, `storagePath`, `relativePath`, `durationMs`, `type`, `instrument`, `category`, `genre`, `bpm`, `key`, `tags`, `waveformPeaks`, `searchText`

### UserSampleMeta (uso local, usuário único)
`rating` (1-5), `favorite`, `downloadedAt`

### Collection
`name` + samples vinculados

## Como testar

```bash
npm install
npm run db:migrate
npm run dev
```

Abrir http://localhost:3000 → **Importar** → enviar ZIP do sample pack.

## Estrutura de storage

```text
storage/
├── inbox/       # uploads temporários
├── packs/       # packs extraídos
│   └── {slug}/
│       ├── cover.jpg
│       └── ...
└── data.db      # SQLite (via prisma/)
```
