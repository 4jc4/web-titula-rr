# Runbook

O que fazer quando algo quebra, e como conferir que não quebrou. Para o
desenho do sistema, ver [`architecture.md`](./architecture.md); para as
máquinas, [`infrastructure.md`](./infrastructure.md).

## Verificação pós-deploy

Direto no app server, sem passar pelo Nginx:

```bash
curl -sS http://127.0.0.1:3001/healthz          # {"status":"ok"}
curl -sS http://127.0.0.1:3001/status | head -5 # deve mencionar "Operacional"
docker compose -f /opt/titula-rr/web/docker-compose.yml ps
```

Pelo domínio, de qualquer máquina do domínio (o `--resolve` aponta para o
próprio proxy porque `127.0.0.1` cairia no `deny all` da ACL de intranet):

```bash
FQDN=titula.intranet.iteraima.rr.gov.br
curl -sSI --resolve "$FQDN:443:20.50.2.213" "https://$FQDN/login" \
  | grep -Ei 'HTTP/|strict-transport|referrer-policy|x-frame|x-content-type'
```

Esperado: `HTTP/2 200` e **uma cópia de cada** header de segurança, vindos do
snippet do Nginx. Se vierem duas, o include do snippet voltou ao nível `server`
do vhost; se não vier nenhuma, o include sumiu do `location /` — nos dois casos
ver [`infrastructure.md`](./infrastructure.md).

## Rollback

Automático no CD quando o health check falha, com duas gerações de imagem.
Manual, segundo nível:

```bash
cd /opt/titula-rr/web
docker tag titula-rr-web:rollback-2 titula-rr-web:local
docker compose up -d --no-deps web
curl -sS http://127.0.0.1:3001/healthz
```

Além de dois níveis, volta pelo git:

```bash
cd /opt/titula-rr/web
docker compose down
git checkout <commit-anterior>
docker compose build && docker compose up -d
```

Não há estado a perder — este app não tem banco, e não há migração para
desfazer.

## Rodar o e2e localmente

Precisa de **dois terminais**: o Playwright sobe o frontend sozinho, mas nunca
a API.

```bash
# terminal 1 — no repositório da api-titula-rr
NODE_ENV=test AUTH_VALIDATOR=fake \
DATABASE_URL=postgresql://cardoso:iteraima@localhost:5433/titularr_test \
npm run start:dev
```

```bash
# terminal 2 — aqui
API_INTERNAL_URL=http://localhost:3000 npm run test:e2e
```

Confirme que a API subiu antes de rodar: `curl -sS
http://localhost:3000/api/health`. Vale o cuidado porque o modo de falha é
enganoso — **com a API fora do ar, oito dos nove testes falham**, cada um com
uma mensagem diferente e nenhuma delas dizendo "a API não está no ar". O único
que passa é justamente o que não fala com ela ("sem sessão, / redireciona pro
login"). Se o placar for 8 falhas e 1 passe, olhe o terminal 1 antes de olhar o
código.

`NODE_ENV=test` no terminal 1 não é decoração: é o que desliga o throttle de
login da API (5/min). Sem ele a suíte começa a falhar no meio com 429
silenciosos, o que se parece exatamente com sessão quebrada.

## Ler uma falha de CI

O `e2e-tests` usa o reporter `github` do Playwright, então cada falha vira
**anotação** do Actions, com arquivo, linha e mensagem — visível na própria
página do PR e pela API do GitHub.

Isso importa porque o **texto completo** do log fica num blob da Azure, fora do
alcance de quem lê o repositório pela API do GitHub: sem as anotações, tudo que
chega é `Process completed with exit code 1`. Se um dia as anotações sumirem, é
sinal de que alguém tirou o reporter.

O relatório HTML do Playwright continua sendo enviado como artefato, mas só em
caso de falha.

## Diagnóstico rápido

| Sintoma                                          | Causa provável                                                                            |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Deploy falha no `rsync` com `Permission denied`  | `/opt/titula-rr/web` fora do grupo `titula-deploy` com `setgid` — ver `infrastructure.md` |
| `/status` mostra "Fora do ar" e o resto funciona | é a API que caiu, não este app — vá para o runbook da `api-titula-rr`                     |
| Login não completa e nada aparece                | API fora do ar, ou `API_INTERNAL_URL` errado no `.env`                                    |
| Cookie de sessão descartado pelo navegador       | o cookie é `Secure`: o TLS não está terminando no Nginx                                   |
| 8 de 9 testes e2e falhando localmente            | a API não está rodando no terminal 1                                                      |
| Link de navegação leva a "Acesso restrito"       | o gate de `lib/session/papeis.ts` divergiu da matriz da API — releia os dois lados        |
| Headers duplicados em `/api/`                    | o include do snippet voltou ao nível `server` do vhost                                    |

## Pendências conhecidas

Registradas para não se perderem, não porque são urgentes. A análise completa,
com as consequências de cada uma, está publicada à parte.

- [ ] **As fixtures do validador fake não têm guarda.** O job `contrato` do CI
      cobre os tipos que vêm do OpenAPI; os nomes de `dev.gestor` e companhia
      continuam sendo contrato informal entre os dois repositórios. Um teste do
      lado da API que falhe ao renomear uma fixture avisaria quem faz a
      mudança — que é quem pode agir.
- [ ] **`M-01` — `SESSION_COOKIE` duplicado à mão** entre os dois
      repositórios.
- [ ] **`M-03` — o CI sobe a API em modo watch** (`start:dev`), o que num
      runner efêmero é desperdício e fonte de instabilidade.
