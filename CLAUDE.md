@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working
with code in this repository.

## What this is

`web-titula-rr` is the frontend for **Titula RR**, the land-titling
(regularização fundiária) system for the Roraima state government (Brazil).
Next.js 16 (App Router, TypeScript) consuming
[`api-titula-rr`](https://github.com/4jc4/api-titula-rr) (sibling repo,
NestJS) — deployed on the same government intranet, same origin as the API
via Nginx. This app owns **no** auth state of its own: the session is an
opaque cookie minted and validated entirely by the API (no JWT, nothing
decoded or verified here).

## Commands

### Development

- `npm run dev` — watch mode on port **3001**, deliberately different from
  the API's default 3000 so both can run side by side locally.
- Requires `api-titula-rr` running in parallel
  (`AUTH_VALIDATOR=fake npm run start:dev` there) — this app has no
  standalone mode, it's a client of that API. Fake validator gives fixed
  dev users (`dev.gestor`/`dev.admin`/`dev.titulacao`, password `dev`),
  no Active Directory needed.
- `npm run codegen` — regenerates `lib/api/generated/**` from the API's
  live OpenAPI (`ORVAL_API_URL`, default `http://localhost:3000/api/docs-json`).
  Never edit anything under `lib/api/generated` by hand — the next codegen
  run overwrites it. The generated client **is committed** to the repo;
  lint/typecheck/build/unit don't need a live API — only e2e does.

### Build & quality

- `npm run build` / `npm start` — production build / serve
- `npm run lint` / `npm run format`
- `npm run typecheck` — runs `next typegen` **before** `tsc --noEmit`.
  Route-level global types (`LayoutProps<'/'>`, `PageProps<'/login'>`, …)
  only exist after `next dev`, `next build`, or `next typegen` has run —
  on a clean checkout `tsc` alone fails with `Cannot find name
'LayoutProps'`. This broke CI once before the ordering was fixed; don't
  "simplify" `typecheck` back to bare `tsc --noEmit`.

### Tests

- `npm test` — Vitest, unit only (pure functions, one component test for
  `LoginForm`). `vitest.config.mts` has no `test.globals: true` on purpose
  (explicit imports everywhere, matching the rest of the repo) — that
  means Testing Library's auto-cleanup doesn't register itself either;
  `vitest.setup.ts` calls `cleanup()` in an explicit `afterEach` instead.
  Skip that and tests bleed into each other (two "Entrar" buttons found in
  the same render tree).
- `npm run test:e2e` — Playwright, against the **real** `api-titula-rr`,
  not mocks. Needs the API running with **both** `AUTH_VALIDATOR=fake` and
  `NODE_ENV=test`:
  ```bash
  NODE_ENV=test AUTH_VALIDATOR=fake npm run start:dev   # in api-titula-rr
  ```
  `NODE_ENV=test` matters here specifically because it's what disables the
  API's login throttle (`AppThrottlerGuard`, 5/min) — skip it and the
  suite starts failing partway through with silent 429s once enough specs
  have logged in, which reads exactly like a broken session and wastes
  time debugging the wrong layer. `playwright.config.ts` starts the
  frontend itself (prod build in CI, dev server locally) — it does not
  and should not try to start the API.

## Architecture

### Two ways of talking to the API — not interchangeable

1. **From the browser** (Client Components): relative path
   (`/api/v1/...`), same origin — the session cookie travels on its own.
   This is the orval-generated client (`lib/api/generated/`) plus
   `lib/api/mutator.ts`.
2. **From the server** (Server Components that need the session): the call
   leaves the Next process and goes straight to the API over the internal
   network (dev: `localhost:3000`; production: the Docker container name,
   `API_INTERNAL_URL`) — it **bypasses the rewrite/Nginx entirely**, so the
   incoming request's cookie has to be forwarded by hand. That's the sole
   job of `lib/session/current-user.ts::getCurrentUser()`. The orval-generated
   client must never be called from server code — it has no idea how to
   forward a cookie.

### `proxy.ts` is optimistic only

`proxy.ts` (the Next 16 rename of `middleware.ts` — same mechanism) only
checks "does a session cookie exist?" to skip a flash of protected content.
It is **never** the real security boundary — only the API's `SessionGuard`
can tell if a token is actually valid, so an expired/revoked-but-present
cookie sails through the proxy and only gets caught when
`getCurrentUser()` calls the API and gets a 401. The matcher excludes
`/api/*` on purpose: without that, the proxy would intercept the login
`POST` itself (which by definition has no cookie yet) as if it were page
navigation.

