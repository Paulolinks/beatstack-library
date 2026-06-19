# Cadastro automático de usuários após pagamento

Este guia explica como cadastrar clientes no **BeatStack Library (VPS)** quando alguém compra na sua página de vendas — usando **n8n**, **Zapier**, **Make**, webhook do **Stripe/Mercado Pago**, ou qualquer automação que faça HTTP POST.

---

## Como funciona

1. Cliente paga na sua página de vendas.
2. Seu sistema dispara um **webhook** para o VPS.
3. O VPS cria (ou atualiza) o usuário com `approved: true`.
4. A automação envia **e-mail + senha** para o cliente.
5. Cliente instala o app **v1.1+** e faz login — **apenas 1 computador logado por vez**.

**Endpoint:**

```http
POST https://library.srv983653.hstgr.cloud/api/webhooks/register-user
Content-Type: application/json
X-BeatStack-Webhook-Secret: SEU_SEGREDO_AQUI
```

Ou:

```http
Authorization: Bearer SEU_SEGREDO_AQUI
```

**Body (JSON):**

```json
{
  "email": "cliente@email.com",
  "password": "SenhaSegura123",
  "name": "Nome do Cliente",
  "approved": true,
  "source": "pagina-vendas"
}
```

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| `email` | Sim | E-mail de login (normalizado para minúsculas) |
| `password` | Não | Se omitir, o VPS gera uma senha aleatória e devolve na resposta |
| `name` | Não | Nome exibido no admin |
| `approved` | Não | Padrão `true` — libera login imediatamente |
| `source` | Não | Só referência (ex.: `stripe`, `hotmart`) — não é salvo ainda |

**Resposta de sucesso (201 implícito 200):**

```json
{
  "success": true,
  "created": true,
  "user": {
    "id": "clx...",
    "email": "cliente@email.com",
    "name": "Nome do Cliente",
    "approved": true
  },
  "password": "SenhaSegura123",
  "message": "Usuário criado e aprovado"
}
```

Se o e-mail **já existir**, a senha é **atualizada** e a conta é **aprovada** (`created: false`).

**Erros comuns:**

| HTTP | Motivo |
|------|--------|
| 401 | Segredo do webhook incorreto ou ausente |
| 400 | E-mail inválido ou senha com menos de 8 caracteres |
| 500 | Erro interno — ver logs do container |

---

## Configurar o segredo no VPS

No arquivo `.env` do servidor (`/opt/beatstack-library/.env`):

```env
REGISTRATION_WEBHOOK_SECRET=coloque-um-segredo-longo-e-aleatorio-aqui
JWT_SECRET=outro-segredo-forte-para-sessoes
```

Gere um segredo forte:

```bash
openssl rand -hex 32
```

Depois rebuild:

```bash
cd /opt/beatstack-library
git pull
docker compose -p beatstack -f docker-compose.traefik.yml up -d --build
```

**Importante:** use o **mesmo segredo** no n8n/automação e no `.env` do VPS.

---

## Exemplo com n8n (recomendado — já na sua VPS)

Fluxo típico:

```text
[Trigger: Webhook da página de vendas / Stripe / Hotmart]
        ↓
[HTTP Request → BeatStack register-user]
        ↓
[Send Email → cliente com login e senha]
```

### Nó HTTP Request

- **Method:** POST  
- **URL:** `https://library.srv983653.hstgr.cloud/api/webhooks/register-user`  
- **Headers:**
  - `Content-Type`: `application/json`
  - `X-BeatStack-Webhook-Secret`: `{{ $env.BEATSTACK_WEBHOOK_SECRET }}`
- **Body (JSON):**

```json
{
  "email": "{{ $json.customer_email }}",
  "password": "{{ $json.generated_password }}",
  "name": "{{ $json.customer_name }}",
  "approved": true,
  "source": "n8n-venda"
}
```

### Gerar senha no n8n

Use um nó **Code** antes do HTTP Request:

```javascript
const crypto = require('crypto');
const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
let password = '';
const bytes = crypto.randomBytes(12);
for (let i = 0; i < 12; i++) {
  password += chars[bytes[i] % chars.length];
}
return [{ json: { ...$input.first().json, generated_password: password } }];
```

### E-mail para o cliente (template sugerido)

**Assunto:** Seu acesso ao BeatStack Library

**Corpo:**

```text
Olá {{ nome }},

Pagamento confirmado! Seu acesso está liberado.

1. Baixe e instale: BeatStack Library Setup 1.1.0
2. Abra o app e entre com:
   E-mail: {{ email }}
   Senha: {{ password }}

Regras:
- Use apenas sua conta pessoal.
- Apenas 1 computador logado por vez (se entrar em outro PC, o anterior será deslogado).

Suporte: seu@email.com
```

---

## Exemplo com cURL (teste manual)

```bash
curl -X POST "https://library.srv983653.hstgr.cloud/api/webhooks/register-user" \
  -H "Content-Type: application/json" \
  -H "X-BeatStack-Webhook-Secret: SEU_SEGREDO" \
  -d "{\"email\":\"teste@email.com\",\"password\":\"senha12345\",\"name\":\"Teste\",\"approved\":true}"
```

---

## Cadastro manual (admin)

Sem automação, use o painel:

1. Entre como admin em `https://library.srv983653.hstgr.cloud`
2. **Admin → Usuários → Adicionar usuário**
3. Marque como aprovado

Ou via SSH no VPS:

```bash
docker compose -p beatstack -f docker-compose.traefik.yml exec app \
  npx tsx scripts/create-admin.ts cliente@email.com Senha12345 "Nome"
```

(O script `create-admin.ts` cria/atualiza com role admin — para clientes use o webhook ou painel.)

---

## Sessão única (v1.1+)

A partir da **v1.1.0**:

- Cada login gera uma sessão nova no banco.
- Login em outro PC **invalida** a sessão anterior em até ~45 segundos (poll do app).
- Mensagem no login: *"Sua conta foi aberta em outro computador"*.

Instaladores:

| Versão | Pasta | Comportamento |
|--------|-------|----------------|
| 1.0.0 | `releases/v1.0/` | Vários PCs simultâneos |
| 1.1.0 | `releases/v1.1/` | 1 PC logado por vez |

---

## Checklist de produção

- [ ] `REGISTRATION_WEBHOOK_SECRET` definido no `.env` do VPS  
- [ ] `JWT_SECRET` forte (não usar o default de dev)  
- [ ] Webhook da página de vendas apontando para o VPS  
- [ ] E-mail automático com credenciais após pagamento  
- [ ] Clientes recebem instalador **v1.1.0** ou superior  
- [ ] Testar: login PC A → login PC B → PC A desloga

---

## Segurança

- **Nunca** exponha o `REGISTRATION_WEBHOOK_SECRET` no frontend ou no instalador.
- Use **HTTPS** (Traefik já faz isso).
- Rotacionar o segredo se vazar: troque no `.env` e no n8n ao mesmo tempo.
- O webhook **não** exige login de admin — só o segredo compartilhado.
