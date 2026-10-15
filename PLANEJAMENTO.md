# Circuito: planejamento do projeto

Este documento registra as decisões de projeto e arquitetura do Circuito. É atualizado na
mesma mudança que altera o comportamento do sistema.

## 1. Visão geral

O projeto é um assistente em formato de chat que leva quem nunca montou um computador até uma
lista de peças compatíveis, dentro do orçamento, com preços e cupons atuais e explicações em
linguagem simples.

**Problema.** Montar o primeiro PC é confuso: soquete, tipo de memória, potência da fonte e o
que vale a pena em cada faixa de preço. Listas prontas envelhecem rápido e comparar preços em
várias lojas toma tempo.

**Objetivo.** Ajudar o usuário de forma fluida, acessível e legível, a partir de uma triagem de
perfil, e entregar a configuração peça por peça com dados verificáveis.

**O que o sistema entrega ao final.**

- Um perfil do usuário (uso, orçamento, preferências) obtido por perguntas curtas
- Uma configuração completa e compatível, com o total dentro do orçamento
- Para cada peça: a melhor oferta encontrada, a loja, o link, o cupom aplicável e uma
  explicação de por que ela foi escolhida
- A fonte e a data de coleta de cada preço

**Fora do escopo do MVP.** Compra dentro da plataforma, tutorial de montagem física, notebooks
e periféricos.

## 2. Público e princípios de experiência

O público principal é quem vai montar o primeiro PC e não conhece hardware. Usuários que já
entendem o básico também devem ser atendidos, com explicações menos detalhadas.

A experiência segue cinco princípios:

1. **Uma pergunta por vez.** Mensagens curtas, sem formulários longos.
2. **Resposta rápida primeiro.** Botões para as opções comuns e texto livre só quando
   necessário, como no orçamento.
3. **Linguagem simples.** Termos técnicos aparecem sempre acompanhados de uma explicação curta.
4. **Transparência.** Todo preço mostra a loja e a data da coleta, e todo cupom mostra a
   validade.
5. **Acessível por padrão.** Contraste adequado, navegação por teclado, leitor de tela e tema
   claro e escuro.

## 3. Jornada do usuário

```
Abre o chat → Triagem por regras (7 perguntas validadas) → Perfil e resumo → Motor de montagem
  → Cabe no orçamento? → [não: diz o que ajustar, usuário refaz a triagem]
                        → [sim: preços e cupons → explicação do LLM → lista final com fonte e data]
```

A triagem repete a pergunta quando a resposta é inválida. Se o orçamento não comporta uma
configuração compatível, o usuário é orientado a ajustar e refaz a triagem.

**Implementado:** abrir o chat, triagem por regras, perfil e resumo.
**A construir:** motor de montagem, preços e cupons, explicação do LLM, lista final.

## 4. Triagem

A triagem é uma máquina de estados por regras, sem LLM: faz sete perguntas em ordem fixa e
termina em um perfil validado. **Implementada** em `backend/src/triagem/`.

| # | Pergunta | Tipo | Opções ou formato | Efeito na montagem |
|---|----------|------|--------------------|---------------------|
| 1 | Uso principal | Opções | Jogos; Estudo e trabalho; Edição de vídeo e imagem; Programação | Define a prioridade entre CPU, GPU e RAM |
| 2 | Orçamento total | Número | R$ 1.500 a R$ 100.000 | Define a distribuição de custo por peça |
| 3 | O que já possui | Opções | Nada; Só o monitor; Monitor, teclado e mouse | Reduz o valor a alocar |
| 4 | Preferência de processador | Opções | Intel; AMD; Tanto faz | Filtra CPU e plataforma |
| 5 | Estética | Opções | Quero RGB; Prefiro discreto; Tanto faz | Filtra gabinete |
| 6 | Prioridade | Opções | Desempenho agora; Margem para upgrade | Orienta a escolha da plataforma |
| 7 | Nível de conhecimento | Opções | Sou iniciante; Já entendo o básico | Ajusta o tom das explicações |

**Regras de validação.**

- Resposta em opções é aceita pelo valor ou pelo rótulo, sem diferenciar maiúsculas e acentos.
- O orçamento aceita formatos como `5000`, `5.000` e `R$ 5.000,00`. Valores fora da faixa são
  recusados com uma mensagem explicando o limite.
