export const CATEGORIAS = [
  'cpu',
  'placa-mae',
  'ram',
  'gpu',
  'armazenamento',
  'fonte',
  'gabinete',
  'cooler',
] as const;

export type Categoria = (typeof CATEGORIAS)[number];

/** Formatos de placa-mãe, do maior para o menor. */
export type FormFactor = 'E-ATX' | 'ATX' | 'mATX' | 'ITX';

export interface Specs {
  /** Soquete do processador ou da placa-mãe, por exemplo AM5 ou LGA1700. */
  socket?: string;
  ramType?: 'DDR4' | 'DDR5';
  /** Quantidade de slots M.2 da placa-mãe. */
  m2Slots?: number;
  /** CPU: TDP. GPU: consumo total da placa. Em watts. */
  tdpW?: number;
  /**
   * CPU: potência máxima em turbo, em watts, quando a ficha informa (a Intel publica).
   * Na estimativa da fonte, vale mais que o TDP.
   */
  potenciaMaximaW?: number;
  /** Comprimento da placa de vídeo, em mm. */
  lengthMm?: number;
  /** Altura do cooler, em mm. */
  heightMm?: number;
  /** Potência da fonte, em watts. */
  potenciaW?: number;
  maxGpuLengthMm?: number;
  maxCoolerHeightMm?: number;
  socketsSuportados?: string[];
  interface?: 'NVME' | 'SATA';
  /** Formato da placa-mãe. */
  formFactor?: FormFactor;
  /** Formatos de placa-mãe que o gabinete aceita. */
  formFactorsSuportados?: FormFactor[];
}

export interface ItemEntrada {
  categoria: Categoria;
  nome: string;
  /** Preço de referência em reais, usado para marcar ofertas com preço suspeito. */
  precoReferencia?: number;
}

export interface FichaTecnica {
  categoria: Categoria;
  nome: string;
  specs: Specs;
  fontes: string[];
  coletadaEm: string;
}

export interface Cupom {
  codigo: string;
  condicao: string;
  validade: string;
}

export interface Oferta {
  loja: string;
  url: string;
  precoBRL: number;
  disponivel: boolean | null;
  cupom: Cupom | null;
  coletadaEm: string;
  /** Preenchido quando o preço foge muito do valor de referência. */
  suspeita?: string;
}

export interface Problema {
  regra: string;
  mensagem: string;
}
