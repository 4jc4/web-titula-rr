# Arquitetura

Como este frontend é feito e por quê. Para as máquinas, ver
[`infrastructure.md`](./infrastructure.md); para como o código chega lá,
[`deployment.md`](./deployment.md); para o que fazer quando algo quebra,
[`runbook.md`](./runbook.md).

## O terreno

Next.js 16 (App Router, TypeScript) servindo a interface do Titula RR na
intranet do governo de Roraima. Ele é **cliente** da
[`api-titula-rr`](https://github.com/4jc4/api-titula-rr) e não funciona
sozinho.

O que ele deliberadamente **não** faz:

- não guarda estado de autenticação próprio — a sessão é um cookie opaco
  emitido e validado inteiramente pela API, sem JWT, sem nada decodificado
  aqui;
- não conhece a matriz de permissões — ela mora só no backend;
- não fala com banco nenhum.

Isso é o que mantém o app pequeno. Toda vez que uma decisão puxa para o outro
lado — "seria mais rápido guardar os papéis num contexto", "dava para
reimplementar a matriz aqui" — a resposta é a mesma: duas fontes de verdade
divergem, e a que fica desatualizada é sempre esta.

## Os dois caminhos até a API — não são intercambiáveis

Esta é a distinção que mais gente erra ao mexer no projeto.

**Do navegador** (Client Components): caminho relativo (`/api/v1/...`), mesma
origem — em dev pelo rewrite do `next.config.ts`, em produção pelo Nginx. O
cookie de sessão viaja sozinho, e nenhum código precisa tocá-lo. É o cliente
gerado pelo orval (`lib/api/generated/`) com o mutator de
`lib/api/mutator.ts`.

**Do servidor** (Server Components que precisam da sessão): a chamada sai do
processo do Next e vai direto à API pela rede interna do Docker
(`API_INTERNAL_URL`), **contornando o Nginx**. Por isso o cookie do request
original não viaja sozinho: precisa ser anexado à mão. É o único trabalho de
`lib/session/server-fetch.ts`, e `getCurrentUser()` é construído sobre ele.

**O cliente gerado nunca deve ser chamado de código de servidor** — ele não
sabe repassar cookie.

## O contrato, e o que ele não carrega

A fonte única é o OpenAPI que a API publica. O `orval` gera tipos e cliente a
partir dele em `lib/api/generated/`, que **é commitado** — assim lint,
typecheck, build e testes unitários não dependem da API estar no ar. Nada ali
dentro se edita à mão; o próximo `codegen` apaga.

Desde 01/09/2026 a API versiona `openapi/openapi.json` e falha o próprio CI se
o arquivo divergir do código. Isso permite gerar sem subir nada:

```bash
ORVAL_API_URL=../api-titula-rr/openapi/openapi.json npm run codegen
```

O que o contrato **não** carrega, e já custou caro:

- **A matriz de permissões.** Ela mora só no backend, e este lado só a
  aproxima (ver adiante). Em 30/08/2026 a API moveu `usuario:listar` de
  `gestor` para `administrador`; este repositório ficou dois dias mostrando um
  link que a API recusava.
- **As fixtures do validador fake.** `dev.gestor`, `dev.admin`,
  `dev.titulacao` e os nomes delas são contrato entre os dois repositórios
  tanto quanto o OpenAPI — só que informal e sem guarda nenhuma. Um teste e2e
  daqui quebrou porque a API renomeou o `name` de uma fixture.
- **O nome do cookie de sessão.** Duplicado à mão em
  `lib/session/constants.ts`, com a justificativa registrada lá.

## Sessão

O `proxy.ts` (o nome que o `middleware.ts` recebeu no Next 16 — mesmo
mecanismo) faz uma checagem **otimista**: existe cookie de sessão? Serve só
para evitar o flash de tela protegida. Nunca é a fronteira de segurança — só a
`SessionGuard` da API sabe se um token é válido, então um cookie presente mas
expirado passa por aqui e só é barrado quando `getCurrentUser()` recebe 401.

O matcher exclui `/api/*` de propósito: sem isso, o próprio POST de login —
que por definição ainda não tem cookie — seria redirecionado para `/login`
como se fosse navegação de página, e o fetch quebraria.

**Login e logout são fetch do cliente, não Server Action.** O guia de
autenticação do Next pressupõe que o Next é dono da sessão (criptografa,
chama `cookies().set()`). Aqui não é: quem emite o `Set-Cookie` é a API. Numa
Server Action esse header chegaria ao **servidor** do Next, não ao navegador, e
teria de ser reserializado à mão, reimplementando `httpOnly`, `Secure` e
`SameSite` que já vêm certos da API.

**A checagem de verdade é de cada página, não do layout.** O `AppLayout` só
desenha a casca; quem redireciona é a página. Layout não re-renderiza em
navegação entre rotas irmãs, então um redirect só ali deixaria uma sessão
caída grudada na tela até o próximo load inteiro.

## Autorização: o gate é cosmético

`lib/session/papeis.ts` decide o que a navegação mostra e que botões
renderizam — **por papel**, não pela matriz real. Copiar a matriz para cá seria
dívida que descasa a cada mudança no backend.

Toda página protegida confere de verdade: `app/(app)/admin/page.tsx` renderiza
`<AccessDenied>` diante de um 403 legítimo. Chegar à rota digitando a URL, por
fora do link escondido, continua dando a resposta certa.

O corolário operacional: **mudou permissão na API, releia este arquivo no
mesmo PR**. É o que não aconteceu em 30/08.

## Erros: um formato, um parser

Toda resposta de erro da API é RFC 7807 (`application/problem+json`).
`lib/api/problem-details.ts` é o parser único, usado tanto pelo mutator do
cliente gerado quanto pelas leituras manuais do servidor — não existe
tratamento de erro rota a rota.

Duas sutilezas moram ali. O parser nunca assume que o corpo é JSON válido: um
502 do Nginx antes de chegar à API não vem em `problem+json` nenhum. E o
mutator **nunca devolve** um erro como dado — sempre lança `ApiError`, porque
o OpenAPI documenta alguns status de erro sem schema de corpo e o orval os
tipa como `data: void`, o que não corresponde à realidade.

## Renderização

**Cache Components (PPR) desligado de propósito.** Quase toda página depende de
`cookies()`, então sobra pouca casca estática que valha prerenderizar e
compartilhar entre usuários. O modelo dinâmico por padrão é o certo aqui, não
um esquecimento.

**SSR primeiro, cliente depois.** A página de administração busca a primeira
página de usuários no servidor e entrega o resultado ao `UsuariosTable` como
`initialData` do TanStack Query — sem refetch imediato no mount só para repetir
o que já se tem.

## Três coisas diferentes chamadas "saúde"

| Rota          | De quem              | Para quem                                                       |
| ------------- | -------------------- | --------------------------------------------------------------- |
| `/healthz`    | do processo Next     | do orquestrador — HEALTHCHECK do compose e health check do CD   |
| `/status`     | da API, para leitura | de gente — mostra estado real, inclusive quando a API está fora |
| `/api/health` | da API               | de tudo, é o endpoint dela                                      |

`/healthz` nunca toca a API de propósito: um container web saudável não deve
entrar em laço de restart porque a API caiu — reiniciar o Next não conserta a
API, só gera ruído.

`/status` é o oposto: precisa mostrar o estado ruim. Por isso ele **não** passa
pelo cliente gerado nem pelo mutator (que trataria 503 como falha e jogaria
fora o corpo), e por isso a página trata o caso de a API estar completamente
inalcançável — quando o fetch em si lança e não há resposta para ler. Sem isso,
a página quebraria com 500 justamente na hora em que "a API caiu" é a
informação que quem olha essa tela precisa ver.

## Interface

Três peças, e a ordem entre elas importa.

**Tailwind CSS 4**, configurado dentro do CSS — não há `tailwind.config.js`.

**Design tokens** em `app/globals.css`, em `:root` e no bloco de
`prefers-color-scheme: dark`. A regra é dura: nenhuma cor ou família de fonte
aparece como literal em componente nenhum, sempre pela variável, através das
classes utilitárias que o `@theme inline` gera.

**shadcn/ui** em `components/ui/`, adotado em 02/09/2026. Os componentes são
**copiados para o repositório**, não instalados como biblioteca: eles são
nosso código, passam pelo lint e pelo prettier, e editá-los é o uso previsto —
o `badge.tsx` já carrega duas variantes que não existem no registro.

O ponto que decide tudo isso é o **vocabulário dos tokens**. O shadcn espera
nomes próprios (`background`, `foreground`, `primary`, `muted`, `border`,
`ring`, `destructive`), e o projeto adotou esse vocabulário para que qualquer
componente do registro caia no lugar sem tradução. A **paleta**, essa continua
sendo a do projeto — "tinta de agrimensor" no `primary`, "latão de instrumento
de topografia" no `brass`.

Há uma armadilha nessa adoção que vale conhecer: no vocabulário do shadcn,
`--accent` significa _superfície discreta de hover_, não cor de marca — o que
o projeto chamava de accent virou `--primary`. Rodar `npx shadcn init` por
cima escreveria o bloco padrão e trocaria o significado de `--accent` em
silêncio, sem erro de compilação e sem teste quebrando. Por isso a fundação
foi escrita à mão e o `init` nunca foi rodado.

Três tokens são extensão nossa, onde o vocabulário do shadcn é omisso:
`--success` e `--warning`, porque o painel de status tem três estados e o
registro só oferece `--destructive`; e `--brass`, a segunda cor de marca, que
não virou `--secondary` porque ali o shadcn espera uma superfície discreta e
latão seria alto demais.

## Testes

- **Unitários** (Vitest): funções puras e um teste de componente para o
  `LoginForm`. Sem `test.globals`, e o `cleanup()` é explícito no
  `vitest.setup.ts` — sem ele os testes vazam um para o outro.
- **e2e** (Playwright): contra a `api-titula-rr` **de verdade**, não mocks.
  Nove testes, em série, com um worker: os specs de admin mexem no mesmo
  usuário fixture entre arquivos, e paralelismo ali vira corrida.

Em CI o Playwright builda o frontend e serve o build de produção, não o dev
server — pega quebra que só aparece no build. E desde 01/09/2026 o reporter
`github` escreve cada falha como anotação do Actions, com arquivo, linha e
mensagem: sem ele o motivo de uma falha só existe dentro do texto do log, que
o GitHub guarda num blob fora do alcance de quem lê o repositório pela API.

## Decisões que parecem estranhas e não são

- **A porta 3001** existe para que API (3000) e frontend rodem lado a lado na
  mesma máquina de desenvolvimento. Em produção o container escuta 3000
  internamente e o host mapeia 3001.
- **`npm run typecheck` roda `next typegen` antes do `tsc`.** Os tipos globais
  de rota (`LayoutProps`, `PageProps`) só existem depois de um `dev`, `build`
  ou `typegen` — num checkout limpo, `tsc` sozinho falha. Isso já quebrou o CI
  uma vez; não "simplifique" de volta.
- **O cliente gerado é commitado.** Custa ruído no diff e paga não precisar da
  API no ar para lint, typecheck, build e unitários.
