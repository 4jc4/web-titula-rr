import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/session/current-user';

export default async function HomePage() {
  // Checagem de VERDADE, feita AQUI (não no layout — ver AppLayout).
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-serif text-2xl font-semibold">
        Olá, {user.name.split(' ')[0]}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Bem-vindo ao Titula RR.
      </p>

      <Card className="mt-6">
        <CardContent>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Usuário</dt>
            <dd className="font-mono">{user.username}</dd>
            <dt className="text-muted-foreground">Papéis</dt>
            <dd>{user.papeis.length > 0 ? user.papeis.join(', ') : '—'}</dd>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
