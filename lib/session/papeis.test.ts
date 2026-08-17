import { describe, expect, it } from 'vitest';
import { podeListarUsuarios, podeRevogarSessoes } from './papeis';

describe('podeListarUsuarios', () => {
  it('libera gestor', () => {
    expect(podeListarUsuarios(['gestor'])).toBe(true);
  });

  it('libera administrador', () => {
    expect(podeListarUsuarios(['administrador'])).toBe(true);
  });

  it('nega quem não tem nenhum dos dois papéis', () => {
    expect(podeListarUsuarios(['titulacao'])).toBe(false);
    expect(podeListarUsuarios([])).toBe(false);
  });
});

describe('podeRevogarSessoes', () => {
  it('libera só administrador', () => {
    expect(podeRevogarSessoes(['administrador'])).toBe(true);
  });

  it('nega gestor — tem usuario:listar mas não sessao:revogar', () => {
    expect(podeRevogarSessoes(['gestor'])).toBe(false);
  });

  it('nega quem não tem papel nenhum', () => {
    expect(podeRevogarSessoes([])).toBe(false);
  });
});
