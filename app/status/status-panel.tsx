'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchHealth } from '@/lib/api/health';
import type { HealthStatusDto } from '@/lib/api/generated/titulaRRAPI.schemas';

const STATUS_LABEL: Record<HealthStatusDto['status'], string> = {
  ok: 'Operacional',
  degraded: 'Degradado',
  down: 'Fora do ar',
};

// good/warn/bad são os tokens SEMÂNTICOS (globals.css) — de propósito
// diferentes do accent (verde da marca): aqui a cor precisa dizer "está
// tudo bem", não "isto é clicável".
const STATUS_TOKEN: Record<HealthStatusDto['status'], string> = {
  ok: 'bg-good text-on-good',
  degraded: 'bg-warn text-on-warn',
  down: 'bg-bad text-on-bad',
};

const DATABASE_LABEL: Record<HealthStatusDto['database'], string> = {
  connected: 'Conectado',
  disconnected: 'Desconectado',
};

const DIRECTORY_LABEL: Record<HealthStatusDto['directory'], string> = {
  reachable: 'Alcançável',
  unreachable: 'Inalcançável',
  disabled: 'Desligado (AUTH_VALIDATOR≠ad)',
};

export function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

export function StatusPanel({ initialData }: { initialData: HealthStatusDto }) {
  const { data, dataUpdatedAt } = useQuery({
    queryKey: ['health'],
    // sem baseUrl: navegador, caminho relativo, mesma origem.
    queryFn: () => fetchHealth(),
    initialData,
    // mesmo TTL da sonda de diretório no backend (health.service.ts,
    // SONDA_TTL_MS) — não faz sentido o front atualizar mais rápido que a
    // própria API reavalia o estado.
    refetchInterval: 30_000,
  });

  const health = data;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-md border border-line bg-surface p-4">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_TOKEN[health.status]}`}
        >
          {STATUS_LABEL[health.status]}
        </span>
        <span className="text-sm text-ink-faint">
          atualizado {new Date(dataUpdatedAt).toLocaleTimeString('pt-BR')}
        </span>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-md border border-line p-4 text-sm">
        <dt className="text-ink-soft">Banco de dados</dt>
        <dd className="text-ink">{DATABASE_LABEL[health.database]}</dd>
        <dt className="text-ink-soft">Diretório (AD)</dt>
        <dd className="text-ink">{DIRECTORY_LABEL[health.directory]}</dd>
        <dt className="text-ink-soft">Uptime</dt>
        <dd className="font-mono text-ink">{formatUptime(health.uptime)}</dd>
      </dl>
    </div>
  );
}
