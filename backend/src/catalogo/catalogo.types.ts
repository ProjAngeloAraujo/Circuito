import { Categoria, Specs } from '../pesquisa/pesquisa.types';

/**
 * rascunho: coletada e ainda não revisada por uma pessoa. Não deve ser usada como verdade.
 * verificada: revisada por uma pessoa contra a fonte.
 * desatualizada: passou do prazo de revisão ou a fonte mudou.
 */
export type StatusCatalogo = 'rascunho' | 'verificada' | 'desatualizada';

export const STATUS_CATALOGO: StatusCatalogo[] = [
  'rascunho',
  'verificada',
  'desatualizada',
];

export interface FonteCatalogo {
  url: string;
  titulo: string;
  /** Data da leitura da página, no formato AAAA-MM-DD. */
  coletadaEm: string;
}

export interface PecaCatalogo {
  /** Identificador estável, em minúsculas com hífens. */
  id: string;
  categoria: Categoria;
  marca: string;
  modelo: string;
  /** Código do fabricante (part number), usado depois para ligar ofertas de lojas à peça. */
  mpn?: string;
  specs: Specs;
  /** Texto literal da página de onde cada campo foi lido, para agilizar a revisão. */
  evidencias?: Partial<Record<keyof Specs, string>>;
  fontes: FonteCatalogo[];
  status: StatusCatalogo;
  /** Observações que as regras automáticas não cobrem, como pontos de atenção da fonte. */
  notas?: string[];
}
