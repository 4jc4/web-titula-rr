export function AccessDenied({ message }: { message?: string }) {
  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <h1 className="font-serif text-xl font-semibold">Acesso restrito</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {message ?? 'Você não tem permissão para ver esta página.'}
      </p>
    </div>
  );
}
