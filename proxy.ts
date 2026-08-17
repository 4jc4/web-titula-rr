import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session/constants';

// "Proxy" é o nome novo do que até o Next 15 se chamava "Middleware" (Next
// 16, mesma função — ver node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md).
//
// Checagem OTIMISTA, só de UX: evita o flash de tela protegida quando não
// existe cookie NENHUM. NUNCA é a fronteira de segurança de verdade — o
// Proxy não sabe validar o token contra o Postgres (só a SessionGuard da
// api-titula-rr sabe isso), então um cookie presente mas expirado/revogado
// passa por aqui sem problema e só é barrado quando a API responder 401 de
// verdade (a página protegida chama getCurrentUser() e redireciona).
// /login e /status são públicas pelo mesmo motivo que /api/health é
// @Public() na API — mas só /login expulsa quem já tem sessão (não faz
// sentido ver o formulário de novo). /status precisa continuar visitável
// nos DOIS estados: é justamente a página que alguém checa quando algo
// mais (o login, por exemplo) pode estar quebrado.
const PUBLIC_ROUTES = ['/login', '/status'];
const REDIRECT_IF_AUTHENTICATED = ['/login'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    pathname.startsWith(route),
  );
  const hasSessionCookie = request.cookies.has(SESSION_COOKIE);

  if (!isPublicRoute && !hasSessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const shouldLeaveIfAuthenticated = REDIRECT_IF_AUTHENTICATED.some((route) =>
    pathname.startsWith(route),
  );
  if (shouldLeaveIfAuthenticated && hasSessionCookie) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Nunca em cima de /api: essas requests são o rewrite same-origin pra
  // api-titula-rr (ver next.config.ts) — se o Proxy interceptasse, uma
  // chamada JSON sem cookie (ex.: o próprio POST de login, ANTES de existir
  // sessão) seria redirecionada pra /login como se fosse navegação de
  // página, quebrando o fetch. A API já tem sua própria SessionGuard;
  // gatekeeping duplicado aqui é só bug. Também fora: assets do Next.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
