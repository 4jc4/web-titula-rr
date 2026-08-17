import { redirect } from 'next/navigation';
import { LogoutButton } from '@/components/logout-button';
import { getCurrentUser } from '@/lib/session/current-user';

export default async function HomePage() {
  // Checagem de VERDADE, feita AQUI (não no layout raiz — ver o "Layouts e
  // checagens de auth" na doc do Next: layout não re-renderiza em toda
  // navegação, a página sim).
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-ink-soft">Titula RR</p>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Olá, {user.name}
          </h1>
        </div>
        <LogoutButton />
      </header>

      <section className="rounded-md border border-line bg-surface p-4 text-sm">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <dt className="text-ink-soft">Usuário</dt>
          <dd className="font-mono text-ink">{user.username}</dd>
          <dt className="text-ink-soft">Papéis</dt>
          <dd className="text-ink">
            {user.papeis.length > 0 ? user.papeis.join(', ') : '—'}
          </dd>
        </dl>
      </section>
    </main>
  );
}
