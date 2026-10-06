# BeatStack Manager — Sales Page

Landing page for selling BeatStack Manager. Deploy independently from the main app.

## Setup

```bash
cd sites/beatstack-manager-sales
npm install
cp .env.example .env.local
# Edit .env.local with your checkout URL
npm run dev
```

Open http://localhost:3001

## Environment variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_CHECKOUT_URL` | External checkout link (Hotmart, Kiwify, etc.) |
| `NEXT_PUBLIC_SITE_URL` | Public URL for OG metadata (e.g. `https://beatstack.paulolinks.com`) |
| `NEXT_PUBLIC_LICENSE_LOGIN_URL` | License server login (default: license.srv983653.hstgr.cloud) |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Support contact email |

## Build & deploy

Static export (default):

```bash
npm run build
```

Output: `out/` — upload to any static host (Netlify, Vercel, Caddy, nginx).

### Vercel

1. Import repo, set root directory to `sites/beatstack-manager-sales`
2. Add env vars in project settings
3. Deploy

### Caddy (subdomain example)

```caddy
beatstack.paulolinks.com {
    root * /var/www/beatstack-sales
    file_server
    try_files {path} /index.html
}
```

Copy `out/` contents to `/var/www/beatstack-sales` after each build.

## Post-purchase automation

After payment, your automation (n8n, Zapier, etc.) should:

1. `POST https://license.srv983653.hstgr.cloud/api/webhooks/register-user`
2. Body: `{ "email", "password", "name", "approved": true, "managerLicensed": true }`
3. Email customer: login credentials + installer download link

See [docs/CADASTRO-MANAGER.md](../../docs/CADASTRO-MANAGER.md) in the main repo.

## Installer download link

Point customers to your hosted installer, e.g.:

`https://your-cdn.com/BeatStack-Manager-Setup-2.0.13.exe`

Or serve from `releases/v2.0/` after uploading to your file host.
