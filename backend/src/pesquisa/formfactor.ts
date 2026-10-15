import { FormFactor } from './pesquisa.types';

const MAPA: Record<string, FormFactor> = {
  ATX: 'ATX',
  EATX: 'E-ATX',
  MATX: 'mATX',
  MICROATX: 'mATX',
  ITX: 'ITX',
  MINIITX: 'ITX',
};

/** Converte "Micro-ATX", "MicroATX", "Mini-ITX" etc. para o formato padrão. Devolve null se não reconhecer. */
export function normalizarFormFactor(valor: string): FormFactor | null {
  const chave = valor
    .replace(/\(.*?\)/g, '')
    .toUpperCase()
    .replace(/[\s_-]/g, '');
  return MAPA[chave] ?? null;
}
