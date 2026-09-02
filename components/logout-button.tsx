'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
    <Button
      variant="outline"
      size="sm"
      onClick={handleLogout}
      disabled={pending}
    >
      {pending ? 'Saindo…' : 'Sair'}
    </Button>
  );
}
