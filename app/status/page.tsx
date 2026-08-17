import { fetchHealth } from '@/lib/api/health';
import { env } from '@/lib/env';
import { StatusPanel } from './status-panel';

export const metadata = {
  title: 'Status — Titula RR',
};

export default async function StatusPage() {
  // Fetch direto pra API (URL absoluta — servidor não tem "mesma origem"
  // pra resolver caminho relativo), sem cookie: /api/health é @Public().
  const initialData = await fetchHealth(env.API_INTERNAL_URL);

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <h1 className="font-display text-2xl font-semibold text-ink">Status</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Disponibilidade da api-titula-rr — atualiza a cada 30s.
      </p>

      <div className="mt-6">
        <StatusPanel initialData={initialData} />
      </div>
    </main>
  );
}
