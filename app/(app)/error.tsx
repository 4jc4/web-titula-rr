'use client';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <h1 className="font-display text-xl font-semibold text-ink">
        Algo deu errado
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        {error.message || 'Não foi possível carregar esta página.'}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-md border border-line px-3 py-1.5 text-sm text-ink-soft hover:text-ink"
      >
        Tentar de novo
      </button>
    </div>
  );
}
