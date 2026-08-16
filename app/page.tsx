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
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Titula RR</p>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Olá, {user.name}
          </h1>
        </div>
        <LogoutButton />
      </header>

      <section className="rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <dt className="text-zinc-500 dark:text-zinc-400">Usuário</dt>
          <dd className="text-zinc-900 dark:text-zinc-50">{user.username}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">Papéis</dt>
          <dd className="text-zinc-900 dark:text-zinc-50">
            {user.papeis.length > 0 ? user.papeis.join(', ') : '—'}
          </dd>
        </dl>
      </section>
    </main>
  );
}