- Resposta inválida repete a mesma pergunta com a mensagem de erro e não avança o progresso.
- O texto da resposta tem no máximo 200 caracteres.

**Resultado.** Um perfil estruturado com os sete campos e um resumo legível, exibido ao usuário
ao final da triagem.

**Previsto, ainda não implementado.** Um campo opcional para jogos ou programas específicos,
que ajusta os requisitos mínimos.

## 5. Motor de montagem *(a construir)*

O motor de montagem escolhe as peças por regras e dados de catálogo, nunca por um LLM, porque
compatibilidade não pode depender de um palpite. Ele recebe o perfil da triagem e devolve uma
configuração completa dentro do orçamento.

**Alocação de orçamento.** Cada perfil de uso tem percentuais iniciais por categoria de peça,
ajustáveis. Para jogos, a maior fatia vai para a GPU. Para edição de vídeo, para CPU e RAM. Para
uso de escritório, a GPU integrada pode bastar. Os percentuais exatos serão definidos com
pesquisa e testes. O que o usuário já possui é descontado antes da divisão.

**Regras de compatibilidade.** Cada regra é uma função pura e testável que devolve a mensagem
de por que uma combinação foi rejeitada.

| Regra | O que verifica |
|---|---|
| CPU e placa-mãe | Soquete e suporte do chipset |
| RAM e placa-mãe | Tipo (DDR4 ou DDR5) e quantidade de slots |
| GPU e gabinete | Comprimento máximo da placa de vídeo |
| Cooler | Altura no gabinete e suporte ao soquete da CPU |
| Fonte | Potência total estimada com margem e conectores exigidos pela GPU |
| Armazenamento e placa-mãe | Slots M.2 e portas SATA |
| Equilíbrio CPU e GPU | Ausência de gargalo para o perfil de uso |

**Resultado esperado.** Uma lista com uma peça por categoria, o total, a folga em relação ao
orçamento e, quando não houver combinação possível, uma mensagem dizendo qual restrição
impediu e o que o usuário pode ajustar.

## 6. Catálogo de peças *(piloto implementado)*

O catálogo guarda as especificações técnicas de cada peça e é a base das regras de
compatibilidade, então um erro de especificação gera uma recomendação errada. Por isso ele é
curado e revisado, nunca importado às cegas.

**Estado real.** `backend/catalogo/<categoria>.json` tem 9 peças piloto (uma por categoria, mais
um segundo processador), todas com `status: "rascunho"` — coletadas automaticamente a partir de
páginas de fabricante, mas **ainda não revisadas por uma pessoa**. `backend/src/catalogo/`
carrega e valida esses arquivos (`npm run catalogo:validar`); a validação e os campos
obrigatórios por categoria vivem em `backend/src/pesquisa/campos.ts` e
`catalogo.validacao.ts`. O processo de revisão está documentado em
[backend/catalogo/LEIAME.md](backend/catalogo/LEIAME.md). O catálogo ainda não está ligado à
triagem nem a um motor de montagem.

**Categorias.** Processador, placa-mãe, memória RAM, placa de vídeo, armazenamento, fonte,
gabinete e cooler.

**Campos mínimos de cada peça.** Identificador, categoria, marca, modelo e especificações em
formato estruturado, como soquete, tipo de memória, comprimento, consumo e conectores, conforme
a categoria.

**Evolução em duas etapas.**

1. **MVP:** catálogo curado manualmente em arquivo de seed, com algumas dezenas de peças
   representativas das faixas de orçamento aceitas pela triagem.
2. **Depois:** importação de fontes estruturadas, sempre seguida de revisão manual das
   especificações antes de a peça entrar no catálogo.

**Regra de qualidade.** Peça com especificação incompleta não participa da montagem.

## 7. Preços e cupons *(a construir — piloto alternativo em avaliação)*

O sistema pesquisa preços e cupons em fontes confiáveis e entrega cada dado com origem e data,
para que o usuário possa conferir antes de comprar. A coleta roda em segundo plano e o chat
consulta o resultado já guardado.

