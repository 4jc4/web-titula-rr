import { redirect } from 'next/navigation';
import type { PaginaUsuariosDtoOutput } from '@/lib/api/generated/titulaRRAPI.schemas';
import { getCurrentUser } from '@/lib/session/current-user';
import { podeRevogarSessoes } from '@/lib/session/papeis';
import { apiServerFetch } from '@/lib/session/server-fetch';
import { AccessDenied } from '@/components/access-denied';
import { UsuariosTable } from './usuarios-table';

export const metadata = {
  title: 'Administração — Titula RR',
};

const PAGE_SIZE = 20;

export default async function AdminUsuariosPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // SSR da primeira página — o cliente (UsuariosTable) assume a partir daí
  // via TanStack Query, reaproveitando este resultado como seed.
  const response = await apiServerFetch(
    `/api/v1/admin/usuarios?page=1&pageSize=${PAGE_SIZE}`,
  );

  // 401 não deveria acontecer aqui (getCurrentUser já confirmou sessão),
  // mas cobre a corrida rara de a sessão cair ENTRE as duas chamadas.
  if (response.status === 401) redirect('/login');

  if (response.status === 403) {
    return (
      <AccessDenied message="Você não tem permissão para listar usuários." />
    );
  }

  if (!response.ok) {
    // erro de verdade inesperado — sobe pro error.tsx da rota em vez de
    // fingir que a listagem veio vazia.
    throw new Error(`Falha ao carregar usuários (status ${response.status}).`);
  }

  const initialData = (await response.json()) as PaginaUsuariosDtoOutput;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="font-display text-2xl font-semibold text-ink">Usuários</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Contas provisionadas no sistema.
      </p>

      <div className="mt-6">
        <UsuariosTable
          initialData={initialData}
          pageSize={PAGE_SIZE}
          canRevoke={podeRevogarSessoes(user.papeis)}
        />
      </div>
    </div>
  );
}
