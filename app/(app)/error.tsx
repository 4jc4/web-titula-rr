'use client';

import { Button } from '@/components/ui/button';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <h1 className="font-serif text-xl font-semibold">Algo deu errado</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {error.message || 'Não foi possível carregar esta página.'}
      </p>
      <Button variant="outline" size="sm" className="mt-4" onClick={reset}>
        Tentar de novo
      </Button>
    </div>
  );
}
