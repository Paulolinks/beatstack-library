# Cadastro automático após compra do BeatStack Manager

Quando alguém compra o **BeatStack Manager** na página de vendas, sua automação (n8n, Zapier, Make, etc.) deve criar a conta no **servidor de licença** com `managerLicensed: true`.

---

## Endpoint

```http
POST https://license.srv983653.hstgr.cloud/api/webhooks/register-user
Content-Type: application/json
X-BeatStack-Webhook-Secret: SEU_SEGREDO_AQUI
```

Ou:

```http
Authorization: Bearer SEU_SEGREDO_AQUI
```

---

## Body (compra do Manager)

```json
{
  "email": "cliente@email.com",
  "password": "SenhaSegura123",
  "name": "Nome do Cliente",
  "approved": true,
  "managerLicensed": true,
  "source": "pagina-vendas-manager"
}
```

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| `email` | Sim | E-mail de login no BeatStack Manager |
| `password` | Não | Se omitir, o servidor gera uma senha aleatória |
| `name` | Não | Nome exibido no admin |
| `approved` | Não | Padrão `true` |
| `managerLicensed` | Sim (Manager) | Deve ser `true` para liberar o app desktop |
| `source` | Não | Referência (ex.: `hotmart`, `kiwify`) |

---

## Resposta de sucesso

```json
{
  "success": true,
  "created": true,
  "user": {
    "id": "clx...",
    "email": "cliente@email.com",
    "name": "Nome do Cliente",
    "approved": true,
    "managerLicensed": true
  },
  "password": "SenhaSegura123",
  "message": "Usuário criado e aprovado"
}
```

Se o e-mail **já existir**, a senha é atualizada, a conta é aprovada e a licença Manager é ativada (`created: false`).

---

## Fluxo completo pós-compra

1. Cliente paga na página de vendas (`sites/beatstack-manager-sales`)
2. Plataforma de pagamento dispara webhook para n8n/Zapier
3. Automação chama `POST /api/webhooks/register-user` com `managerLicensed: true`
4. Automação envia e-mail ao cliente com:
   - E-mail e senha de login
   - Link para download do instalador (ex.: `BeatStack-Manager-Setup-2.0.13.exe`)
   - Link de login: https://license.srv983653.hstgr.cloud/login
5. Cliente instala o Manager, faz login e começa a organizar a biblioteca

---

## Diferença: Library vs Manager

| Produto | Campo webhook | Uso |
|---------|---------------|-----|
| BeatStack Library (VPS) | `approved: true` | App cliente v1/v1.1 na nuvem |
| BeatStack Manager (desktop) | `managerLicensed: true` | App local v2 |

Para compra do Manager, **sempre** inclua `"managerLicensed": true`.

---

## Configurar o segredo no VPS

No `.env` do servidor (`/opt/beatstack-library/.env`):

```env
BEATSTACK_WEBHOOK_SECRET=sua-chave-secreta-longa
```

Use o mesmo valor no header `X-BeatStack-Webhook-Secret` da automação.

---

## Página de vendas

Site em `sites/beatstack-manager-sales/`. Configure:

```env
NEXT_PUBLIC_CHECKOUT_URL=https://sua-plataforma-de-pagamento.com/...
```

Veja [sites/beatstack-manager-sales/README.md](../sites/beatstack-manager-sales/README.md) para deploy.
