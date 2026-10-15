import { FichaTecnica, Problema } from './pesquisa.types';

/**
 * Valores iniciais para a estimativa de fonte. São suposições de partida e
 * precisam ser validados e ajustados com testes reais.
 */
export const BASE_SISTEMA_W = 100;
export const MARGEM_FONTE = 1.3;

/** Padroniza soquetes: "FCLGA1700" (Intel ARK) e "LGA 1700" viram "LGA1700". */
const normalizar = (texto: string) =>
  texto
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/^SOCKET/, '')
    .replace(/^FCLGA/, 'LGA');

/**
 * Confere a compatibilidade de uma lista de peças já com ficha técnica.
 * Regras que dependem de uma categoria ausente são ignoradas.
 */
export function verificarCompatibilidade(itens: FichaTecnica[]): Problema[] {
  const problemas: Problema[] = [];
  const primeiro = (categoria: FichaTecnica['categoria']) =>
    itens.find((i) => i.categoria === categoria);

  const cpu = primeiro('cpu');
  const placa = primeiro('placa-mae');
  const ram = primeiro('ram');
  const gpu = primeiro('gpu');
  const fonte = primeiro('fonte');
  const gabinete = primeiro('gabinete');
  const cooler = primeiro('cooler');
  const discos = itens.filter((i) => i.categoria === 'armazenamento');

  if (cpu?.specs.socket && placa?.specs.socket) {
    if (normalizar(cpu.specs.socket) !== normalizar(placa.specs.socket)) {
      problemas.push({
        regra: 'cpu-placa-mae',
        mensagem: `O processador usa o soquete ${cpu.specs.socket}, mas a placa-mãe usa ${placa.specs.socket}.`,
      });
    }
  }

  if (ram?.specs.ramType && placa?.specs.ramType) {
    if (ram.specs.ramType !== placa.specs.ramType) {
      problemas.push({
        regra: 'ram-placa-mae',
        mensagem: `A memória é ${ram.specs.ramType}, mas a placa-mãe aceita ${placa.specs.ramType}.`,
      });
    }
  }

  if (gpu?.specs.lengthMm && gabinete?.specs.maxGpuLengthMm) {
    if (gpu.specs.lengthMm > gabinete.specs.maxGpuLengthMm) {
      problemas.push({
        regra: 'gpu-gabinete',
        mensagem: `A placa de vídeo tem ${gpu.specs.lengthMm} mm e o gabinete aceita até ${gabinete.specs.maxGpuLengthMm} mm.`,
      });
    }
  }

  if (placa?.specs.formFactor && gabinete?.specs.formFactorsSuportados) {
    if (
      !gabinete.specs.formFactorsSuportados.includes(placa.specs.formFactor)
    ) {
      problemas.push({
        regra: 'placa-mae-gabinete',
        mensagem: `A placa-mãe é ${placa.specs.formFactor}, e o gabinete aceita: ${gabinete.specs.formFactorsSuportados.join(', ')}.`,
      });
    }
  }

  if (cooler?.specs.heightMm && gabinete?.specs.maxCoolerHeightMm) {
    if (cooler.specs.heightMm > gabinete.specs.maxCoolerHeightMm) {
      problemas.push({
        regra: 'cooler-gabinete',
        mensagem: `O cooler tem ${cooler.specs.heightMm} mm de altura e o gabinete aceita até ${gabinete.specs.maxCoolerHeightMm} mm.`,
      });
    }
  }

  if (cooler?.specs.socketsSuportados && cpu?.specs.socket) {
    const suportados = cooler.specs.socketsSuportados.map(normalizar);
    if (!suportados.includes(normalizar(cpu.specs.socket))) {
      problemas.push({
        regra: 'cooler-cpu',
        mensagem: `O cooler não lista suporte ao soquete ${cpu.specs.socket} do processador.`,
      });
    }
  }

  // Para a CPU, usa a potência máxima em turbo quando a ficha informa: é mais
  // realista que o TDP, que na Intel é a potência base.
  const cpuW = cpu?.specs.potenciaMaximaW ?? cpu?.specs.tdpW;
  if (fonte?.specs.potenciaW && (cpuW || gpu?.specs.tdpW)) {
    const consumo = (cpuW ?? 0) + (gpu?.specs.tdpW ?? 0) + BASE_SISTEMA_W;
    const recomendada = Math.ceil(consumo * MARGEM_FONTE);
    if (fonte.specs.potenciaW < recomendada) {
      problemas.push({
        regra: 'fonte',
        mensagem: `A fonte tem ${fonte.specs.potenciaW} W, e a estimativa pede pelo menos ${recomendada} W (consumo estimado de ${consumo} W com margem de ${Math.round((MARGEM_FONTE - 1) * 100)}%).`,
      });
    }
  }

  if (placa?.specs.m2Slots !== undefined) {
    const nvme = discos.filter((d) => d.specs.interface === 'NVME').length;
    if (nvme > placa.specs.m2Slots) {
      problemas.push({
        regra: 'armazenamento-placa-mae',
        mensagem: `Há ${nvme} unidades NVMe, mas a placa-mãe tem ${placa.specs.m2Slots} slot(s) M.2.`,
      });
    }
  }

  return problemas;
}
