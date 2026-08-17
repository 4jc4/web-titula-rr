# Runbook de deploy

Checklist para subir o `web-titula-rr` no app server (`20.50.2.223`), ao lado
do container da `api-titula-rr`.

> **Nada disto foi executado ainda.** Ao contrário do runbook da API, este
> documento descreve uma infraestrutura que **ainda não existe** — foi escrito
> sem acesso ao servidor real (nem SSH, nem ao Nginx em `20.50.2.213`).
> Trate cada seção como um roteiro a seguir e confirmar, não como algo já
> validado em produção. Onde o texto extrapola (nome de pastas, arquivos de
> config) em cima do que o runbook da API deixa documentado, isso está
> marcado explicitamente.

`cd.yml` já existe no repositório e dispara sozinho a cada CI verde no
`main` — mas até a seção 1 estar completa, ele só vai falhar logo no
primeiro passo (`test -d /opt/titula-rr/web`). Rodar a seção 1 inteira
**antes** do primeiro push que dispare o CD, ou usar `workflow_dispatch`
manualmente só depois de terminar.

---

## 1. Pré-requisitos (uma vez só)

- [ ] **Runner self-hosted registrado especificamente para este
      repositório.** Runners do GitHub Actions são por repositório — o
      runner que já atende `4jc4/api-titula-rr` (labels `self-hosted`,
      `titula-rr-prod`) **não** atende `4jc4/web-titula-rr` automaticamente,
      mesmo rodando na mesma máquina física. É preciso uma segunda instância
      do runner, registrada neste repo, com os mesmos labels (`cd.yml` usa
      `runs-on: [self-hosted, titula-rr-prod]`):

  ```sh
  # No servidor, num diretório NOVO — não reaproveitar o da API
  # (nome exato do diretório da API não confirmado; adapte se for diferente)
  mkdir -p /opt/actions-runner-web && cd /opt/actions-runner-web

  # Token e comando de download exatos: GitHub → repositório web-titula-rr →
  # Settings → Actions → Runners → New self-hosted runner. O token expira em
  # ~1h — gerar na hora de rodar isto, não usar um velho.
  # (o site já monta o ./config.sh --url ... --token ... certo, copiar de lá)

  ./config.sh --url https://github.com/4jc4/web-titula-rr \
    --token <TOKEN-GERADO-NA-HORA> \
    --labels self-hosted,titula-rr-prod \
    --name titula-rr-web-runner \
    --unattended

  sudo ./svc.sh install
  sudo ./svc.sh start
  ```

  Confirmar com `sudo ./svc.sh status` e, no GitHub, que o runner aparece
  "Idle" em Settings → Actions → Runners do repositório.

