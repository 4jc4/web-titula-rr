import 'server-only';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';
import { SESSION_COOKIE } from './constants';

// Fetch genérico do SERVIDOR pra api-titula-rr, repassando o cookie da
// sessão à mão. Esta chamada sai do processo do Next direto pra API pela
// rede interna do Docker, contornando o Nginx — e por isso o cookie do
// request original (o que chegou do NAVEGADOR nesta Server Component) não
// viaja sozinho, precisa ser anexado aqui. Base de getCurrentUser() e de
// qualquer outra leitura server-side que precise de sessão (ex.: a
// listagem de /admin/usuarios).
//
// Nunca lança em resposta não-2xx — devolve o Response cru. Quem chama
// decide o que um 401/403/404 significa NAQUELE contexto (login ausente
// vs. sem permissão vs. recurso inexistente); um throw genérico aqui
// obrigaria todo mundo a distinguir os casos de novo num catch.
export async function apiServerFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  const headers = new Headers(init.headers);
  if (token) headers.set('cookie', `${SESSION_COOKIE}=${token}`);

  return fetch(`${env.API_INTERNAL_URL}${path}`, {
    ...init,
    headers,
    // sessão é por usuário — nunca cachear entre requests/usuários.
    cache: 'no-store',
  });
}
