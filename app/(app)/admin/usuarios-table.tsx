'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { adminUsuariosControllerListarV1 } from '@/lib/api/generated/admin-usuarios/admin-usuarios';
import type { PaginaUsuariosDtoOutput } from '@/lib/api/generated/titulaRRAPI.schemas';
import { RevogarSessoesButton } from './revogar-sessoes-button';

export function UsuariosTable({
  initialData,
  pageSize,
  canRevoke,
}: {
  initialData: PaginaUsuariosDtoOutput;
  pageSize: number;
  canRevoke: boolean;
}) {
  const [page, setPage] = useState(1);

  const { data } = useQuery({
    queryKey: ['admin-usuarios', page, pageSize],
    queryFn: async () =>
      (await adminUsuariosControllerListarV1({ page, pageSize })).data,
    // a primeira página já veio da SSR (app/(app)/admin/page.tsx) — evita
    // um refetch imediato no mount só pra repetir o que já temos.
    initialData: page === 1 ? initialData : undefined,
    placeholderData: keepPreviousData,
  });

  const pagina = data ?? initialData;
  const totalPaginas = Math.max(1, Math.ceil(pagina.total / pagina.pageSize));

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-md border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-surface text-left text-ink-soft">
              <th className="px-4 py-2 font-medium">Usuário</th>
              <th className="px-4 py-2 font-medium">Nome</th>
              <th className="px-4 py-2 font-medium">Papéis</th>
              {canRevoke && <th className="px-4 py-2 font-medium">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {pagina.items.map((item) => (
              <tr key={item.id} className="border-b border-line last:border-0">
                <td className="px-4 py-2 font-mono text-ink">
                  {item.username}
                </td>
                <td className="px-4 py-2 text-ink">{item.name}</td>
                <td className="px-4 py-2 text-ink-soft">
                  {item.papeis.join(', ') || '—'}
                </td>
                {canRevoke && (
                  <td className="px-4 py-2">
                    <RevogarSessoesButton
                      userId={item.id}
                      username={item.username}
                    />
                  </td>
                )}
              </tr>
            ))}
            {pagina.items.length === 0 && (
              <tr>
                <td
                  colSpan={canRevoke ? 4 : 3}
                  className="px-4 py-6 text-center text-ink-faint"
                >
                  Nenhum usuário nesta página.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-ink-soft">
        <span>
          Página {pagina.page} de {totalPaginas} — {pagina.total} usuário(s)
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={pagina.page <= 1}
            className="rounded-md border border-line px-3 py-1.5 disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
            disabled={pagina.page >= totalPaginas}
            className="rounded-md border border-line px-3 py-1.5 disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}
