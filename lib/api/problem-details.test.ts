import { describe, expect, it } from 'vitest';
import { ApiError, parseProblemDetails, unwrap } from './problem-details';

describe('parseProblemDetails', () => {
  it('lê o corpo problem+json normalmente', async () => {
    const response = new Response(
      JSON.stringify({
        type: 'about:blank',
        title: 'Forbidden',
        status: 403,
        instance: '/api/v1/admin/usuarios',
      }),
      { status: 403 },
    );

    const problem = await parseProblemDetails(response);

    expect(problem).toEqual({
      type: 'about:blank',
      title: 'Forbidden',
      status: 403,
      instance: '/api/v1/admin/usuarios',
    });
  });

  it('não quebra quando o corpo não é JSON (ex.: 502 de proxy antes de chegar na API)', async () => {
    const response = new Response('<html>Bad Gateway</html>', {
      status: 502,
      statusText: 'Bad Gateway',
    });

    const problem = await parseProblemDetails(response);

    expect(problem.status).toBe(502);
    expect(problem.title).toBe('Bad Gateway');
    expect(problem.type).toBe('about:blank');
  });
});

describe('ApiError', () => {
  it('usa o detail do problem como mensagem, com o title como fallback', () => {
    const comDetail = new ApiError(
      {
        type: 'about:blank',
        title: 'Bad Request',
        status: 400,
        instance: '/x',
        detail: 'Senha muito curta.',
      },
      400,
    );
    expect(comDetail.message).toBe('Senha muito curta.');

    const semDetail = new ApiError(
      { type: 'about:blank', title: 'Forbidden', status: 403, instance: '/x' },
      403,
    );
    expect(semDetail.message).toBe('Forbidden');
  });
});

describe('unwrap', () => {
  it('devolve o data quando presente', () => {
    expect(unwrap({ data: { revogadas: 3 } })).toEqual({ revogadas: 3 });
  });
});