**Nota.** Existe um piloto em `backend/src/pesquisa/` que ataca o mesmo problema por um caminho
diferente do descrito abaixo: em vez de coletores próprios por loja, ele usa a ferramenta de
busca na web da API da Anthropic (`AnthropicService`), restrita por `LOJAS_PERMITIDAS` e
`FABRICANTES_PERMITIDOS`, com as mesmas garantias de verificação (URL precisa ter vindo da
busca, preço precisa ser numérico, cupom precisa ter origem/validade) e cache em memória, não
em banco. Compatibilidade continua decidida só em código
(`backend/src/pesquisa/compatibilidade.ts`), nunca pela IA. Isso ainda não está integrado à
triagem/sessão, e a decisão entre os dois caminhos (coletores próprios vs. busca via IA) é uma
decisão em aberto — ver seção 13.

**Fontes candidatas.** Lojas brasileiras de hardware, como KaBuM!, Pichau e Terabyte,
marketplaces como Amazon Brasil e Mercado Livre, comparadores de preço e comunidades de
promoções. Nenhuma fonte entra antes de verificar os termos de uso e o `robots.txt`.

**Como coletar, em ordem de preferência.**

1. API oficial, feed de afiliado ou dados que a loja permita usar
2. Comparadores que autorizem o uso dos dados
3. Scraping, somente quando os termos e o `robots.txt` permitirem, com limite de requisições

**Dados guardados por oferta.** Peça, loja, URL, preço, disponibilidade e data e hora da
coleta. O histórico fica no banco para mostrar variação de preço.

**Cupons.** Só entram com origem, regra de uso e validade registradas. Cupom vencido ou sem
regra clara não é exibido.

**Frescor.** Cada oferta tem uma idade. Acima de um limite definido, o cartão da peça marca o
preço como desatualizado e a interface avisa para confirmar na loja.

**Escolha da melhor oferta.** Entre as lojas confiáveis com a peça disponível, vence o menor
preço final depois do cupom. A tela sempre mostra as alternativas mais próximas.

**Atualização.** Jobs agendados por loja, com cache para as consultas do chat. A consulta em
tempo real fica como reserva quando o dado guardado estiver velho demais.

## 8. Camada de LLM *(a construir)*

O LLM só explica: ele recebe a configuração já montada e a transforma em texto claro para o
usuário. Ele não escolhe peças, não calcula compatibilidade e não busca preço.

**O que ele faz.**

- Explica cada peça em linguagem simples, incluindo por que ela foi escolhida e não uma opção
  mais barata
- Responde dúvidas de iniciante sobre a configuração gerada
- Adapta o tom ao nível de conhecimento informado na triagem

**O que ele não faz.** Alterar a lista de peças, criar ou arredondar preços, citar loja ou
cupom que não esteja nos dados recebidos.

**Garantias técnicas.**

1. O contexto enviado é fechado: peças, preços, fontes e perfil, e mais nada.
2. O prompt proíbe citar item que não esteja no contexto.
3. A saída é validada: todo nome de peça e todo número citado precisa existir na configuração.
   Se a validação falhar, a resposta é descartada e o usuário recebe a explicação padrão por
   regras.
4. As explicações são guardadas em cache por configuração para reduzir custo e tempo de
   resposta.

**Integração.** API da Anthropic, chamada apenas pelo módulo de explicação do backend. A chave
fica em variável de ambiente e nunca chega ao frontend.

## 9. Backend (NestJS)

O backend é um projeto NestJS em TypeScript na pasta `backend/`, isolado do frontend: tem o
próprio `package.json` e só conversa com ele por HTTP, com CORS liberado para a origem
configurada.

### Módulos

| Módulo | Responsabilidade | Estado |
|---|---|---|
| `sessoes` | Endpoints do chat e controle da sessão | Implementado, em memória |
| `triagem` | Perguntas, validação das respostas e resumo do perfil | Implementado |
| `catalogo` | Peças e especificações | Piloto (9 peças, `rascunho`, sem ligação à triagem) |
| `pesquisa` | Ficha técnica, preços e compatibilidade via IA + regras em código | Piloto (não previsto na arquitetura original da seção 9; ver seção 7) |
| `montagem` | Alocação de orçamento e regras de compatibilidade | A fazer |
| `precos` | Coletores, cache, histórico de preços e cupons | A fazer (ver nota na seção 7 sobre o piloto `pesquisa`) |
| `explicacao` | Integração com o LLM e validação da saída | A fazer |
| `jobs` | Filas e agendamentos de coleta | A fazer |

### Endpoints

