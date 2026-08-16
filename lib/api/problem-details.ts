// Formato ÚNICO de erro de toda a api-titula-rr — RFC 7807, sempre
// `application/problem+json` (ver ProblemDetailsFilter no backend). UM
// parser aqui, usado por qualquer código que fala com a API: o mutator do
// cliente gerado (mutator.ts) e as leituras manuais do servidor
// (lib/session/current-user.ts) — nenhum tratamento de erro rota a rota.
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance: string;
  reqId?: string;
  // nestjs-zod anexa aqui os issues de validação (400) — path bate com o
  // campo do formulário, 1:1 com o schema zod do backend.
  errors?: Array<{
    code: string;
    path: Array<string | number>;
    message: string;
  }>;
}

export class ApiError extends Error {
  constructor(
    public readonly problem: ProblemDetails,
    public readonly status: number,
  ) {
    super(problem.detail ?? problem.title);
    this.name = 'ApiError';
  }
}

// Nunca assume que o corpo é JSON válido: um 502/504 do Nginx antes de
// chegar na API, por exemplo, não vem em problem+json nenhum.
export async function parseProblemDetails(
  response: Response,
): Promise<ProblemDetails> {
  try {
    return (await response.json()) as ProblemDetails;
  } catch {
    return {
      type: 'about:blank',
      title: response.statusText || 'Erro desconhecido',
      status: response.status,
      instance: response.url,
    };
  }
}
