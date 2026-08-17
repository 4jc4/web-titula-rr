export function AccessDenied({ message }: { message?: string }) {
  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <h1 className="font-display text-xl font-semibold text-ink">
        Acesso restrito
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        {message ?? 'Você não tem permissão para ver esta página.'}
      </p>
    </div>
  );
}
