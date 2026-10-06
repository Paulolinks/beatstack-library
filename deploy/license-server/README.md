# Servidor de licença BeatStack Manager

O **servidor de licença** valida login, sessão única (1 PC) e se o usuário comprou o Manager.

## URL

- **Licença / login Manager:** https://license.srv983653.hstgr.cloud
- **Biblioteca na nuvem:** https://library.srv983653.hstgr.cloud

Ambos usam o **mesmo backend** (mesmo banco de usuários), com domínios separados.

## Painel admin (você)

https://license.srv983653.hstgr.cloud/admin/manager-licenses

Ou pelo Library: https://library.srv983653.hstgr.cloud/admin/manager-licenses

## Anti-pirataria

1. Usuário instala o BeatStack Manager no PC
2. Faz login com e-mail + senha
3. VPS verifica `managerLicensed = true`
4. Gera sessão com `clientType: manager`
5. **Segundo login** (outro PC) → nova `activeSessionId` → PC anterior perde acesso
6. Revogar licença no admin → sessão invalidada

## VPS — pasta no servidor

```text
/opt/beatstack-library   → app principal (Library + licença)
/opt/beatstack-license   → README + scripts (domínio license.*)
```

Deploy: `bash scripts/deploy-manager-license-vps.sh`
