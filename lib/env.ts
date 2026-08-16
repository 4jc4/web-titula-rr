import { z } from 'zod';

// Só o que o SERVIDOR do Next precisa pra falar com a api-titula-rr — sem
// NEXT_PUBLIC_* aqui de propósito: o navegador nunca fala direto com a API,
// sempre por caminho relativo (mesma origem via Nginx/rewrite). Ver
// lib/session/current-user.ts, o único lugar que lê API_INTERNAL_URL.
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  // Dev: a api-titula-rr roda solta em localhost:3000 (README). Produção:
  // nome do container na rede Docker interna (container_name: titula-rr-api
  // no docker-compose.yml do backend) — essa chamada nunca passa pelo
  // Nginx, é servidor-a-servidor.
  API_INTERNAL_URL: z.url().default('http://localhost:3000'),
});

export const env = envSchema.parse(process.env);
