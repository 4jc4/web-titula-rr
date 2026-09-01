import { describe, expect, it } from 'vitest';
import { podeListarUsuarios, podeRevogarSessoes } from './papeis';

// A matriz de verdade mora na api-titula-rr (MATRIZ_PERMISSOES). Estes
// testes fixam o que ESTE lado aproxima — se a API mudar a matriz de novo,
// é aqui que a divergência aparece antes de chegar no navegador de alguém.

describe('podeListarUsuarios', () => {
  it('libera administrador', () => {
    expect(podeListarUsuarios(['administrador'])).toBe(true);
  });

  it('nega gestor — chefia imediata é autoridade sobre processo, não conta', () => {
    expect(podeListarUsuarios(['gestor'])).toBe(false);
  });

  it('nega gestor somado ao papel de setor (o caso real do dev.gestor)', () => {
    // `gestor` nunca vem sozinho no AD: é um nível que soma ao papel de
    // setor. Somar não pode virar permissão que nenhum dos dois tem.
    expect(podeListarUsuarios(['governanca', 'gestor'])).toBe(false);
  });

  it('nega papel de setor puro e conta sem papel', () => {
    expect(podeListarUsuarios(['titulacao'])).toBe(false);
    expect(podeListarUsuarios([])).toBe(false);
  });
});

describe('podeRevogarSessoes', () => {
  it('libera só administrador', () => {
    expect(podeRevogarSessoes(['administrador'])).toBe(true);
  });

  it('nega gestor', () => {
    expect(podeRevogarSessoes(['gestor'])).toBe(false);
  });

  it('nega quem não tem papel nenhum', () => {
    expect(podeRevogarSessoes([])).toBe(false);
  });
});
