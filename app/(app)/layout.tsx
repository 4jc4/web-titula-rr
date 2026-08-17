import Link from 'next/link';
import type { ReactNode } from 'react';
import { LogoutButton } from '@/components/logout-button';
import { getCurrentUser } from '@/lib/session/current-user';
import { podeListarUsuarios } from '@/lib/session/papeis';

// Casca de toda rota autenticada: marca (esquerda), nav condicionada a
// papel, identidade + sair (direita). SÓ desenha UI — a checagem de
// VERDADE (redirect se não tiver sessão) é de cada página, não daqui: o
// layout não re-renderiza em navegação entre rotas irmãs, então um
// redirect só aqui deixaria uma sessão caída "grudada" na tela até o
// próximo load inteiro (ver CLAUDE.md, "Layouts e checagens de auth").
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-6 border-b border-line px-6 py-4">
        <div className="flex items-center gap-6">
          <span className="font-display text-lg font-semibold text-ink">
            Titula RR
          </span>
          {user && (
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/" className="text-ink-soft hover:text-ink">
                Início
              </Link>
              {podeListarUsuarios(user.papeis) && (
                <Link href="/admin" className="text-ink-soft hover:text-ink">
                  Administração
                </Link>
              )}
            </nav>
          )}
        </div>

        {user && (
          <div className="flex items-center gap-4">
            <div className="text-right text-sm leading-tight">
              <p className="text-ink">{user.name}</p>
              <p className="text-ink-faint">{user.papeis.join(', ') || '—'}</p>
            </div>
            <LogoutButton />
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
