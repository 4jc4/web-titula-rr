'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { adminUsuariosControllerRevogarSessoesV1 } from '@/lib/api/generated/admin-usuarios/admin-usuarios';
import { ApiError, unwrap } from '@/lib/api/problem-details';

// Confirmação inline (não modal): a ação derruba o usuário de TODOS os
// dispositivos, merece uma pausa antes de disparar, mas não justifica
// puxar uma lib de dialog só por isto — ver AGENTS.md sobre não adicionar
// dependência de UI kit especulativa.
export function RevogarSessoesButton({
  userId,
  username,
}: {
  userId: string;
  username: string;
}) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => adminUsuariosControllerRevogarSessoesV1(userId),
    onSuccess: (res) => {
      setFeedback(`${unwrap(res).revogadas} sessão(ões) revogada(s).`);
      setConfirming(false);
      // outras linhas/páginas podem estar com dado cacheado desatualizado
      void queryClient.invalidateQueries({ queryKey: ['admin-usuarios'] });
    },
    onError: (err) => {
      setFeedback(
        err instanceof ApiError
          ? (err.problem.detail ?? 'Falha ao revogar as sessões.')
          : 'Falha ao revogar as sessões.',
      );
      setConfirming(false);
    },
  });

  if (feedback) {
    return <span className="text-xs text-ink-faint">{feedback}</span>;
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-2 text-xs">
        <span className="text-ink-soft">Derrubar sessões de {username}?</span>
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="rounded-md bg-bad px-2 py-1 font-medium text-on-bad disabled:opacity-60"
        >
          {mutation.isPending ? 'Revogando…' : 'Confirmar'}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-ink-soft hover:text-ink"
        >
          Cancelar
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="rounded-md border border-line px-2 py-1 text-xs text-ink-soft hover:text-ink"
    >
      Revogar sessões
    </button>
  );
}
