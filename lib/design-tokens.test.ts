import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Guarda de contraste. A convenção "nenhuma cor literal em componente" garante
// que toda cor sai de app/globals.css; este teste garante que o que sai de lá
// é legível.
//
// Sistema de governo: WCAG 2.1 AA é requisito, não preferência. 4.5:1 para
// texto (1.4.3) e 3:1 para o que IDENTIFICA um controle (1.4.11). Sem este
// teste a regra viveria só num comentário — e regra sem guarda decai em
// silêncio, que foi exatamente como o contorno dos campos ficou em 1.30:1.

const CSS = readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8');

function tokens(trecho: string): Record<string, string> {
  const mapa: Record<string, string> = {};
  for (const achado of trecho.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})/g)) {
    const [, nome, hex] = achado;
    if (!(nome in mapa)) mapa[nome] = hex;
  }
  return mapa;
}

const [antesDoDark, depoisDoDark] = CSS.split(
  '@media (prefers-color-scheme: dark)',
);
const claro = tokens(antesDoDark);
// o bloco escuro redefine só parte dos tokens; o resto herda do claro
const escuro = { ...claro, ...tokens(depoisDoDark.split('@theme')[0]) };

function luminancia(hex: string): number {
  const canais = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * canais[0] + 0.7152 * canais[1] + 0.0722 * canais[2];
}

function contraste(a: string, b: string): number {
  const [maior, menor] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (maior + 0.05) / (menor + 0.05);
}

// `bg-destructive/60` no escuro: o fundo que aparece é a mistura com o
// --background, não a cor cheia. Medir a cor cheia dá um falso negativo —
// 3.53:1 contra os 6.97:1 reais.
function mistura(frente: string, fundo: string, alfa: number): string {
  const canal = (hex: string, i: number) => parseInt(hex.slice(i, i + 2), 16);
  return (
    '#' +
    [1, 3, 5]
      .map((i) =>
        Math.round(alfa * canal(frente, i) + (1 - alfa) * canal(fundo, i)),
      )
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
  );
}

function pares(
  t: Record<string, string>,
  temaEscuro: boolean,
): Array<[string, string, string, number]> {
  return [
    ['texto sobre o fundo', t.foreground, t.background, 4.5],
    ['texto sobre card', t.foreground, t.card, 4.5],
    [
      'texto secundário sobre o fundo',
      t['muted-foreground'],
      t.background,
      4.5,
    ],
    ['texto secundário sobre muted', t['muted-foreground'], t.muted, 4.5],
    ['botão primário', t['primary-foreground'], t.primary, 4.5],
    ['badge sucesso', t['success-foreground'], t.success, 4.5],
    ['badge aviso', t['warning-foreground'], t.warning, 4.5],
    ['badge latão', t['brass-foreground'], t.brass, 4.5],
    [
      'badge destrutivo',
      '#ffffff', // Badge e Button do shadcn cravam text-white nessa variante
      temaEscuro ? mistura(t.destructive, t.background, 0.6) : t.destructive,
      4.5,
    ],
    // 1.4.11: o contorno é a única coisa que identifica um campo vazio
    ['contorno de campo', t.input, t.background, 3],
    ['anel de foco', t.ring, t.background, 3],
  ];
}

for (const [tema, tabela, temaEscuro] of [
  ['claro', claro, false],
  ['escuro', escuro, true],
] as const) {
  describe(`contraste — tema ${tema}`, () => {
    for (const [rotulo, texto, fundo, minimo] of pares(tabela, temaEscuro)) {
      it(`${rotulo} ≥ ${minimo}:1`, () => {
        expect(texto, `${rotulo}: token de texto ausente`).toBeDefined();
        expect(fundo, `${rotulo}: token de fundo ausente`).toBeDefined();
        const razao = contraste(texto, fundo);
        expect(
          Number(razao.toFixed(2)),
          `${texto} sobre ${fundo} dá ${razao.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(minimo);
      });
    }
  });
}
