import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, type ProblemDetails } from '@/lib/api/problem-details';
import { LoginForm } from './login-form';

const push = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}));

const authControllerLoginV1 = vi.fn();
vi.mock('@/lib/api/generated/auth/auth', () => ({
  authControllerLoginV1: (...args: unknown[]) => authControllerLoginV1(...args),
}));

// ApiError DE VERDADE (não um objeto parecido) — o componente faz
// `err instanceof ApiError`, que só bate com a classe real, não com um
// objeto que só tem os mesmos campos.
function apiError(status: number, extra: Partial<ProblemDetails> = {}) {
  return new ApiError(
    { type: 'about:blank', title: 'Erro', status, instance: '/x', ...extra },
    status,
  );
}

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mostra erro de validação sem chamar a API quando os campos estão vazios', async () => {
    const user = userEvent.setup();
    render(<LoginForm redirectTo="/" />);

    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Informe seu usuário.')).toBeInTheDocument();
    expect(screen.getByText('Informe sua senha.')).toBeInTheDocument();
    expect(authControllerLoginV1).not.toHaveBeenCalled();
  });

  it('login bem-sucedido navega pro redirectTo e atualiza as Server Components', async () => {
    authControllerLoginV1.mockResolvedValue({
      data: {
        id: '1',
        username: 'dev.gestor',
        name: 'Gestor',
        email: null,
        papeis: ['gestor'],
      },
      status: 200,
    });
    const user = userEvent.setup();
    render(<LoginForm redirectTo="/admin" />);

    await user.type(screen.getByLabelText('Usuário'), 'dev.gestor');
    await user.type(screen.getByLabelText('Senha'), 'dev');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin'));
    expect(refresh).toHaveBeenCalled();
  });

  it('401 mostra "usuário ou senha incorretos", não o detail cru da API', async () => {
    authControllerLoginV1.mockRejectedValue(apiError(401));
    const user = userEvent.setup();
    render(<LoginForm redirectTo="/" />);

    await user.type(screen.getByLabelText('Usuário'), 'dev.gestor');
    await user.type(screen.getByLabelText('Senha'), 'errada');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(
      await screen.findByText('Usuário ou senha incorretos.'),
    ).toBeInTheDocument();
  });

  it('503 avisa que é indisponibilidade, não credencial errada', async () => {
    authControllerLoginV1.mockRejectedValue(apiError(503));
    const user = userEvent.setup();
    render(<LoginForm redirectTo="/" />);

    await user.type(screen.getByLabelText('Usuário'), 'dev.gestor');
    await user.type(screen.getByLabelText('Senha'), 'dev');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(
      await screen.findByText(/Autenticação temporariamente indisponível/),
    ).toBeInTheDocument();
  });

  it('400 com issues por campo marca o campo certo do formulário', async () => {
    authControllerLoginV1.mockRejectedValue(
      apiError(400, {
        errors: [
          {
            code: 'too_small',
            path: ['password'],
            message: 'Senha muito curta.',
          },
        ],
      }),
    );
    const user = userEvent.setup();
    render(<LoginForm redirectTo="/" />);

    await user.type(screen.getByLabelText('Usuário'), 'dev.gestor');
    await user.type(screen.getByLabelText('Senha'), 'x');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Senha muito curta.')).toBeInTheDocument();
  });
});
