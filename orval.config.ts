import { defineConfig } from 'orval';

// Fonte única do contrato: o OpenAPI que a api-titula-rr publica em
// /api/docs-json (nestjs-zod + cleanupOpenApiDoc do lado de lá). Rodar
// `npm run codegen` de novo sempre que a API mudar — nunca editar nada
// dentro de lib/api/generated à mão, o próximo `codegen` apaga.
//
// client: 'fetch' com um mutator próprio (ver lib/api/mutator.ts) em vez do
// axios padrão do orval: o mutator só sabe fazer fetch same-origin com
// credentials — é para chamada do NAVEGADOR (Client Component / TanStack
// Query). Leitura no servidor (Server Component) que precisa repassar o
// cookie da sessão à mão NÃO passa por aqui — é lib/session/current-user.ts,
// de propósito fora do código gerado (ver o comentário lá).
export default defineConfig({
  titulaRR: {
    input: {
      target:
        process.env.ORVAL_API_URL ?? 'http://localhost:3000/api/docs-json',
    },
    output: {
      mode: 'tags-split',
      target: 'lib/api/generated',
      client: 'fetch',
      httpClient: 'fetch',
      baseUrl: '/', // caminhos relativos: mesma origem via Nginx (prod) ou rewrite do Next (dev)
      clean: true,
      override: {
        mutator: {
          path: './lib/api/mutator.ts',
          name: 'apiFetch',
        },
      },
    },
    // O lint-staged formata o que passa por commit, mas o CI regenera num
    // checkout limpo: sem este hook a saída crua do orval (aspas duplas)
    // diferiria do que está commitado e o job `contrato` acusaria um falso
    // positivo a cada execução.
    hooks: {
      afterAllFilesWrite: 'prettier --write',
    },
  },
});
