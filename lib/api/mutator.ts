import { ApiError, parseProblemDetails } from './problem-details';

// Mutator do cliente gerado pelo orval (lib/api/generated/**, não editar à
// mão — ver orval.config.ts). É para chamada do NAVEGADOR: caminho
// relativo, mesma origem (rewrite do Next em dev, Nginx em produção) — o
// cookie de sessão viaja sozinho, este arquivo nunca precisa tocar nele.
// Chamada do SERVIDOR que precisa repassar o cookie à mão fica FORA daqui,
// de propósito — ver lib/session/current-user.ts.
//
// A api-titula-rr documenta status de erro (403 etc.) no OpenAPI só com
// descrição, sem schema de corpo — o tipo que o orval gera pra esses casos
// é `data: void`, que não reflete a realidade (o corpo é sempre um Problem
// Details). Por isso este mutator NUNCA "retorna" um erro: sempre lança
// ApiError com o Problem Details de verdade. O union gerado só precisa
// descrever o caminho de sucesso; o de erro se trata num catch.
export async function apiFetch<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: 'same-origin',
  });

  if (!response.ok) {
    throw new ApiError(await parseProblemDetails(response), response.status);
  }

  // 204 (logout) não tem corpo — response.json() rejeitaria.
  const data = response.status === 204 ? undefined : await response.json();

  return { data, status: response.status, headers: response.headers } as T;
}
