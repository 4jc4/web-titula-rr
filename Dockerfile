# syntax=docker/dockerfile:1

# ============================================================================
# web-titula-rr — imagem de produção
# output: 'standalone' (next.config.ts): o build traça só os módulos que a
# aplicação usa de verdade — a imagem final não carrega o node_modules
# inteiro nem precisa de um `npm prune` separado (diferente do Dockerfile
# da api-titula-rr, que não tem esse recurso disponível).
# ============================================================================

# --- build ------------------------------------------------------------------
FROM node:24-slim AS builder
WORKDIR /app

# O `prepare` do package.json roda o husky, que exige .git — excluído pelo
# .dockerignore. Em build não há hook de commit pra instalar.
ENV HUSKY=0

COPY package*.json ./
RUN npm ci

COPY . .

# API_INTERNAL_URL só importa em RUNTIME — next.config.ts lê
# process.env a cada boot do servidor standalone, não embute o valor no
# bundle. Não precisa de nada aqui pra buildar.
RUN npm run build

# --- runtime ------------------------------------------------------------------
FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# .next/standalone já vem com só o node_modules necessário. static/ e
# public/ ficam FORA do tracing de propósito (são assets, não código) — o
# próprio Next documenta que precisam ser copiados à parte.
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER node
EXPOSE 3000

# server.js: onde `next build` com output standalone coloca o entrypoint —
# não `next start` (o standalone tem servidor HTTP próprio, mais leve, sem
# precisar do resto da CLI do Next). O job docker-image do CI builda esta
# imagem e sobe o container de verdade a cada PR — se este caminho mudar,
# quebra lá, não em produção.
CMD ["node", "server.js"]