| Método | Rota | Descrição | Estado |
|---|---|---|---|
| GET | `/health` | Verifica se a API está no ar | Implementado |
| POST | `/sessoes` | Cria a sessão e devolve a primeira pergunta | Implementado |
| GET | `/sessoes/:id` | Estado atual da sessão | Implementado |
| POST | `/sessoes/:id/mensagens` | Recebe a resposta e devolve a próxima pergunta, o erro de validação ou o resumo | Implementado |
| GET | `/sessoes/:id/configuracao` | Configuração atual com preços e fontes | Previsto |
| GET | `/pecas/:id/ofertas` | Ofertas e histórico de preço da peça | Previsto |
| POST | `/pesquisa/analisar` | Pesquisa ficha técnica e preços de uma lista de peças e confere compatibilidade | Implementado (piloto); responde 503 sem `ANTHROPIC_API_KEY` |
| POST | `/pesquisa/ficha` | Ficha técnica de uma peça | Implementado (piloto); idem |
| POST | `/pesquisa/ofertas` | Ofertas de preço de uma peça | Implementado (piloto); idem |

Erros seguem o padrão HTTP: 400 para corpo inválido (ex.: campo `texto` ausente) e 404 para
sessão inexistente. Resposta de triagem semanticamente inválida (opção não reconhecida, valor
fora da faixa, texto longo demais) não é erro HTTP: volta como mensagem dentro do fluxo do
chat, com status 200 e a mesma pergunta repetida.

**Modelo de dados.** Peça (categoria, marca, modelo, especificações), Oferta (peça, loja, URL,
preço, disponibilidade, data da coleta), Cupom (loja, código, regra, validade, fonte), Sessão
(perfil e estado da triagem) e Configuração (sessão, itens, total, data de geração).

**Armazenamento.** Hoje as sessões ficam em memória (`Map` no `SessoesService`) e somem ao
reiniciar a API. O destino é PostgreSQL para catálogo, ofertas e histórico, e Redis para cache
e filas. O ORM ainda não foi escolhido.

**Configuração.** Por variáveis de ambiente: porta da API (`PORT`), origem do frontend para o
CORS (`FRONTEND_URL`) e, quando a camada de LLM existir, a chave da API do modelo. Há um
`.env.example` versionado e o `.env` nunca vai para o repositório.

## 10. Frontend (React)

O frontend é um projeto React com Vite e TypeScript na pasta `frontend/`, isolado do backend.
Ele só mostra o que a API devolve e não decide nada sobre peças ou preços. A URL da API vem da
variável `VITE_API_URL`.

### Telas e elementos

| Elemento | O que mostra | Estado |
|---|---|---|
| Chat | Mensagens do assistente e do usuário, uma pergunta por vez | Implementado |
| Respostas rápidas | Botões para as opções de cada pergunta | Implementado |
| Campo numérico | Entrada do orçamento, com mensagem de erro clara | Implementado |
| Barra de progresso | Quantas perguntas já foram respondidas | Implementado |
| Resumo do perfil | Lista dos sete campos ao fim da triagem | Implementado |
| Cartão por peça | Nome, preço, loja, link, cupom e explicação expansível | Previsto |
| Resumo da configuração | Total, economia com cupons e data da última atualização dos preços | Previsto |

**Estados que a interface trata.** Carregando, erro de conexão com opção de tentar de novo,
resposta inválida (volta como mensagem do assistente) e triagem concluída com opção de
recomeçar.

**Acessibilidade.**

- Lista de mensagens anunciada por leitores de tela (`role="log"`, `aria-live="polite"`)
- Campo de texto com rótulo, barra de progresso com valores para tecnologia assistiva
  (`role="progressbar"` com `aria-valuenow`/`aria-valuemin`/`aria-valuemax`)
- Foco visível (`:focus-visible`) e uso completo por teclado — elementos interativos são
  `button`, `input` e `form` nativos
- Tema claro e escuro, seguindo a preferência do sistema (`prefers-color-scheme`)
- Layout que funciona em tela de celular (container de até 640px, gutter de 16px)

**Regra de dados.** Nenhum preço, cupom ou peça é escrito no frontend. Tudo vem da API, com a
fonte e a data que ela informar.

## 11. Qualidade, segurança e privacidade

### Testes

