import 'server-only';
import { cache } from 'react';
import type { PublicUserDtoOutput } from '@/lib/api/generated/titulaRRAPI.schemas';
import { apiServerFetch } from './server-fetch';

// cache(): memoiza por request-render — várias partes da árvore (o layout
// pra desenhar a casca, cada página pra decidir redirect) podem chamar
// getCurrentUser() no mesmo request sem disparar N chamadas pra API (mesmo
// padrão do "Reusing data with React.cache" da doc do Next).
//
// null (não exceção) para "sem sessão válida" — 401 é o estado NORMAL de
// "deslogado", não um erro. Quem decide o que fazer com null é o chamador
// (a página redireciona, o proxy.ts nem chega a chamar isto).
export const getCurrentUser = cache(
  async (): Promise<PublicUserDtoOutput | null> => {
    const response = await apiServerFetch('/api/v1/auth/me');
    if (!response.ok) return null;
    return (await response.json()) as PublicUserDtoOutput;
  },
);
