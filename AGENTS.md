<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# web-titula-rr

Frontend do **Titula RR** (regularização fundiária, governo de Roraima).
Next.js 16 (App Router) consumindo a `api-titula-rr` (NestJS, repositório
irmão) — sessão opaca em cookie, sem JWT, sem estado de auth próprio do
Next. O que segue registra as decisões que não estão óbvias olhando só pro
código.

## O que este app NÃO decide sozinho

A sessão, o RBAC e o formato de erro são inteiramente da API. Ver o guia
completo (arquitetura, stack, roteiro de fases) publicado como artifact na
conversa que criou este repositório — aqui vai só o que muda ao ler o
código:

- **Cookie `session`** — `httpOnly`, `Secure` em produção, `SameSite=Strict`.
  Nome duplicado em `lib/session/constants.ts` (não dá pra importar um
  arquivo TS do outro repositório) — mudou `SESSION_COOKIE` em
  `auth.constants.ts` na API, muda aqui também.
- **RFC 7807** em todo erro — `lib/api/problem-details.ts` é o único parser,
  usado pelo mutator do cliente gerado (`lib/api/mutator.ts`) e por
  qualquer chamada manual do servidor.
- **RBAC** — a matriz papel→permissão não existe neste repositório. Nunca
  vai existir aqui: é decisão da API, refletida a cada `403`.

## Duas formas de falar com a API — não são intercambiáveis

1. **Do navegador** (Client Components, TanStack Query): caminho relativo
   (`/api/v1/...`), mesma origem — o cookie viaja sozinho. É o cliente
   gerado pelo orval (`lib/api/generated/`, nunca editar à mão —
   `npm run codegen`) mais `lib/api/mutator.ts`.
2. **Do servidor** (Server Components que precisam da sessão): a chamada
   sai do processo do Next, direto pra API pela rede interna (dev:
   `localhost:3000`; produção: nome do container Docker,
   `API_INTERNAL_URL`) — **contorna o rewrite/Nginx**, e por isso o cookie
   do request original precisa ser repassado à mão. É só
   `lib/session/current-user.ts::getCurrentUser()` — não existe em nenhum
   outro lugar, e o cliente gerado pelo orval NUNCA deve ser chamado do
   servidor (ele não sabe repassar cookie nenhum).

`proxy.ts` (nome do que era `middleware.ts` até o Next 15 — mudou no Next
16, função idêntica) faz só a checagem OTIMISTA de "existe cookie?" pra
redirecionar sem flash de tela. **Nunca** é a fronteira de segurança de
verdade — só a `SessionGuard` da API sabe se o token é válido. Por isso o
matcher exclui `/api/*`: um POST de login (que ainda não tem cookie
nenhum, por definição) não pode ser interceptado como se fosse navegação de
página.

## Login e logout são fetch do CLIENTE, não Server Action

A doc de auth do Next assume que o Next É o dono da sessão (cria, assina,
grava em `cookies()`). Aqui não: quem grava o `Set-Cookie` é a API. Se o
login rodasse como Server Action, o `Set-Cookie` da resposta chegaria no
**servidor** do Next, não no navegador — precisaria ser reserializado à mão
com `cookies().set(...)`, replicando flags que já existem certas do lado
de lá. Fazer o fetch direto do Client Component evita essa reimplementação:
a resposta do POST same-origin chega direto no navegador, que já salva o
cookie sozinho.

## Cache Components (PPR) — deliberadamente DESLIGADO

`next.config.ts` não liga `cacheComponents`. Praticamente toda página deste
app depende de `cookies()` (sessão) — não sobra shell estático que valha a
pena virar prerender compartilhado entre usuários. O modelo "anterior"
(dinâmico por padrão, sem exigir `<Suspense>` em volta de toda leitura de
cookie) é o certo aqui, não um esquecimento. Reavaliar se um dia existir
conteúdo público de verdade (ex.: uma página de status sem sessão) que
valha a pena cachear.

## Rodando local

Precisa da `api-titula-rr` rodando em paralelo (porta 3000,
`AUTH_VALIDATOR=fake` — usuários fixos em `fake-ad.validator.ts`:
`dev.gestor`/`dev.admin`/`dev.titulacao`, senha `dev`). O Next dev sobe em
**3001** (`next.config.ts` reescreve `/api/*` pra `API_INTERNAL_URL`,
default `localhost:3000`) — as duas portas nunca coincidem de propósito.

```bash
# terminal 1, no repo da API
AUTH_VALIDATOR=fake npm run start:dev

# terminal 2, aqui
npm run dev          # http://localhost:3001
npm run codegen      # regenera lib/api/generated a partir do /api/docs-json
```

## Estado atual

Fundação de auth funcionando de ponta a ponta contra a API real: login,
sessão lida no servidor via `getCurrentUser()`, logout, redirecionamento
otimista pelo `proxy.ts`. Nenhuma UI de domínio (título/processo) ainda —
espera os módulos correspondentes existirem na API. Próximos passos: casca
com gate por papel, módulo admin (`/admin/usuarios`, espelhando o que já
existe na API), testes (Vitest + Playwright), CI/CD espelhando os jobs do
backend.