- **Unitários no backend:** cada regra de compatibilidade, o interpretador de respostas da
  triagem (incluindo os formatos de orçamento) e a alocação de orçamento. Hoje cobrem
  `TriagemService` e `SessoesService` (`backend/src/**/*.spec.ts`).
- **De integração:** fluxo completo da API, da criação da sessão ao resumo do perfil, e depois
  até a configuração. Hoje cobre o fluxo de triagem via HTTP (`backend/test/app.e2e-spec.ts`).
- **De coletores:** cada coletor de preço testado com respostas gravadas da fonte, sem acessar
  a loja nos testes. *A construir.*
- **De ponta a ponta:** o chat inteiro no navegador, incluindo respostas inválidas e queda da
  API. *A construir.*
- **Da camada de LLM:** a validação de saída deve rejeitar nome de peça ou número que não
  esteja na configuração. *A construir.*

### Segurança

- Validar toda entrada na API, com limite de tamanho (hoje 200 caracteres por resposta) —
  aplicado em `TriagemService`
- Limitar a taxa de requisições por origem — *a construir*
- Chave do LLM somente no backend, em variável de ambiente — *a construir junto com a camada de LLM*
- CORS restrito à origem do frontend — implementado via `FRONTEND_URL`
- Coletores respeitam `robots.txt`, termos de uso e limite de requisições de cada fonte — *a construir*
- Links de loja exibidos como links externos seguros — *a construir*

**Privacidade.** A triagem não pede nome, e-mail nem dados pessoais. O perfil de compra fica
ligado só à sessão (um UUID gerado no backend). Se houver conta de usuário no futuro, isso
passa por uma decisão própria de privacidade.

**Desempenho.** O chat responde a partir de dados já guardados em cache. A coleta de preços
nunca roda dentro da requisição do usuário, exceto como reserva.

**Observabilidade.** Logs estruturados, registro de falha por coletor, idade média dos preços e
taxa de explicações do LLM rejeitadas pela validação. *A construir.*

## 12. Repositório, ambientes e roadmap

```
.
├── backend/      API NestJS (src/sessoes, src/triagem, src/catalogo, src/pesquisa, catalogo/)
├── frontend/     Interface React + Vite (src/)
├── docker-compose.yml
├── PLANEJAMENTO.md
├── README.md
└── .gitignore
```

**Execução local.** Ver [README.md](README.md).

**Containers.** Backend e frontend têm cada um seu `Dockerfile` com build em duas etapas,
rodando em containers separados (sem servidor de desenvolvimento nas imagens finais):

- `backend/Dockerfile`: compila o TypeScript e a imagem de produção roda só `dist/` com
  `node dist/main`.
- `frontend/Dockerfile`: o Vite gera o `dist/` estático e a imagem de produção é um
  `nginx:alpine` servindo esses arquivos — nada de Node em produção.

O `docker-compose.yml` na raiz sobe os dois (`docker compose up --build`), publicando backend
em `:3000` e frontend em `:5173`. `VITE_API_URL` é passada como build arg (fica embutida no
bundle, que roda no navegador do usuário); `FRONTEND_URL` é passada em runtime, como variável
de ambiente do container do backend.

**Integração contínua.** *A criar.* Em cada pull request, o backend e o frontend devem rodar
instalação, build e testes cada um no seu job, para que uma falha em um projeto não esconda o
resultado do outro. As imagens Docker são candidatas naturais para esse job, mas a definição do
workflow (GitHub Actions ou equivalente) ainda não foi feita.

**Documentação viva.** O README descreve como rodar e o estado do projeto; este documento
registra as decisões. Ambos são atualizados na mesma mudança que altera o comportamento.

### Roadmap

| Fase | Entrega | Critério de pronto | Estado |
|---|---|---|---|
| Fase 1: fundação e triagem | Backend e frontend isolados, chat e triagem por regras | O usuário responde às 7 perguntas e vê o resumo do perfil; resposta inválida repete a pergunta | **Concluída** |
| Fase 1b: catálogo e compatibilidade | Catálogo manual de peças e regras de compatibilidade | Cada regra tem testes unitários; peça sem especificação completa fica fora da montagem | Em andamento — catálogo e regras existem como piloto (seção 6), falta revisão humana das peças e ligação com a triagem |
| Fase 2: montagem e preços | Configuração dentro do orçamento, coletor piloto e histórico de preços | Cada peça mostra preço, loja, fonte e data; o total não passa do orçamento | A fazer |
| Fase 3: explicação | Camada de LLM | Nenhum nome ou número fora da configuração passa pela validação; há texto padrão por regras como reserva | A fazer |
| Fase 4: cupons e alertas | Cupons válidos e aviso de queda de preço | Cupom sem origem, regra ou validade nunca aparece; queda no histórico é sinalizada | A fazer |
| Fase 5: refino | Mais perfis de uso, upgrades e comparação de configurações | Testes ponta a ponta e CI verdes nos dois projetos; acessibilidade verificada | A fazer |

