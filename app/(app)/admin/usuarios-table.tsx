'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Papéis</TableHead>
              {canRevoke && <TableHead>Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagina.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono">{item.username}</TableCell>
                <TableCell>{item.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {item.papeis.join(', ') || '—'}
                </TableCell>
                {canRevoke && (
                  <TableCell>
                    <RevogarSessoesButton
                      userId={item.id}
                      username={item.username}
                    />
                  </TableCell>
                )}
              </TableRow>
            ))}
            {pagina.items.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={canRevoke ? 4 : 3}
                  className="py-6 text-center text-muted-foreground"
                >
                  Nenhum usuário nesta página.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span className="tabular-nums">
          Página {pagina.page} de {totalPaginas} — {pagina.total} usuário(s)
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={pagina.page <= 1}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
            disabled={pagina.page >= totalPaginas}
          >
            Próxima
          </Button>
        </div>
      </div>
    </div>
  );
}
