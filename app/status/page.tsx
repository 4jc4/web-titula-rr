import { fetchHealth } from '@/lib/api/health';
import type { HealthStatusDto } from '@/lib/api/generated/titulaRRAPI.schemas';
import { env } from '@/lib/env';
import { StatusPanel } from './status-panel';

export const metadata = {
  title: 'Status — Titula RR',
};

// Quando a API está COMPLETAMENTE inalcançável (não um 503 dela — a
// conexão nem se estabelece), o fetch em si lança, não devolve resposta
// nenhuma pra ler. Sem isto, a página inteira quebraria (500) bem na hora
// em que "a API caiu" é exatamente a informação que quem está olhando
// esta tela precisa ver.
function unreachable(): HealthStatusDto {
  return {
    status: 'down',
    timestamp: new Date().toISOString(),
    uptime: 0,
    database: 'disconnected',
    directory: 'disabled',
  };
}

export default async function StatusPage() {
  // Fetch direto pra API (URL absoluta — servidor não tem "mesma origem"
  // pra resolver caminho relativo), sem cookie: /api/health é @Public().
  const initialData = await fetchHealth(env.API_INTERNAL_URL).catch(
    unreachable,
  );

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <h1 className="font-serif text-2xl font-semibold">Status</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Disponibilidade da api-titula-rr — atualiza a cada 30s.
      </p>

      <div className="mt-6">
        <StatusPanel initialData={initialData} />
      </div>
    </main>
  );
}
