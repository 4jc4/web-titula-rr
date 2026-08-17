# Runbook de deploy

Checklist para subir o `web-titula-rr` no app server (`20.50.2.223`), ao lado
do container da `api-titula-rr`.

> **Seção 1 concluída em 17/08/2026, exceto o vhost do Nginx.** Runner
> instalado, diretório e `.env` prontos, e o `cd.yml` já rodou **de ponta a
> ponta com sucesso** contra o servidor real (`workflow_dispatch`, build,
> deploy, health check — tudo verde). O único item que falta é o vhost do
> Nginx em `20.50.2.213`, uma máquina que ninguém envolvido neste runbook
> teve acesso SSH até agora — sem ele, o container está de pé e responde
> (`/healthz`, `/status`) mas **ninguém consegue abrir o frontend num
> navegador pelo domínio**. Ver a pendência única na seção 6.

`cd.yml` dispara sozinho a cada CI verde no `main`.

---

## 1. Pré-requisitos (uma vez só)

- [x] **Runner self-hosted registrado especificamente para este
      repositório.** Runners do GitHub Actions são por repositório — o
      runner que atende `4jc4/api-titula-rr` não atende
      `4jc4/web-titula-rr` automaticamente, mesmo na mesma máquina física.

  Instalado espelhando **exatamente** o padrão da API: mesmo usuário de
  serviço (`gh-runner`, sem sudo, grupos `docker`+`titula-deploy`), mesmo
  tipo de unidade systemd (serviço de **sistema**, não de usuário — o que
  importa aqui, porque `gh-runner` não tem sudo pra instalar um serviço de
  usuário com `loginctl enable-linger` de qualquer forma).

  ```sh
  # como gh-runner (precisa da chave SSH dele nos authorized_keys)
  mkdir -p /home/gh-runner/actions-runner-web
  cd /home/gh-runner/actions-runner-web

  # reaproveitar o pacote já baixado pelo runner da API poupa banda —
  # mesma versão, sem precisar rebaixar 215MB:
  cp /home/gh-runner/actions-runner/actions-runner-linux-x64-2.336.0.tar.gz .
  tar xzf actions-runner-linux-x64-2.336.0.tar.gz
  rm actions-runner-linux-x64-2.336.0.tar.gz

  # token: GitHub → repositório web-titula-rr → Settings → Actions →
  # Runners → New self-hosted runner. Expira em ~1h.
  ./config.sh --url https://github.com/4jc4/web-titula-rr \
    --token <TOKEN-GERADO-NA-HORA> \
    --labels self-hosted,titula-rr-prod \
    --name titula-rr-web-app-server \
    --work _work \
    --unattended
  ```

  A instalação do serviço em si **exige root** (`gh-runner` não tem sudo —
  de propósito, é uma conta de serviço). Só esta parte precisa de alguém
  com sudo na máquina; passar o usuário-alvo explícito, senão o serviço
  fica registrado pra rodar como quem chamou o `sudo` (ex.: `nti`), não
  como `gh-runner`:

  ```sh
  # como um usuário COM sudo (ex.: nti) — repare o "cd && comando" dentro
  # de um `sudo bash -c '...'` só, não um `cd` solto antes: nti não tem
  # permissão nem pra ENTRAR em /home/gh-runner sem já estar como root
  sudo bash -c 'cd /home/gh-runner/actions-runner-web && ./svc.sh install gh-runner'
  sudo bash -c 'cd /home/gh-runner/actions-runner-web && ./svc.sh start'
  sudo bash -c 'cd /home/gh-runner/actions-runner-web && ./svc.sh status'
  ```

  Resultado esperado: serviço
  `actions.runner.4jc4-web-titula-rr.titula-rr-web-app-server.service`,
  `enabled` + `active (running)`, e o runner aparecendo "Idle"/"online" em
  Settings → Actions → Runners do repositório — sem depender de sessão SSH
  nenhuma ficar aberta (diferente de um serviço `systemd --user`, que cai
  assim que a última sessão fecha, a menos que se ative
  `loginctl enable-linger`; serviço de sistema não tem esse problema).

- [x] **Rede Docker `titula-rr-net` já existe** (criada pelo setup da API).
      Confirmado, não precisou recriar.

- [x] **`/opt/titula-rr/web` existe**, com `docker-compose.yml` e `.env`
      (seção 2) — dono `nti` (mesmo usuário que faz o `rsync` no `cd.yml`).

- [ ] **Nginx (`20.50.2.213` — máquina SEPARADA do app server) roteando pro
      frontend.** Única pendência real — ver seção 6. Ninguém com este
      runbook em mãos teve acesso SSH a essa máquina; nem do app server
      (`20.50.2.223`) nem de fora dá pra alcançar a porta 22 dela (testado,
      timeout dos dois lados — é bloqueio de firewall, não falha de rede).
      O que precisa existir, adaptado ao vhost real (provavelmente o mesmo
      que já roteia `/api` pra API):

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

  Depois de editar: testar a sintaxe (`nginx -t`) antes de recarregar.
  Conferir também a pendência já registrada no runbook da API (seção 6 de
  lá) sobre headers de segurança duplicados/divergentes — vale checar se o
  vhost novo do frontend tem o mesmo problema antes de dar como resolvido
  dos dois lados.

