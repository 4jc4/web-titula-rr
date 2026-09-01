# Infraestrutura

As máquinas onde este frontend roda. Para como o código chega nelas, ver
[`deployment.md`](./deployment.md); para operá-lo depois,
[`runbook.md`](./runbook.md).

A infraestrutura é compartilhada com a `api-titula-rr` — mesma rede Docker,
mesmo runner, mesmo vhost. O que está descrito aqui é a **fatia do frontend**;
o resto vive em
[`infrastructure.md`](https://github.com/4jc4/api-titula-rr/blob/main/docs/infrastructure.md)
no repositório da API.

## Topologia

| Host                                  | Papel                                      |
| ------------------------------------- | ------------------------------------------ |
| `20.50.2.223`                         | App server — container `titula-rr-web`     |
| `20.50.2.213`                         | Nginx — TLS e o vhost que roteia o domínio |
| runner self-hosted (`titula-rr-prod`) | executa o CD, na própria `20.50.2.223`     |

```
navegador → Nginx (20.50.2.213) ─┬── /      → :3001 do app server (Next)
                                 └── /api/  → :3000 do app server (API)
```

O navegador nunca fala com a API diretamente: tudo é mesma origem, e é o Nginx
que separa. Quando o Next precisa de dado no servidor, ele chama a API por
`http://titula-rr-api:3000` pela rede Docker interna, sem passar pelo Nginx.

## App server — `20.50.2.223`

- Deploy em **`/opt/titula-rr/web`**: cópia autocontida com `Dockerfile`,
  `docker-compose.yml` e o `.env` (nunca versionado).
- Compose com `name: titula-rr-web`, publicando **`3001:3000`** — o container
  escuta 3000 internamente; quem separa API e web no host é o mapeamento.
- Rede Docker **externa** `titula-rr-net`, a mesma da API. É ela que faz
  `http://titula-rr-api:3000` resolver pelo DNS interno do Docker, sem IP nem
  configuração extra.
- Healthcheck do compose aponta para `/healthz`, **não** para `/status`: a API
  cair não deve derrubar este container, que não tem nada de errado por si só.
- Logs em `json-file` com rotação (`max-size: 10m`, `max-file: 5`).

### Permissões do diretório de deploy

O diretório precisa pertencer ao grupo **`titula-deploy`**, com escrita de
grupo e **`setgid`**:

```
drwxrwsr-x  nti titula-deploy  /opt/titula-rr/web
```

O runner roda como `gh-runner`, que é membro desse grupo. O `setgid` faz todo
arquivo novo herdar o grupo — sem ele, o deploy seguinte encontra arquivos que
ele mesmo não consegue substituir.

Isto não é detalhe teórico: até 01/09/2026 o diretório estava em `nti:nti`, e o
CD falhava no `rsync` com `Permission denied` em cada arquivo. Os arquivos eram
de 17/08 e pertenciam a `nti`, não ao runner — o diretório tinha sido povoado à
mão, e nunca havia recebido um deploy de verdade. Ninguém percebeu por quinze
dias porque o frontend não voltou a deployar nesse período.

O `.env` fica em `640` (`nti:titula-deploy`), nunca legível por outros usuários
da máquina.

## Nginx — `20.50.2.213`

Máquina **separada** do app server. O vhost é
`/etc/nginx/sites-available/titula-intranet.conf`, com `server_name
titula.intranet.iteraima.rr.gov.br`, e é compartilhado com a API:

```nginx
location /api/ {
    proxy_pass http://20.50.2.223:3000;
    include snippets/proxy-common.conf;
}

location / {
    proxy_pass http://20.50.2.223:3001;
    include snippets/proxy-common.conf;
    proxy_buffering off;
    include snippets/security-headers.conf;
}
```

Dois cuidados aqui, e os dois já foram pagos:

- **`proxy_buffering off` só no `location /`.** O streaming do App Router —
  resposta parcial conforme cada Server Component resolve — fica preso atrás do
  buffer do Nginx sem isso. O bloco `/api/` não precisa: é JSON, resposta
  única.
- **O include dos headers de segurança fica DENTRO do `location /`**, não no
  nível `server`. O snippet é compartilhado com GLPI, Portainer e SSI; se
  subisse para o `server`, o `/api/` voltaria a herdá-lo e duplicaria os
  headers que o `helmet()` da API já envia — foi o achado R-08 da análise da
  API, corrigido em 01/09/2026. Este frontend **depende** desse include: o Next
  não emite esses headers sozinho.

O acesso é restrito por `snippets/intranet-acl.conf` (`allow 20.50.0.0/16; deny
all;`) e o TLS usa o wildcard `*.intranet.iteraima.rr.gov.br` emitido pela CA
corporativa, que **não** renova sozinho — o workflow de invariantes da API
vigia a validade dele.

## Runner de CI/CD

Runners do GitHub Actions são **por repositório**: o runner que atende
`api-titula-rr` não atende este automaticamente, mesmo na mesma máquina
física. Há um registro próprio,
`actions.runner.4jc4-web-titula-rr.titula-rr-web-app-server`, instalado como
serviço de **sistema** (não de usuário) sob a mesma conta `gh-runner`, com os
labels `self-hosted` e `titula-rr-prod`.

Serviço de usuário cairia quando a última sessão SSH fechasse, a menos de
`loginctl enable-linger` — serviço de sistema não tem esse problema.

## Portas

| Origem     | Destino             | Porta | Para quê                    |
| ---------- | ------------------- | ----- | --------------------------- |
| navegador  | Nginx `20.50.2.213` | 443   | HTTPS                       |
| Nginx      | app server          | 3001  | proxy para o Next           |
| Nginx      | app server          | 3000  | proxy para a API            |
| Next (SSR) | container da API    | 3000  | `http://titula-rr-api:3000` |

## Variáveis de ambiente

Este app não guarda credencial nenhuma — nem de AD, nem de banco. Uma
variável só:

| Variável           | Produção                                                       |
| ------------------ | -------------------------------------------------------------- |
| `API_INTERNAL_URL` | `http://titula-rr-api:3000` — nome do container na rede Docker |

`PORT` não precisa ser definido: o default 3000 dentro do container é o que o
compose espera.
