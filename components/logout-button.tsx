'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authControllerLogoutV1 } from '@/lib/api/generated/auth/auth';

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    try {
      await authControllerLogoutV1();
    } finally {
      // best-effort: mesmo se a chamada falhar (ex.: sessão já tinha
      // caído), a navegação pro login segue — não trava o usuário aqui.
      router.push('/login');
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      className="rounded-md border border-line px-3 py-1.5 text-sm text-ink-soft outline-none transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-60"
    >
      {pending ? 'Saindo…' : 'Sair'}
    </button>
  );
}
