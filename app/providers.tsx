'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  // useState, não módulo top-level: no servidor, cada request precisa da
  // SUA própria instância — um QueryClient em escopo de módulo vazaria
  // cache entre usuários diferentes num app com SSR.
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