---

## 2. Segredos

Bem mais simples que a API — este app não guarda credencial nenhuma (nem
AD, nem banco). Só uma variável, já seedada em produção:

| Variável           | Valor em produção                                                              |
| ------------------ | ------------------------------------------------------------------------------ |
| `API_INTERNAL_URL` | `http://titula-rr-api:3000` — nome do container da API na rede `titula-rr-net` |

`PORT` não precisa ser definido (default 3000 dentro do container — é o que
`docker-compose.yml` espera; o host mapeia pra 3001 por fora).

---

## 3. Deploy

O CD automático (`cd.yml`) cobre esta seção inteira a cada push aprovado no
`main` — **confirmado funcionando** (checkout, validação, sync, snapshot,
build, deploy, health check, tudo verde num `workflow_dispatch` real em
17/08/2026). Só rodar à mão fora desse fluxo — depuração direto no
servidor.

### 3.1 Build

```sh
cd /opt/titula-rr/web
git pull   # ou o rsync que o cd.yml faz
docker compose build
```

### 3.2 Subir

Sem passo de migração — diferente da API, este app não tem banco próprio.

```sh
docker compose up -d
```

---

## 4. Verificação pós-deploy

- [x] **Liveness responde, direto no container** — `curl
  http://127.0.0.1:3001/healthz` → `{"status":"ok"}`. Confirmado.

- [x] **Status reflete a API de verdade** — `curl
  http://127.0.0.1:3001/status` mostrando "Operacional" com dado real
      (uptime, banco conectado) vindo da `api-titula-rr` pela rede
      `titula-rr-net`. Confirmado.

- [ ] **Pelo domínio público, através do Nginx** — ainda não dá pra
      verificar (pendência da seção 1):

  ```sh
  curl -s https://titula.intranet.iteraima.rr.gov.br/login -o /dev/null -w "status:%{http_code}\n"
  curl -s https://titula.intranet.iteraima.rr.gov.br/api/health | jq   # confirma que /api ainda vai pra API
  ```

- [x] **`docker compose ps`** mostrou `healthy` depois do `start_period`.

- [ ] **Logs sem erro inesperado** — `docker compose logs -f web` (checar
      depois de um deploy de verdade via push no `main`, não só o manual).

---

## 5. Rollback

Mesmo esquema de 2 gerações da API. **`titula-rr-web:rollback` já existe**
(snapshot tirado no primeiro deploy automático real) — o próximo deploy que
falhar no health check já tem pra onde reverter sozinho.

Manual, 2º nível (só existirá depois de um segundo deploy):

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

- [ ] **Vhost do Nginx (`20.50.2.213`)** — única coisa que falta pro
      frontend ser acessível de verdade pelo domínio. Ninguém com acesso a
      este runbook alcançou essa máquina (porta 22 bloqueada tanto do app
      server quanto de fora). O trecho de config na seção 1 é um roteiro
      pra adaptar, não uma cópia do arquivo real.

- [x] ~~Todo o resto da seção 1~~ — runner, diretório, `.env`, e um deploy
      automático real, todos confirmados em 17/08/2026.

- **Nota operacional**: durante a configuração inicial, o `cd.yml` falhou
  repetidas vezes no passo "Set up job" com `429 Too Many Requests` do
  `codeload.github.com` (download da action `actions/checkout`). Não era
  bug de configuração — rate limit do lado do GitHub pro IP do servidor,
  provavelmente por causa do volume de chamadas de API/git feitas durante
  o próprio setup (registrar/desregistrar runner, clones de teste, várias
  tentativas em sequência). Resolveu sozinho depois de esperar. Se
  acontecer de novo num deploy real: **não ficar re-tentando em sequência
  rápida** (piora); esperar alguns minutos e tentar de novo. Copiar
  `_work/_actions` de um runner que já tem a action em cache **não**
  resolve — o runner ainda tenta rebaixar do zero mesmo assim.

---

## Referência rápida

- Topologia e variáveis de rede: [`docker-compose.yml`](../docker-compose.yml)
- Build da imagem: [`Dockerfile`](../Dockerfile)
- Deploy automático: [`.github/workflows/cd.yml`](../.github/workflows/cd.yml)
- Runbook da API (rede `titula-rr-net`, conta de serviço do AD, segredos
  dela): [`docs/DEPLOY.md`](https://github.com/4jc4/api-titula-rr/blob/main/docs/DEPLOY.md)
  no repositório `api-titula-rr`
