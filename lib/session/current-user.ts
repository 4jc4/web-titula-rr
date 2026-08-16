import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { env } from '@/lib/env';
import type { PublicUserDtoOutput } from '@/lib/api/generated/titulaRRAPI.schemas';
import { SESSION_COOKIE } from './constants';

// Único ponto do app que fala com a API PELO SERVIDOR. Diferente do
// cliente gerado por orval (lib/api/generated + mutator.ts) — que é
// same-origin e deixa o cookie viajar sozinho — esta chamada sai do
// processo do Next direto pra api-titula-rr pela rede interna do Docker,
// contornando o Nginx. Nesse caminho o cookie do request original (o que
// chegou do NAVEGADOR nesta Server Component) não viaja sozinho: precisa
// ser repassado à mão, senão a API não tem como saber quem está pedindo.
//
// cache(): memoiza por request-render — várias partes da árvore podem
// chamar getCurrentUser() no mesmo request sem disparar N chamadas pra API
// (mesmo padrão do "Reusing data with React.cache" da doc do Next).
//
// null (não exceção) para "sem sessão válida" — 401 é o estado NORMAL de
// "deslogado", não um erro. Quem decide o que fazer com null é o chamador
// (a página redireciona, o proxy.ts nem chega a chamar isto).
export const getCurrentUser = cache(
  async (): Promise<PublicUserDtoOutput | null> => {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const response = await fetch(`${env.API_INTERNAL_URL}/api/v1/auth/me`, {
      headers: { cookie: `${SESSION_COOKIE}=${token}` },
      // sessão é por usuário — nunca cachear entre requests/usuários.
      cache: 'no-store',
    });

    if (!response.ok) return null;

    return (await response.json()) as PublicUserDtoOutput;
  },
);
