'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { adminUsuariosControllerRevogarSessoesV1 } from '@/lib/api/generated/admin-usuarios/admin-usuarios';
import { ApiError, unwrap } from '@/lib/api/problem-details';

// A ação derruba o usuário de TODOS os dispositivos e não tem desfazer —
// merece uma parada antes de disparar. Era uma confirmação inline enquanto
// não havia biblioteca de diálogo no projeto; com o shadcn adotado
// (02/09/2026) o AlertDialog passou a ser o caminho de menos resistência, e
// ele traz de graça o que a versão inline não tinha: foco preso no diálogo,
// Esc para cancelar e os papéis ARIA certos para leitor de tela.
export function RevogarSessoesButton({
  userId,
  username,
}: {
  userId: string;
  username: string;
}) {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => adminUsuariosControllerRevogarSessoesV1(userId),
    onSuccess: (res) => {
      setFeedback(`${unwrap(res).revogadas} sessão(ões) revogada(s).`);
      // outras linhas/páginas podem estar com dado cacheado desatualizado
      void queryClient.invalidateQueries({ queryKey: ['admin-usuarios'] });
    },
    onError: (err) => {
      setFeedback(
        err instanceof ApiError
          ? (err.problem.detail ?? 'Falha ao revogar as sessões.')
          : 'Falha ao revogar as sessões.',
      );
    },
  });

  if (feedback) {
    return <span className="text-xs text-muted-foreground">{feedback}</span>;
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="xs">
          Revogar sessões
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Derrubar sessões de {username}?</AlertDialogTitle>
          <AlertDialogDescription>
            Todas as sessões ativas desse usuário são encerradas em todos os
            dispositivos. Ele precisará entrar de novo. Não há desfazer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Revogando…' : 'Confirmar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
