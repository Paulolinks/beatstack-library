# BeatStack Library

Sample pack manager estilo Splice — app desktop no PC + biblioteca central no VPS.

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

# Criar administrador (primeira vez)
npm run admin:create -- seu@email.com suaSenha123 "Seu Nome"

npm run dev
```

Abra [http://localhost:3000/login](http://localhost:3000/login) e entre com a conta aprovada.

### Login e acesso

- **Somente e-mails cadastrados e aprovados** entram no app
- Admin cria usuários em **Usuários** (menu superior)
- Contas pendentes veem: *"Sua conta ainda não foi aprovada"*
- Em dev, `AUTH_DISABLED=true` no `.env` desliga login (não use em produção)

### Modo online vs app instalado

| | **Online (VPS)** | **App desktop (local)** | **App desktop + VPS** |
|--|------------------|-------------------------|------------------------|
| Acesso | Navegador + login | Instalador `.exe` + login | `.exe` apontando para URL do VPS |
| Copiar sample | Download na pasta Downloads | Copia para `Documents/BeatStack Library/` | Baixa do VPS → salva local + clipboard |

**Deploy VPS + PC:** guia completo em [DEPLOY-VPS.md](./DEPLOY-VPS.md).

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