### Login/logout are client fetches, not Server Actions

The Next.js auth guide assumes Next owns the session (encrypts it, calls
`cookies().set()`). Here it doesn't — the API mints the `Set-Cookie`. If
login ran as a Server Action, that header would land on the Next
**server**, not the browser, and would need to be manually re-serialized
with `cookies().set(...)`, reimplementing flags (`httpOnly`, `Secure`,
`SameSite`) that are already correct on the API's response. Fetching
directly from the Client Component sidesteps that: the same-origin
response reaches the browser directly, which stores the cookie itself.

### Cache Components (PPR) deliberately off

`next.config.ts` does not set `cacheComponents: true`. Nearly every page
depends on `cookies()` (the session), so there's little static shell worth
prerendering and sharing across users — the "previous" dynamic-by-default
model is the right fit, not an oversight. Revisit only if a genuinely
public, session-free page shows up (e.g. a status page).

### Role gate is cosmetic; the API's 403 is the real one

`lib/session/papeis.ts` (`podeListarUsuarios`/`podeRevogarSessoes`) decides
what the nav (`app/(app)/layout.tsx`) shows and what buttons render — by
**role**, not by the API's actual permission matrix, which stays only in
`MATRIZ_PERMISSOES` on the backend. Copying that matrix here would be debt
that drifts every time the backend changes it. Every protected page
re-fetches and checks for real (`app/(app)/admin/page.tsx` renders
`<AccessDenied>` on a genuine `403` from the API) — reaching a route by
typing the URL directly, past a hidden nav link, still gets the correct
answer.

### HTTP contract

- `SESSION_COOKIE` is duplicated in `lib/session/constants.ts` (can't
  import a TS file from the other repo) — keep it in sync with
  `auth.constants.ts` in `api-titula-rr` by hand.
- Every API error is RFC 7807; `lib/api/problem-details.ts` is the single
  parser, used by both the generated client's mutator and any manual
  server-side fetch.
- The API's OpenAPI documents some error statuses (403, …) without a body
  schema, so orval types their `data` as `void` — that's not real, the
  body is always a Problem Details object. `lib/api/mutator.ts` never
  returns those as data; it always throws `ApiError` instead, so callers
  handle failure in a `catch`, not by inspecting a discriminated union.

## Conventions worth knowing before editing

- Comments explain **why**, not what — match that density when touching
  `proxy.ts`, `lib/session/current-user.ts`, or `lib/api/mutator.ts`
  especially; those three files carry decisions that look wrong until you
  read the comment.
- Commit to a branch, never directly to `main`. PRs are squash-merged;
  Conventional Commits is enforced on the **PR title** only
  (`.github/workflows/pr-title.yml`), not on local commit messages — same
  split as `api-titula-rr`.
- Tooling (prettier, eslint, husky/lint-staged, commitlint config) is a
  deliberate mirror of `api-titula-rr`'s — keep the two in sync rather
  than letting either drift its own way.

## Current state

Auth (login/session/logout), role-gated shell, the admin module (`/admin`
— paginated user list + revoke sessions), and a public `/status` page all
working end-to-end against the real API, with unit tests (Vitest) and e2e
(Playwright, three roles' worth of RBAC) running in CI. Docker image
builds and boots for real (`docker-image` CI job — verified with an
actually-unreachable API to prove `/status` degrades instead of 500).

`cd.yml` mirrors the backend's deploy pipeline and **has run successfully
against real production infrastructure** (17/08/2026) — self-hosted
runner installed under the same dedicated `gh-runner` account the backend
uses (not a workaround), a full `workflow_dispatch` completed green
end-to-end (build, deploy, health check), and `titula-rr-web:rollback`
exists from that run. The Nginx vhost on the separate proxy machine
(`20.50.2.213`) now routes the domain to the app too — confirmed live at
`https://titula.intranet.iteraima.rr.gov.br/` from any domain-joined
machine, `/api/*` still going to the API on the same origin. Runbook:
`docs/DEPLOY.md`. No domain UI yet (título/processo) — waiting on the
corresponding modules to exist in the API.
