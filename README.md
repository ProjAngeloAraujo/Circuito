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
├── backend/   API NestJS (src/sessoes, src/triagem, ...)
├── frontend/  Interface React + Vite (src/)
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

## Testes

```bash
cd backend
npm test        # testes unitários (regras de triagem, sessões)
npm run test:e2e  # fluxo completo da API via HTTP
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

**Ainda não implementado** (ver roadmap em [PLANEJAMENTO.md](PLANEJAMENTO.md)): catálogo de
peças, motor de montagem, coleta de preços e cupons, camada de explicação por LLM, banco de
dados (PostgreSQL/Redis) e integração contínua.

## Licença

A definir.
