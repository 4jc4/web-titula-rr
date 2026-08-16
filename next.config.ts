import type { NextConfig } from 'next';

// API_INTERNAL_URL lido direto do process.env (não de lib/env.ts): o
// next.config.ts carrega fora do runtime da aplicação, antes do resto do
// bundle existir — importar módulo de app aqui é terreno instável.
const apiInternalUrl = process.env.API_INTERNAL_URL ?? 'http://localhost:3000';

const nextConfig: NextConfig = {
  // cacheComponents (PPR) deliberadamente DESLIGADO: é opt-in no Next 16, e
  // cada página deste app depende de cookies() (sessão) — não sobra quase
  // nada que valha a pena virar shell estático/compartilhado entre
  // usuários. O modelo "anterior" (dinâmico por padrão) é o certo aqui, não
  // um esquecimento.
  async rewrites() {
    // Só importa em dev: em produção o Nginx já roteia /api pro container
    // da API antes de chegar no Next (ver docker-compose.yml da API) — isto
    // aqui existe só pra dev local não precisar de CORS_ORIGIN nem sair de
    // "mesma origem" enquanto a API roda numa porta diferente da do Next.
    return [
      {
        source: '/api/:path*',
        destination: `${apiInternalUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
