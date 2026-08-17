import type { PublicUserDtoOutputPapeisItem } from '@/lib/api/generated/titulaRRAPI.schemas';

// Gate GROSSO, só de UX (mostrar/esconder link de nav, botão de ação) —
// nunca a fonte de verdade. A matriz real (MATRIZ_PERMISSOES) mora só no
// backend; manter uma cópia fiel dela aqui seria dívida técnica que
// descasa a cada mudança de permissão na API. Por isso o gate é por
// PAPEL (largo), não por permissão (fino): aproxima usuario:listar e
// sessao:revogar sem fingir que sabe a matriz inteira. A resposta 403 da
// API é sempre a palavra final — ver AccessDenied e o catch de ApiError.
export function podeListarUsuarios(
  papeis: PublicUserDtoOutputPapeisItem[],
): boolean {
  return papeis.includes('gestor') || papeis.includes('administrador');
}

export function podeRevogarSessoes(
  papeis: PublicUserDtoOutputPapeisItem[],
): boolean {
  return papeis.includes('administrador');
}
