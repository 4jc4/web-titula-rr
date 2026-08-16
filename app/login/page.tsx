import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session/current-user';
import { LoginForm } from './login-form';

export const metadata = {
  title: 'Entrar — Titula RR',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  // Checagem de VERDADE (não a otimista do proxy.ts): quem já tem sessão
  // válida não tem por que ver o formulário de novo.
  const user = await getCurrentUser();
  if (user) redirect('/');

  const { from } = await searchParams;
  const redirectTo = from && from !== '/login' ? from : '/';

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Titula RR
        </h1>
        <p className="mb-8 text-sm text-zinc-500 dark:text-zinc-400">
          Entre com sua conta da rede.
        </p>
        <LoginForm redirectTo={redirectTo} />
      </div>
    </main>
  );
}
