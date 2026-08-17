'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { authControllerLoginV1 } from '@/lib/api/generated/auth/auth';
import { ApiError } from '@/lib/api/problem-details';

// Só "não vazio": a normalização de verdade (trim, minúsculo, aceitar
// DOMAIN\user ou user@dominio) é sempre do backend (loginSchema em
// api-titula-rr) — duplicar a regra aqui só serviria pra divergir dela.
const loginSchema = z.object({
  username: z.string().min(1, 'Informe seu usuário.'),
  password: z.string().min(1, 'Informe sua senha.'),
});

type LoginValues = z.infer<typeof loginSchema>;

// Campo de texto do formulário — único lugar onde a classe do <input> é
// escrita, pra label/senha nunca divergirem visualmente por engano.
const fieldClass =
  'rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/35';

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginValues) {
    setFormError(null);
    try {
      await authControllerLoginV1(values);
      // o Set-Cookie da resposta já foi salvo pelo navegador — mesma
      // origem (rewrite do Next em dev / Nginx em produção), nenhum código
      // de storage manual precisa rodar aqui.
      router.push(redirectTo);
      router.refresh(); // reexecuta as Server Components já com a sessão nova
    } catch (err) {
      if (!(err instanceof ApiError)) {
        setFormError('Não foi possível entrar. Tente novamente.');
        return;
      }

      // 400: nestjs-zod devolve um issue por campo — mesmo path do schema
      // do backend, então bate direto com os nomes dos campos aqui.
      if (err.status === 400 && err.problem.errors) {
        for (const issue of err.problem.errors) {
          const field = issue.path[0];
          if (field === 'username' || field === 'password') {
            setError(field, { message: issue.message });
          }
        }
        return;
      }

      if (err.status === 401) {
        setFormError('Usuário ou senha incorretos.');
        return;
      }

      if (err.status === 429) {
        setFormError('Muitas tentativas. Aguarde um minuto e tente de novo.');
        return;
      }

      // 503: o DC do AD está fora do ar — não é credencial errada, o
      // usuário não deve tentar de novo achando que digitou errado.
      if (err.status === 503) {
        setFormError(
          'Autenticação temporariamente indisponível. Tente novamente em instantes.',
        );
        return;
      }

      setFormError(err.problem.detail ?? 'Não foi possível entrar.');
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="username" className="text-sm font-medium text-ink-soft">
          Usuário
        </label>
        <input
          id="username"
          autoComplete="username"
          className={fieldClass}
          {...register('username')}
        />
        {errors.username && (
          <p className="text-sm text-bad">{errors.username.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-ink-soft">
          Senha
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className={fieldClass}
          {...register('password')}
        />
        {errors.password && (
          <p className="text-sm text-bad">{errors.password.message}</p>
        )}
      </div>

      {formError && <p className="text-sm text-bad">{formError}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-on-accent outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:opacity-60"
      >
        {isSubmitting ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}
