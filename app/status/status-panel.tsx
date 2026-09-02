'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
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

  // A hora formatada NÃO pode sair do servidor. `dataUpdatedAt` é o instante
  // em que o cache foi preenchido — no SSR, a hora do servidor; no cliente, a
  // hora em que ele adotou o initialData. Os dois nunca coincidem, e
  // `toLocaleTimeString` ainda depende do fuso do processo (o container roda
  // em UTC, o navegador em Boa Vista). Renderizar isso no servidor produzia
  // hydration mismatch a cada carga: o React descartava a árvore e refazia no
  // cliente. Começar em null e preencher no efeito faz servidor e cliente
  // concordarem no primeiro render, que é a única coisa que a hidratação
  // compara.
  const [atualizadoEm, setAtualizadoEm] = useState<string | null>(null);
  useEffect(() => {
    setAtualizadoEm(new Date(dataUpdatedAt).toLocaleTimeString('pt-BR'));
  }, [dataUpdatedAt]);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex items-center gap-3">
          <Badge variant={STATUS_VARIANT[health.status]}>
            {STATUS_LABEL[health.status]}
          </Badge>
          <span className="text-sm text-muted-foreground tabular-nums">
            atualizado {atualizadoEm ?? '—'}
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
