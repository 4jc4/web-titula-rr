import type { HealthStatusDto } from './generated/titulaRRAPI.schemas';

// /api/health é o ÚNICO endpoint da api-titula-rr cujo corpo é
// schema-idêntico tanto no sucesso (200, status ok/degraded) quanto no
// "down" (503) — de propósito, documentado no health.controller.ts de
// lá: o código HTTP é só pro Docker/Zabbix reagirem, o corpo é sempre a
// mesma payload que a UI deve mostrar, incluindo quando está fora do ar.
//
// Por isso NÃO passa pelo cliente gerado (lib/api/generated/health) nem
// pelo mutator (mutator.ts): aquele mutator trata qualquer não-2xx como
// falha e lança ApiError — jogaria fora exatamente o corpo que esta tela
// precisa ler mesmo com 503. `baseUrl` fica de fora: quem chama do
// servidor passa API_INTERNAL_URL (fetch do servidor precisa de URL
// absoluta), quem chama do navegador não passa nada (relativo, mesma
// origem).
export async function fetchHealth(baseUrl = ''): Promise<HealthStatusDto> {
  const response = await fetch(`${baseUrl}/api/health`, { cache: 'no-store' });
  return (await response.json()) as HealthStatusDto;
}
