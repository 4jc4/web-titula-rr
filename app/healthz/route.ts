import { NextResponse } from 'next/server';

// Liveness só do PROCESSO Next em si — nunca toca a api-titula-rr. É o
// alvo do HEALTHCHECK do docker-compose.yml: um container web saudável
// não deveria entrar em loop de restart só porque a API está
// temporariamente fora do ar (reiniciar o Next não conserta a API, só
// gera ruído). Pra disponibilidade de verdade da API, ver /status — feita
// pra alguém LER, não pro orquestrador decidir se reinicia o container.
//
// Fora de /api/* de propósito: esse prefixo é reescrito pra api-titula-rr
// em next.config.ts — um /api/healthz seria interceptado pelo rewrite
// antes de chegar aqui.
export function GET() {
  return NextResponse.json({ status: 'ok' });
}
