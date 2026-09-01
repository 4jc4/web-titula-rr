import type { PublicUserDtoOutputPapeisItem } from '@/lib/api/generated/titulaRRAPI.schemas';

// Gate GROSSO, só de UX (mostrar/esconder link de nav, botão de ação) —
// nunca a fonte de verdade. A matriz real (MATRIZ_PERMISSOES) mora só no
// backend; manter uma cópia fiel dela aqui seria dívida técnica que
// descasa a cada mudança de permissão na API. Por isso o gate é por
// PAPEL (largo), não por permissão (fino): aproxima usuario:listar e
// sessao:revogar sem fingir que sabe a matriz inteira. A resposta 403 da
// API é sempre a palavra final — ver AccessDenied e o catch de ApiError.
//
// ATENÇÃO: aproximar não isenta de conferir. Este arquivo ficou dois dias
// contradizendo a API — `gestor` mostrava o link de Administração e levava
// 403 — porque a matriz mudou lá e ninguém releu isto aqui. Mudou permissão
// na api-titula-rr? Releia estas funções no mesmo PR.
//
// As duas são idênticas HOJE porque a matriz dá usuario:listar e
// sessao:revogar ao mesmo papel. Continuam separadas de propósito: são
// aproximações de permissões diferentes, que podem voltar a divergir.
export function podeListarUsuarios(
  papeis: PublicUserDtoOutputPapeisItem[],
): boolean {
  // `gestor` NÃO entra: é nível de chefia imediata, autoridade sobre
  // processo (Art. 80, processo:arquivar) e não sobre contas — a matriz da
  // API põe usuario:listar só em `administrador`.
  return papeis.includes('administrador');
}

export function podeRevogarSessoes(
  papeis: PublicUserDtoOutputPapeisItem[],
): boolean {
  return papeis.includes('administrador');
}
