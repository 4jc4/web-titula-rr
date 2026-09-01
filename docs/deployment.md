# Deploy

Como o código chega em produção. Para as máquinas, ver
[`infrastructure.md`](./infrastructure.md); para o que fazer quando algo dá
errado depois, [`runbook.md`](./runbook.md).

**Desde 17/08/2026 o deploy é automático.** Todo push aprovado pelo CI no
`main` dispara o CD. `workflow_dispatch` continua disponível para redeploy
manual — foi por ele que a correção de 01/09 subiu, depois de a primeira
tentativa falhar por permissão no diretório de destino.

## 1. Integração contínua

[`ci.yml`](../.github/workflows/ci.yml) roda em todo push e PR para o `main`,
em cinco jobs:

| Job                   | O que faz                                                                      |
| --------------------- | ------------------------------------------------------------------------------ |
| `lint`                | `eslint --max-warnings=0`                                                      |
| `typecheck-and-build` | `next typegen` + `tsc --noEmit`, e `next build`                                |
| `unit-tests`          | Vitest                                                                         |
| `e2e-tests`           | Playwright contra a `api-titula-rr` **de verdade**, subida no próprio runner   |
| `docker-image`        | builda a imagem de produção, sobe o container e confere `/healthz` e `/status` |

Dois deles merecem explicação.

O **`e2e-tests`** faz checkout do repositório irmão `4jc4/api-titula-rr` num
subdiretório, aplica as migrações num Postgres de serviço e sobe a API com
`AUTH_VALIDATOR=fake` e `NODE_ENV=test` — o segundo desliga o throttle de
login, sem o qual a suíte esbarra no limite de 5/min de tanto logar. Como o
checkout é do branch padrão da API **sem `ref:` fixado**, uma mudança lá pode
deixar vermelho um PR daqui que não encostou em nada. Isso é o mecanismo que
detecta divergência de contrato — mas hoje é acidental, não escolhido: ver
`R-04` na análise.

O **`docker-image`** sobe o container com `API_INTERNAL_URL` apontando para o
vazio, de propósito, e exige que `/status` devolva 200 mostrando "Fora do ar".
É teste do cenário ruim: prova que a queda da API degrada a tela em vez de
derrubá-la com 500.

O título do PR é validado à parte contra Conventional Commits
([`pr-title.yml`](../.github/workflows/pr-title.yml)) — PRs são squash-merged e
o título vira a mensagem do commit no `main`.

### Dívida conhecida nos workflows

O endurecimento que a `api-titula-rr` recebeu **ainda não foi transplantado
para cá**: faltam `permissions:` declarado, `concurrency` no CI,
`timeout-minutes` nos jobs, e as actions estão em tag flutuante (`@v7`, `@v4`)
em vez de SHA fixado. É o achado `R-03`, e o trabalho já foi feito uma vez do
outro lado — cabe quase por cópia. O `e2e-tests` também roda a API contra
PostgreSQL 17 enquanto produção é 16 (`R-02`).

## 2. Entrega contínua

[`cd.yml`](../.github/workflows/cd.yml) dispara por `workflow_run` quando o CI
termina com sucesso no `main`, no runner self-hosted.

Sequência:

1. **Checkout do `head_sha`** que o CI aprovou — não do HEAD do `main` no
   momento em que o CD roda, que pode já ter avançado.
2. **Validação do ambiente**: diretório de deploy, `.env` presente, docker
   vivo.
3. **Sync** com `rsync --delete`, preservando `.env`, `.git/`, `node_modules/`
   e `.next/`.
4. **Snapshot**: `:rollback` vira `:rollback-2`, e a imagem em produção vira
   `:rollback`. Duas gerações.
5. **Build** da imagem.
6. **`docker compose up -d --no-deps web`**.
7. **Health check** — até 30 tentativas em `http://127.0.0.1:3001/healthz`.
8. **Rollback automático** se o health check falhar: retagueia `:rollback` para
   `:local`, sobe de novo e reconfere. O job continua marcado como falho,
   porque a versão nova não foi ao ar.

Não há passo de migração nem de backup, e isso é correto: este app não tem
banco. O rollback aqui é mais simples que o da API justamente por isso — não há
schema para desfazer.

## 3. Antes do primeiro deploy de um servidor novo

Feito uma vez, em 17/08/2026. Registrado porque um servidor novo vai precisar
de novo.

- **Runner registrado para este repositório.** Runners são por repositório —
  ver [`infrastructure.md`](./infrastructure.md). A instalação do serviço em si
  exige root, e o usuário-alvo precisa ser passado explicitamente, senão o
  serviço fica registrado para rodar como quem chamou o `sudo`:

  ```sh
  sudo bash -c 'cd /home/gh-runner/actions-runner-web && ./svc.sh install gh-runner'
  sudo bash -c 'cd /home/gh-runner/actions-runner-web && ./svc.sh start'
  ```

- **Rede `titula-rr-net` existindo** (criada pelo setup da API, não recriar).

- **`/opt/titula-rr/web` com o grupo e as permissões certas** — grupo
  `titula-deploy`, escrita de grupo, `setgid`, e `.env` em `640`. Este é o
  passo que ficou faltando em 17/08 e só apareceu quinze dias depois, quando o
  CD tentou escrever ali pela primeira vez:

  ```sh
  sudo chgrp -R titula-deploy /opt/titula-rr/web
  sudo chmod -R g+w /opt/titula-rr/web
  sudo find /opt/titula-rr/web -type d -exec chmod g+s {} +
  sudo chmod 640 /opt/titula-rr/web/.env
  ```

- **Vhost do Nginx roteando o domínio** — ver
  [`infrastructure.md`](./infrastructure.md).

## 4. Segredos

Um só: `API_INTERNAL_URL`. Este app não guarda credencial de AD nem de banco —
ver [`infrastructure.md`](./infrastructure.md).

## 5. Uma armadilha já paga

Durante a configuração inicial, o CD falhou repetidas vezes no passo "Set up
job" com **`429 Too Many Requests`** do `codeload.github.com`, baixando a
action `actions/checkout`. Não era bug de configuração: rate limit do lado do
GitHub para o IP do servidor, provavelmente pelo volume de chamadas do próprio
setup. Se acontecer num deploy real, **não fique re-tentando em sequência
rápida** — piora. Espere alguns minutos. Copiar `_work/_actions` de um runner
que já tenha a action em cache não resolve; o runner rebaixa do zero mesmo
assim.
