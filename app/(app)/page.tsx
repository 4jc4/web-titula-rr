import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session/current-user';

export default async function HomePage() {
  // Checagem de VERDADE, feita AQUI (não no layout — ver AppLayout).
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-display text-2xl font-semibold text-ink">
        Olá, {user.name.split(' ')[0]}
      </h1>
      <p className="mt-1 text-sm text-ink-soft">Bem-vindo ao Titula RR.</p>

      <section className="mt-6 rounded-md border border-line bg-surface p-4 text-sm">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <dt className="text-ink-soft">Usuário</dt>
          <dd className="font-mono text-ink">{user.username}</dd>
          <dt className="text-ink-soft">Papéis</dt>
          <dd className="text-ink">
            {user.papeis.length > 0 ? user.papeis.join(', ') : '—'}
          </dd>
        </dl>
      </section>
    </div>
  );
}
