// Precisa bater com SESSION_COOKIE em auth.constants.ts na api-titula-rr.
// Duplicado aqui de propósito (não dá pra importar um arquivo TS do
// backend) — mudou lá, muda aqui, os dois lados são pequenos o bastante
// pra não precisar de um pacote compartilhado só por causa disto.
export const SESSION_COOKIE = 'session';
