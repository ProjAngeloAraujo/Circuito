import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CATEGORIAS } from '../pesquisa/pesquisa.types';
import { PecaCatalogo } from './catalogo.types';
import { validarCatalogo } from './catalogo.validacao';

/** Pasta backend/catalogo, a mesma a partir de src/ (testes) e de dist/ (build). */
export const PASTA_CATALOGO = join(__dirname, '..', '..', 'catalogo');

export interface CatalogoCarregado {
  pecas: PecaCatalogo[];
  erros: string[];
}

/** Lê um arquivo <categoria>.json por categoria e valida tudo. Categoria sem arquivo é ignorada. */
export function carregarCatalogo(
  pasta: string = PASTA_CATALOGO,
): CatalogoCarregado {
  const pecas: PecaCatalogo[] = [];
  const erros: string[] = [];

  for (const categoria of CATEGORIAS) {
    const arquivo = join(pasta, `${categoria}.json`);
    if (!existsSync(arquivo)) continue;

    let lista: unknown;
    try {
      lista = JSON.parse(readFileSync(arquivo, 'utf8'));
    } catch {
      erros.push(`${categoria}.json: JSON inválido.`);
      continue;
    }
    if (!Array.isArray(lista)) {
      erros.push(
        `${categoria}.json: o arquivo deve conter uma lista de peças.`,
      );
      continue;
    }

    for (const item of lista) {
      const dados = (item ?? {}) as { id?: unknown; categoria?: unknown };
      if (dados.categoria !== categoria) {
        erros.push(
          `${categoria}.json: a peça "${String(dados.id)}" tem categoria "${String(dados.categoria)}", diferente do arquivo.`,
        );
      }
      pecas.push(item as PecaCatalogo);
    }
  }

  erros.push(...validarCatalogo(pecas));
  return { pecas, erros };
}