- [ ] **Rede Docker `titula-rr-net` já existe** (criada pelo setup da API —
      ver seção 1 do [runbook de lá](https://github.com/4jc4/api-titula-rr/blob/main/docs/DEPLOY.md)).
      Só confirmar, **não recriar**:

  ```sh
  docker network inspect titula-rr-net
  ```

- [ ] **`/opt/titula-rr/web` existe**, com um `docker-compose.yml` (pode ser
      cópia do deste repositório — o primeiro `cd.yml` que rodar substitui
      pelo real via `rsync`) e um `.env` de verdade (seção 2). Precisa
      existir **antes** do primeiro deploy: o passo "Validate deployment
      environment" do `cd.yml` confere os dois arquivos logo no início,
      antes até do `rsync`.

  ```sh
  mkdir -p /opt/titula-rr/web
  # copiar docker-compose.yml de um checkout do repo, ou do passo 3.1 abaixo
  ```

- [ ] **Nginx (`20.50.2.213` — máquina SEPARADA do app server) roteando pro
      frontend.** Isto eu não tenho como confirmar nem escrever com certeza
      — não vi o vhost real. O que precisa existir, adaptado ao arquivo de
      verdade (provavelmente o mesmo vhost que já roteia `/api` pra API):

  ```nginx
  # ADICIONAR ao vhost existente — não substituir o que já roteia /api.
  # /api continua indo pra 20.50.2.223:3000 (api-titula-rr); tudo o mais
  # (raiz, /login, /admin, /status, os assets do Next) vai pro frontend.
  location / {
      proxy_pass http://20.50.2.223:3001;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
  }
  ```

  Depois de editar: testar a sintaxe (`nginx -t`) antes de recarregar
  (`nginx -s reload` ou o equivalente do serviço). Conferir também a
  pendência já registrada no runbook da API (seção 6 de lá) sobre headers de
  segurança duplicados/divergentes — vale checar se o vhost novo do
  frontend tem o mesmo problema antes de dar como resolvido dos dois lados.

---

## 2. Segredos

Bem mais simples que a API — este app não guarda credencial nenhuma (nem
AD, nem banco). Só uma variável:

| Variável           | Valor em produção                                                              |
| ------------------ | ------------------------------------------------------------------------------ |
| `API_INTERNAL_URL` | `http://titula-rr-api:3000` — nome do container da API na rede `titula-rr-net` |

`PORT` não precisa ser definido (default 3000 dentro do container — é o que
`docker-compose.yml` espera; o host mapeia pra 3001 por fora).

```sh
echo 'API_INTERNAL_URL=http://titula-rr-api:3000' > /opt/titula-rr/web/.env
```

---

## 3. Deploy

> O CD automático (`cd.yml`) cobre 3.1 e 3.2 a cada push aprovado no
> `main`, com health check e rollback. Só roda esta seção à mão fora desse
> fluxo — primeiro deploy, ou depuração direto no servidor.

### 3.1 Build

```sh
cd /opt/titula-rr/web
git pull   # ou o rsync que o cd.yml faz, se não houver checkout git ali
docker compose build
```

### 3.2 Subir

Sem passo de migração — diferente da API, este app não tem banco próprio.

```sh
docker compose up -d
```

---

## 4. Verificação pós-deploy

- [ ] **Liveness responde, direto no container** — nunca depende da API:

  ```sh
  curl -s http://127.0.0.1:3001/healthz
  # esperado: {"status":"ok"}
  ```

- [ ] **Status reflete a API de verdade**:

  ```sh
  curl -s http://127.0.0.1:3001/status | grep -o 'Operacional\|Degradado\|Fora do ar'
  ```

  Se vier "Fora do ar" aqui mas a API está saudável (`curl
http://127.0.0.1:3000/api/health` no mesmo servidor), o problema é
  `API_INTERNAL_URL` ou a rede `titula-rr-net` — não o Nginx.

- [ ] **Pelo domínio público, através do Nginx** — prova que o vhost da
      seção 1 está roteando certo:

  ```sh
  curl -s https://<host>/login -o /dev/null -w "status:%{http_code}\n"
  curl -s https://<host>/api/health | jq   # confirma que /api ainda vai pra API
  ```

- [ ] **`docker compose ps`** mostra o container `healthy` (não só
      `running`) depois do `start_period` de 20s.

- [ ] **Logs sem erro inesperado** — `docker compose logs -f web`.

---

## 5. Rollback

Mesmo esquema de 2 gerações da API — `cd.yml` já automatiza o 1º nível
(reverte sozinho se o health check pós-deploy falhar). Manual, 2º nível:

```sh
cd /opt/titula-rr/web
docker tag titula-rr-web:rollback-2 titula-rr-web:local
docker compose up -d --no-deps web
curl -s http://127.0.0.1:3001/healthz
```

Além de 2 níveis, volta pelo git:

```sh
docker compose down
git checkout <commit-anterior>
docker compose build
docker compose up -d
```

Sem estado nenhum pra perder (o app não tem banco) — rollback aqui é mais
simples que o da API, não tem migração pra se preocupar em desfazer.

---

## 6. Pendências conhecidas

- [ ] **Toda a seção 1 ainda precisa ser executada** — runner, diretório,
      `.env`, vhost do Nginx. `cd.yml` existe no repositório desde que este
      runbook foi escrito, mas nunca rodou contra o servidor real.
- [ ] **Vhost do Nginx**: conteúdo exato acima é um roteiro, não uma cópia
      do arquivo real — precisa ser adaptado (e testado com `nginx -t`) por
      quem tiver acesso a `20.50.2.213`.
- [ ] **Nome/caminho do runner da API** não confirmado — o comando da seção
      1 assume `/opt/actions-runner-web` como análogo a como a API deve
      estar organizada; ajustar se o padrão real for outro.

---

## Referência rápida

- Topologia e variáveis de rede: [`docker-compose.yml`](../docker-compose.yml)
- Build da imagem: [`Dockerfile`](../Dockerfile)
- Deploy automático: [`.github/workflows/cd.yml`](../.github/workflows/cd.yml)
  (cabeçalho do arquivo tem o mesmo checklist da seção 1, resumido)
- Runbook da API (rede `titula-rr-net`, conta de serviço do AD, segredos
  dela): [`docs/DEPLOY.md`](https://github.com/4jc4/api-titula-rr/blob/main/docs/DEPLOY.md)
  no repositório `api-titula-rr`
