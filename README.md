# Circuito

Circuito é um assistente em formato de chat que leva quem nunca montou um computador até uma
lista de peças compatíveis, dentro do orçamento, com preços e cupons atuais e explicações em
linguagem simples.

A especificação completa do projeto (visão geral, jornada do usuário, regras de triagem, motor
de montagem, catálogo, preços, camada de LLM, arquitetura e roadmap) está em
[PLANEJAMENTO.md](PLANEJAMENTO.md).

## Estrutura do repositório

```
.
├── backend/
│   ├── catalogo/    peças em JSON, curadas (ver seção "Catálogo de peças")
│   └── src/         sessoes, triagem, catalogo, pesquisa, ...
├── frontend/        Interface React + Vite (src/)
├── docker-compose.yml
├── PLANEJAMENTO.md
└── README.md
```

`backend/` e `frontend/` são projetos independentes, cada um com seu próprio `package.json`.
Eles só se comunicam por HTTP: o frontend chama a API do backend, e nada além disso.

## Pré-requisitos

- Node.js 20 ou superior
- npm

## Executando localmente

### Backend (API NestJS)

```bash
cd backend
cp .env.example .env
npm install
npm run start:dev
```

A API sobe em `http://localhost:3000`. Variáveis de ambiente (ver `.env.example`):

- `PORT`: porta da API (padrão 3000)
- `FRONTEND_URL`: origem liberada no CORS (padrão `http://localhost:5173`)
- `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `LOJAS_PERMITIDAS`, `FABRICANTES_PERMITIDOS`,
  `OFERTAS_TTL_HORAS`, `FICHAS_TTL_DIAS`: usadas só pelo módulo `pesquisa` (ver seção
  "Pesquisa com IA"). Sem `ANTHROPIC_API_KEY`, os endpoints `/pesquisa/*` respondem 503 e o
  resto da API funciona normalmente.

### Frontend (React + Vite)

Em outro terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

A interface abre em `http://localhost:5173`. Variável de ambiente (ver `.env.example`):

- `VITE_API_URL`: URL base da API (padrão `http://localhost:3000`)

Com os dois servidores no ar, abra `http://localhost:5173` no navegador para conversar com o
assistente.

## Executando com Docker

Backend e frontend rodam em containers separados, cada um com sua própria imagem e seu próprio
build de produção (o `dist/` puro, não o servidor de desenvolvimento).

```bash
docker compose up --build
```

- Backend: imagem `node:20-alpine` em duas etapas — compila o TypeScript e, na imagem final,
  roda só `dist/` com as dependências de produção (`node dist/main`). Publicado em
  `http://localhost:3000`.
- Frontend: imagem em duas etapas — o Vite gera o `dist/` estático e a imagem final é um
  `nginx:alpine` servindo só esses arquivos. Publicado em `http://localhost:5173`.

A variável `VITE_API_URL` do frontend é embutida no bundle em tempo de build (o código roda no
navegador do usuário, não dentro do container), então ela é passada como build arg no
`docker-compose.yml` — ajuste lá se a API for publicada em outro host ou porta. A variável
`FRONTEND_URL` do backend (usada no CORS) é passada em tempo de execução, como variável de
ambiente do container.

Para derrubar os containers:

```bash
docker compose down
```

## Catálogo de peças

O projeto mantém um catálogo próprio em `backend/catalogo/<categoria>.json`, com as
especificações que as regras de compatibilidade usam. Cada peça guarda as fontes (URL e data),
o trecho literal da página de onde cada campo saiu e notas sobre o que ficou incerto.

- Estado atual: 9 peças de piloto (uma por categoria, mais um segundo processador), todas como
  `rascunho` — ainda não revisadas por uma pessoa contra a fonte.
- Validar: `npm run catalogo:validar` (dentro de `backend/`).
- Como revisar e adicionar peças: veja [backend/catalogo/LEIAME.md](backend/catalogo/LEIAME.md).
- Preços e histórico de preço não ficam no catálogo; vão para um banco de dados em etapa futura.

## Pesquisa com IA (ficha técnica e preços)

A IA pesquisa, o código confere. O módulo `pesquisa` (`backend/src/pesquisa/`) usa a ferramenta
de busca na web da API da Anthropic, limitada a listas de domínios, e nada que a IA devolver é
aceito sem verificação:

- **Ficha técnica:** vem de páginas de fabricantes. Exige ao menos uma fonte cuja URL tenha
  aparecido nos resultados da busca e todos os campos obrigatórios da categoria.
- **Compatibilidade:** regras em código (soquete, DDR, comprimento da placa de vídeo, altura do
  cooler, potência da fonte, slots M.2), com testes — a IA não decide compatibilidade.
- **Preços:** a oferta só é aceita se a loja estiver na lista permitida, a URL vier dos
  resultados da busca e o preço for um número positivo em reais.
- Cache em memória por peça (padrão: 6h para preços, 30 dias para fichas — `OFERTAS_TTL_HORAS`
  e `FICHAS_TTL_DIAS`).

Limitações conhecidas: a análise recebe a lista de peças pronta — a escolha das peças a partir
do perfil da triagem (o motor de montagem) ainda não existe. As listas de lojas e fabricantes
são iniciais e precisam de revisão.

## Testes

```bash
cd backend
npm test             # testes unitários (triagem, sessões, catálogo, compatibilidade)
npm run test:e2e     # fluxo completo da API via HTTP
npm run catalogo:validar  # valida os JSONs do catálogo
```

O frontend ainda não tem testes automatizados; a verificação hoje é `npm run build` (checagem
de tipos) e `npm run lint`.

## Estado atual

**Fase 1 — fundação e triagem: concluída.**

- Backend e frontend isolados, cada um com build e testes próprios.
- Chat funcional: o usuário responde às 7 perguntas da triagem por regras (sem LLM) e recebe o
  resumo do perfil ao final.
- Resposta inválida repete a mesma pergunta com uma mensagem de erro, sem avançar o progresso.
- Sessões ficam em memória no backend e somem ao reiniciar a API — não há banco de dados ainda.
- Interface acessível por padrão (navegação por teclado, rótulos, barra de progresso anunciada
  a leitores de tela) e com tema claro/escuro seguindo a preferência do sistema.

- Catálogo de peças (`backend/catalogo/`) e módulo de pesquisa com IA (`backend/src/pesquisa/`)
  existem como piloto: 9 peças em `rascunho`, regras de compatibilidade testadas, e endpoints
  `/pesquisa/*` que buscam ficha técnica/preços via Anthropic quando `ANTHROPIC_API_KEY` está
  configurada. Nenhum dos dois está ligado à triagem ainda.

**Ainda não implementado** (ver roadmap em [PLANEJAMENTO.md](PLANEJAMENTO.md)): motor de
montagem (ligar o perfil da triagem ao catálogo e à pesquisa), cupons, banco de dados
(PostgreSQL/Redis) e integração contínua.

## Licença

A definir.