## 13. Riscos, decisões em aberto e estado atual

### Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Termos de uso das lojas proíbem scraping | Priorizar APIs, afiliados e comparadores permitidos |
| Preços mudam rápido | Mostrar data da coleta e pedir confirmação na loja |
| Erro de especificação no catálogo | Revisão manual e testes de compatibilidade |
| LLM cita dado que não existe | Contexto fechado e validação da saída |
| Cupons expirados | Validade obrigatória e checagem periódica |
| Custo da API do LLM | Cache de explicações por configuração |
| Orçamento baixo demais para qualquer configuração compatível | Mensagem dizendo o que ajustar, sem montar algo incompleto |

### Decisões em aberto

- [ ] Primeira loja ou comparador a integrar
- [ ] Região e moeda: o planejamento assume Brasil e reais
- [ ] O frete entra no preço final comparado entre lojas?
- [ ] Idade máxima de um preço antes de ser marcado como desatualizado
- [ ] Percentuais de orçamento por categoria e por perfil de uso
- [ ] ORM e banco: PostgreSQL e Redis estão previstos, o ORM não
- [ ] Licença do repositório
- [ ] Preços e cupons: manter o caminho de coletores próprios por loja (seção 7, original) ou
      seguir com o piloto de busca via IA (`backend/src/pesquisa/`), ou os dois — e, se os dois,
      como cada um se integra ao catálogo e ao motor de montagem
- [ ] Revisão humana das 9 peças piloto do catálogo (hoje `rascunho`) antes de qualquer uso real
- [ ] Listas de `LOJAS_PERMITIDAS`/`FABRICANTES_PERMITIDOS` do módulo `pesquisa` são as do código
      extraído, ainda não revisadas por quem decide quais lojas são confiáveis

### Decidido

- Nome do projeto: **Circuito**
- Backend em NestJS e frontend em React com Vite, em pastas isoladas; triagem por regras com
  LLM apenas na explicação
- Sessões identificadas por UUID (`crypto.randomUUID()`), guardadas em memória no MVP
- Validação de entrada na API com `class-validator` (estrutura do corpo) combinada com regras
  de domínio no `TriagemService` (conteúdo da resposta)
- Backend e frontend rodam em containers Docker separados, cada um com imagem própria e build
  de produção em duas etapas (ver seção 12)

### Estado atual da implementação

- Backend compila (`npm run build`), com testes unitários (`npm test`) e de integração
  (`npm run test:e2e`) passando — fluxo completo da triagem exercitado via HTTP, incluindo
  respostas inválidas, sessão inexistente (404) e corpo malformado (400)
- Frontend compila e passa no lint (`npm run build`, `npm run lint`); os dois servidores foram
  exercitados juntos localmente (`GET /health`, `POST /sessoes` e a interface servida pelo Vite)
- `docker compose up --build` sobe os dois containers; testado de ponta a ponta (health check,
  criação de sessão, CORS entre as origens e a URL da API embutida corretamente no bundle do
  frontend)
- Catálogo (`backend/catalogo/`, 9 peças `rascunho`) e módulo `pesquisa` (ficha técnica, preços
  e compatibilidade via IA, com `@anthropic-ai/sdk` e `@nestjs/config`) integrados ao
  `AppModule`; `npm run catalogo:validar` reporta "Nenhum problema encontrado"; suíte de testes
  do backend em 55 (17 de sessões/triagem + 38 de catálogo/pesquisa), todos passando
- Sessões em memória, sem banco de dados
- Sem montagem (ligar triagem → catálogo → preços), cupons, camada de explicação por LLM
  (seção 8, distinta do piloto `pesquisa`), testes de ponta a ponta no frontend ou CI
