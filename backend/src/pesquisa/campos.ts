import { Categoria, Specs } from './pesquisa.types';

/**
 * Campos que a ficha técnica precisa ter para a peça entrar na checagem.
 * Peça com campo faltando não participa da montagem.
 */
export const CAMPOS_OBRIGATORIOS: Record<Categoria, (keyof Specs)[]> = {
  cpu: ['socket', 'tdpW'],
  'placa-mae': ['socket', 'ramType', 'm2Slots', 'formFactor'],
  ram: ['ramType'],
  gpu: ['lengthMm', 'tdpW'],
  armazenamento: ['interface'],
  fonte: ['potenciaW'],
  gabinete: ['maxGpuLengthMm', 'maxCoolerHeightMm', 'formFactorsSuportados'],
  cooler: ['heightMm', 'socketsSuportados'],
};

/** Descrição de cada campo, usada no pedido enviado à IA. */
export const DESCRICAO_CAMPOS: Record<keyof Specs, string> = {
  socket: 'soquete do processador ou da placa-mãe, como AM5 ou LGA1700',
  ramType: 'tipo de memória, exatamente DDR4 ou DDR5',
  m2Slots: 'quantidade de slots M.2 da placa-mãe, como número',
  tdpW: 'processador: TDP em watts. Placa de vídeo: consumo total da placa em watts',
  potenciaMaximaW:
    'processador: potência máxima em turbo, em watts, somente se a página informar',
  lengthMm: 'comprimento da placa de vídeo em milímetros',
  heightMm: 'altura do cooler em milímetros',
  potenciaW: 'potência da fonte em watts',
  maxGpuLengthMm: 'comprimento máximo de placa de vídeo aceito, em milímetros',
  maxCoolerHeightMm: 'altura máxima de cooler aceita, em milímetros',
  socketsSuportados: 'lista de soquetes que o cooler suporta',
  interface: 'tipo do armazenamento, exatamente NVME ou SATA',
  formFactor: 'formato da placa-mãe, exatamente um de: E-ATX, ATX, mATX, ITX',
  formFactorsSuportados:
    'lista dos formatos de placa-mãe que o gabinete aceita, entre: E-ATX, ATX, mATX, ITX',
};

export function camposFaltando(categoria: Categoria, specs: Specs): string[] {
  return CAMPOS_OBRIGATORIOS[categoria].filter((campo) => {
    const valor = specs[campo];
    if (valor === undefined || valor === null) return true;
    if (Array.isArray(valor)) return valor.length === 0;
    return false;
  });
}
