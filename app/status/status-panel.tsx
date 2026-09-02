'use client';

import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { fetchHealth } from '@/lib/api/health';
import type { HealthStatusDto } from '@/lib/api/generated/titulaRRAPI.schemas';

const STATUS_LABEL: Record<HealthStatusDto['status'], string> = {
  ok: 'Operacional',
  degraded: 'Degradado',
  down: 'Fora do ar',
};

// success/warning são variantes NOSSAS do Badge (ver components/ui/badge.tsx):
// o registro do shadcn só traz destructive, e aqui a cor precisa dizer "está
// tudo bem", não "isto é clicável" — que é o papel do primary.
const STATUS_VARIANT: Record<
  HealthStatusDto['status'],
  'success' | 'warning' | 'destructive'
> = {
  ok: 'success',
  degraded: 'warning',
  down: 'destructive',
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

// A hora vem do CAMPO `timestamp` do payload — o instante em que a API
// mediu —, nunca de um relógio local. Ler a hora durante o render é impuro
// (react-hooks/purity) e, pior, produz um texto no servidor e outro no
// cliente: hydration mismatch a cada carga, com o React descartando a árvore
// e refazendo. Vindo do dado, os dois lados renderizam a mesma coisa.
//
// O fuso é EXPLÍCITO pelo mesmo motivo: o container roda em UTC e o navegador
// em Boa Vista, então o mesmo instante viraria textos diferentes. Mesmo
// raciocínio do data_local() da api-titula-rr.
function formatarHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    timeZone: 'America/Boa_Vista',
  });
}

export function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

export function StatusPanel({ initialData }: { initialData: HealthStatusDto }) {
  const { data } = useQuery({
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
      <Card>
        <CardContent className="flex items-center gap-3">
          <Badge variant={STATUS_VARIANT[health.status]}>
            {STATUS_LABEL[health.status]}
          </Badge>
          <span className="text-sm text-muted-foreground tabular-nums">
            medido às {formatarHora(health.timestamp)}
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Banco de dados</dt>
            <dd>{DATABASE_LABEL[health.database]}</dd>
            <dt className="text-muted-foreground">Diretório (AD)</dt>
            <dd>{DIRECTORY_LABEL[health.directory]}</dd>
            <dt className="text-muted-foreground">Uptime</dt>
            <dd className="font-mono tabular-nums">
              {formatUptime(health.uptime)}
            </dd>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
