import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

// Sem `test.globals: true` no vitest.config.ts de propósito (mesmo estilo
// do resto do projeto: imports explícitos, nada de global implícito) — o
// Testing Library só registra o cleanup automático sozinho quando detecta
// um afterEach GLOBAL. Sem isso, cada teste do mesmo arquivo empilha o
// render do anterior (ex.: dois botões "Entrar" na tela ao mesmo tempo).
afterEach(() => {
  cleanup();
});
