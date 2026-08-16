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
  run overwrites it. The generated client **is committed** to the repo; no
  CI job currently depends on the API being reachable (that changes once
  e2e/Playwright needs a live API anyway).

### Build & quality

- `npm run build` / `npm start` — production build / serve
- `npm run lint` / `npm run format`
- `npm run typecheck` — runs `next typegen` **before** `tsc --noEmit`.
  Route-level global types (`LayoutProps<'/'>`, `PageProps<'/login'>`, …)
  only exist after `next dev`, `next build`, or `next typegen` has run —
  on a clean checkout `tsc` alone fails with `Cannot find name
'LayoutProps'`. This broke CI once before the ordering was fixed; don't
  "simplify" `typecheck` back to bare `tsc --noEmit`.

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

Auth foundation working end-to-end against the real API: login, session
read server-side via `getCurrentUser()`, logout, optimistic redirect via
`proxy.ts`. No domain UI yet (título/processo) — waiting on the
corresponding modules to exist in the API. Next up: role-gated shell,
admin module (`/admin/usuarios`, mirroring what already exists in the
API), tests (Vitest + Playwright), CI/CD mirroring the backend's jobs.
