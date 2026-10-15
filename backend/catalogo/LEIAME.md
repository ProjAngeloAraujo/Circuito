# Catálogo de peças

Registro próprio das peças e das especificações que as regras de compatibilidade usam. Cada categoria tem um arquivo `<categoria>.json` com uma lista de peças. Os dados mudam pouco e ficam no Git, então cada alteração vira uma revisão visível.

Preços e histórico de preço **não** ficam aqui.

## Formato de uma peça

| Campo | Obrigatório | O que é |
|---|---|---|
| `id` | sim | Identificador estável, em minúsculas com hífens |
| `categoria` | sim | Deve ser a mesma do nome do arquivo |
| `marca`, `modelo` | sim | Como o fabricante chama a peça |
| `mpn` | não | Código do fabricante. Servirá para ligar ofertas de lojas à peça |
| `specs` | sim | Campos técnicos no formato padrão. Os obrigatórios variam por categoria |
| `evidencias` | não | Texto literal da página de onde cada campo foi lido |
| `fontes` | sim | Páginas usadas (`url` com https, `titulo`, `coletadaEm` em AAAA-MM-DD) |
| `status` | sim | `rascunho`, `verificada` ou `desatualizada` |
| `notas` | não | Pontos de atenção que as regras automáticas não cobrem |

Campos obrigatórios de `specs` por categoria estão em `src/pesquisa/campos.ts`.

## Status

- **rascunho:** coletada, ainda não revisada por uma pessoa. Não use como verdade.
- **verificada:** uma pessoa conferiu cada campo contra a fonte. Exige ao menos uma fonte de fabricante.
- **desatualizada:** passou do prazo de revisão ou a fonte mudou.

Todas as peças atuais são `rascunho`: foram lidas de páginas de fabricantes por uma ferramenta de leitura de páginas, que resume o conteúdo, e por isso o texto em `evidencias` precisa ser conferido na página.

## Como revisar uma peça

1. Abra a `url` de cada fonte e compare com `evidencias` e `specs`.
2. Leia as `notas`: elas listam o que ficou incerto.
3. Corrija o que estiver errado e mude `status` para `verificada`.
4. Rode `npm run catalogo:validar` e `npm test`.

## Como adicionar uma peça

Leia a página oficial do fabricante, copie o texto exato de cada campo para `evidencias`, registre a fonte e a data, e deixe o `status` como `rascunho`. Se um campo obrigatório não estiver na página, não preencha de cabeça: a peça fica de fora até a informação ser encontrada.
