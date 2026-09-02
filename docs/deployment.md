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
deixar vermelho um PR daqui que não encostou em nada. Isso passou a ser
**deliberado** em 02/09/2026, fechando o `R-04`: é o único lugar que prova o
comportamento contra a API real, e fixar a ref o transformaria num teste
contra uma foto antiga. O job `contrato` cobre o lado dos tipos; este, o do
comportamento.

O **`contrato`** regenera `lib/api/generated` a partir do
`openapi/openapi.json` que a API versiona e falha se o resultado divergir do
que está commitado. É a resposta ao achado `R-01`: antes, uma divergência só
apareceria se algum dos nove testes e2e passasse por cima dela — foi assim que
o enum `Papel` ficou dois dias errado aqui. Se este job ficar vermelho, o
conserto é uma linha:
`ORVAL_API_URL=../api-titula-rr/openapi/openapi.json npm run codegen`.

O **`docker-image`** sobe o container com `API_INTERNAL_URL` apontando para o
vazio, de propósito, e exige que `/status` devolva 200 mostrando "Fora do ar".
É teste do cenário ruim: prova que a queda da API degrada a tela em vez de
derrubá-la com 500.

O título do PR é validado à parte contra Conventional Commits
([`pr-title.yml`](../.github/workflows/pr-title.yml)) — PRs são squash-merged e
o título vira a mensagem do commit no `main`.

### Convenções dos workflows

Alinhadas com a `api-titula-rr` desde 02/09/2026:

- **Toda action é fixada por SHA de commit**, com a versão no comentário ao
  lado. Tag é ponteiro móvel: quem controla `actions/checkout` pode reapontar
  `v7` a qualquer momento, e o CD roda num runner **dentro da intranet**, com
  o `.env` de produção ao lado. Para atualizar:
  `git ls-remote https://github.com/actions/checkout refs/tags/v7`.
- **`permissions: contents: read` em todo workflow.** O default do
  repositório é mais largo do que qualquer um deles precisa.
- **`timeout-minutes` em todo job.** Nos hospedados é higiene; no CD é
  necessidade — um job travado segura a nossa máquina, e o `concurrency` do CD
  não cancela. O default do GitHub é seis horas.
- **`concurrency`** com `cancel-in-progress` oposto nos dois lados: o CI
  cancela o run anterior da mesma ref, o CD não.

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
