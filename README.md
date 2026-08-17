# web-titula-rr

Frontend do **Titula RR**, sistema de regularização fundiária do governo do
Estado de Roraima. Next.js 16 (App Router, TypeScript) consumindo a
[`api-titula-rr`](https://github.com/4jc4/api-titula-rr) — sessão opaca em
cookie `httpOnly` (sem JWT), rodando na mesma intranet do governo, mesma
origem que a API via Nginx.

Decisões de arquitetura e convenções: [`CLAUDE.md`](./CLAUDE.md).

## Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS 4**
- **orval**: gera tipos e cliente HTTP a partir do OpenAPI da
  `api-titula-rr` (`/api/docs-json`) — fonte única do contrato, nunca
  editado à mão (`lib/api/generated/`)
- **react-hook-form + zod**: formulários
- **@tanstack/react-query**: estado de servidor no cliente (paginação,
  mutations)

## Requisitos

- Node.js **>= 24**
- A [`api-titula-rr`](https://github.com/4jc4/api-titula-rr) rodando em
  paralelo — este frontend não funciona sozinho, ele é cliente da API.

## Rodando localmente

```bash
# terminal 1 — no repositório da api-titula-rr
AUTH_VALIDATOR=fake npm run start:dev    # porta 3000

# terminal 2 — aqui
cp .env.example .env.local
npm install
npm run dev                               # http://localhost:3001
```

Com `AUTH_VALIDATOR=fake` na API, o login usa usuários fixos de
desenvolvimento (`dev.gestor`, `dev.admin`, `dev.titulacao`, todos com
senha `dev`) — sem precisar de Active Directory nenhum.

## Comandos

| Comando             | O que faz                                               |
| ------------------- | ------------------------------------------------------- |
| `npm run dev`       | Next em watch mode, porta 3001                          |
| `npm run build`     | build de produção                                       |
| `npm start`         | serve o build de produção                               |
| `npm run lint`      | eslint                                                  |
| `npm run format`    | prettier                                                |
| `npm run typecheck` | `next typegen` + `tsc --noEmit`                         |
| `npm run codegen`   | regenera `lib/api/generated` a partir do OpenAPI da API |
| `npm test`          | testes unitários (Vitest)                               |
| `npm run test:e2e`  | e2e (Playwright) contra a API real                      |

## Testes

Unitário (`npm test`) não precisa da API. E2e (`npm run test:e2e`) precisa
— e precisa dela subida com **`NODE_ENV=test` além de `AUTH_VALIDATOR=fake`**:

```bash
NODE_ENV=test AUTH_VALIDATOR=fake npm run start:dev
```

Sem `NODE_ENV=test` a suíte esbarra no rate limit de login da API (5/min)
no meio dos specs — ver `CLAUDE.md` para o porquê.

## Docker (imagem de produção)

```bash
docker build -t web-titula-rr:local .
```

Build multi-stage com `output: 'standalone'` (`next.config.ts`) — a mesma
imagem é buildada no CI (`docker-image` job), que sobe um container real e
confere `/healthz` (nunca toca a API — só confirma que o processo Next em
si está de pé) e que `/status` degrada graciosamente em vez de 500 quando
a API está inalcançável.

`docker-compose.yml` entra na mesma rede Docker externa que a
`api-titula-rr` já usa (`titula-rr-net`) — alcança a API por
`http://titula-rr-api:3000`, o nome do container dela.

**Deploy automático (`cd.yml`) já rodou de ponta a ponta contra o servidor
de produção real** — runner instalado no mesmo padrão da API, deploy
automático confirmado com sucesso. Falta só o vhost do Nginx (roteamento
pelo domínio) — runbook completo: [`docs/DEPLOY.md`](./docs/DEPLOY.md).

## Por que a porta 3001

A API roda na 3000 por padrão. `next.config.ts` reescreve `/api/*` para
`API_INTERNAL_URL` (a API) — assim o navegador enxerga uma origem só, sem
precisar de CORS nem de configuração extra, mesmo em dev com dois
processos separados.

Commit sempre em branch — nunca direto em `main`. PRs squash-merged.
