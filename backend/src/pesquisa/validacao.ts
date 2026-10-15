import { camposFaltando } from './campos';
import { normalizarFormFactor } from './formfactor';
import {
  Categoria,
  FichaTecnica,
  FormFactor,
  Oferta,
  Specs,
} from './pesquisa.types';

/** Faixa de preço aceita em relação ao valor de referência antes de marcar como suspeito. */
const RAZAO_MINIMA = 0.5;
const RAZAO_MAXIMA = 1.5;

/** Extrai o primeiro objeto JSON de um texto, mesmo que venha dentro de uma cerca de código. */
export function extrairJson(texto: string): unknown {
  const inicio = texto.indexOf('{');
  const fim = texto.lastIndexOf('}');
  if (inicio === -1 || fim <= inicio) return null;
  try {
    return JSON.parse(texto.slice(inicio, fim + 1));
  } catch {
    return null;
  }
}

/** Remove parâmetros e barra final para comparar URLs de forma tolerante. */
export function normalizarUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname.toLowerCase()}${u.pathname.replace(/\/+$/, '')}`;
  } catch {
    return url;
  }
}

/** Junta todas as URLs presentes nos blocos devolvidos pela busca (resultados e citações). */
export function coletarUrls(
  valor: unknown,
  acumulado: Set<string> = new Set(),
): Set<string> {
  if (Array.isArray(valor)) {
    for (const item of valor) coletarUrls(item, acumulado);
  } else if (valor && typeof valor === 'object') {
    for (const [chave, item] of Object.entries(
      valor as Record<string, unknown>,
    )) {
      if (chave === 'url' && typeof item === 'string') {
        acumulado.add(normalizarUrl(item));
      } else {
        coletarUrls(item, acumulado);
      }
    }
  }
  return acumulado;
}

export function dominioPermitido(url: string, dominios: string[]): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    return dominios.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

export interface ContextoOfertas {
  urlsEncontradas: Set<string>;
  dominios: string[];
  precoReferencia?: number;
  agora: Date;
}

export function validarOfertas(
  bruto: unknown,
  contexto: ContextoOfertas,
): { ofertas: Oferta[]; descartadas: string[] } {
  const lista = (bruto as { ofertas?: unknown } | null)?.ofertas;
  if (!Array.isArray(lista)) {
    return {
      ofertas: [],
      descartadas: ['A resposta não trouxe uma lista de ofertas.'],
    };
  }

  const ofertas: Oferta[] = [];
  const descartadas: string[] = [];

  for (const item of lista) {
    const o = (item ?? {}) as Record<string, unknown>;
    const loja = typeof o.loja === 'string' ? o.loja.trim() : '';
    const url = typeof o.url === 'string' ? o.url : '';
    const preco = o.precoBRL;

    if (!loja || !url) {
      descartadas.push('Oferta sem loja ou URL.');
      continue;
    }
    if (typeof preco !== 'number' || !Number.isFinite(preco) || preco <= 0) {
      descartadas.push(`${loja}: preço inválido.`);
      continue;
    }
    if (!dominioPermitido(url, contexto.dominios)) {
      descartadas.push(`${loja}: domínio fora da lista de lojas permitidas.`);
      continue;
    }
    if (!contexto.urlsEncontradas.has(normalizarUrl(url))) {
      descartadas.push(`${loja}: a URL não apareceu nos resultados da busca.`);
      continue;
    }

    // Cupom só entra com regra de uso e validade registradas.
    const c = o.cupom as Record<string, unknown> | null | undefined;
    const cupom =
      c &&
      typeof c.codigo === 'string' &&
      c.codigo.trim() &&
      typeof c.condicao === 'string' &&
      c.condicao.trim() &&
      typeof c.validade === 'string' &&
      c.validade.trim()
        ? {
            codigo: c.codigo.trim(),
            condicao: c.condicao.trim(),
            validade: c.validade.trim(),
          }
        : null;

    const oferta: Oferta = {
      loja,
      url,
      precoBRL: Math.round(preco * 100) / 100,
      disponivel: typeof o.disponivel === 'boolean' ? o.disponivel : null,
      cupom,
      coletadaEm: contexto.agora.toISOString(),
    };

    const ref = contexto.precoReferencia;
    if (ref && ref > 0) {
      const razao = oferta.precoBRL / ref;
      if (razao < RAZAO_MINIMA || razao > RAZAO_MAXIMA) {
        oferta.suspeita = `Preço muito diferente do valor de referência (R$ ${ref.toFixed(2)}).`;
      }
    }

    ofertas.push(oferta);
  }

  ofertas.sort((a, b) => a.precoBRL - b.precoBRL);
  return { ofertas, descartadas };
}

const NUMEROS_MINIMOS: Partial<Record<keyof Specs, number>> = {
  m2Slots: 0,
  tdpW: 1,
  potenciaMaximaW: 1,
  lengthMm: 1,
  heightMm: 1,
  potenciaW: 1,
  maxGpuLengthMm: 1,
  maxCoolerHeightMm: 1,
};

/** Mantém apenas campos conhecidos e com o tipo certo. */
export function sanitizarSpecs(bruto: unknown): Specs {
  const raw = (bruto ?? {}) as Record<string, unknown>;
  const specs: Record<string, unknown> = {};

  if (typeof raw.socket === 'string' && raw.socket.trim()) {
    specs.socket = raw.socket.trim();
  }

  const ram =
    typeof raw.ramType === 'string'
      ? raw.ramType.toUpperCase().replace(/\s/g, '')
      : '';
  if (ram === 'DDR4' || ram === 'DDR5') specs.ramType = ram;

  const itf =
    typeof raw.interface === 'string'
      ? raw.interface.toUpperCase().replace(/[\s.-]/g, '')
      : '';
  if (itf === 'NVME' || itf === 'SATA') specs.interface = itf;

  if (typeof raw.formFactor === 'string') {
    const formato = normalizarFormFactor(raw.formFactor);
    if (formato) specs.formFactor = formato;
  }

  for (const [campo, minimo] of Object.entries(NUMEROS_MINIMOS)) {
    const valor = raw[campo];
    if (
      typeof valor === 'number' &&
      Number.isFinite(valor) &&
      valor >= (minimo ?? 0)
    ) {
      specs[campo] = valor;
    }
  }

  if (Array.isArray(raw.socketsSuportados)) {
    const lista = raw.socketsSuportados
      .filter((s): s is string => typeof s === 'string' && s.trim() !== '')
      .map((s) => s.trim());
    if (lista.length > 0) specs.socketsSuportados = lista;
  }

  if (Array.isArray(raw.formFactorsSuportados)) {
    const lista = [
      ...new Set(
        raw.formFactorsSuportados
          .filter((f): f is string => typeof f === 'string')
          .map(normalizarFormFactor)
          .filter((f): f is FormFactor => f !== null),
      ),
    ];
    if (lista.length > 0) specs.formFactorsSuportados = lista;
  }

  return specs as Specs;
}

export interface ContextoFicha {
  categoria: Categoria;
  nome: string;
  urlsEncontradas: Set<string>;
  dominios: string[];
  agora: Date;
}

export function validarFicha(
  bruto: unknown,
  contexto: ContextoFicha,
): { ficha: FichaTecnica } | { erro: string } {
  if (!bruto || typeof bruto !== 'object') {
    return { erro: 'A resposta não trouxe uma ficha técnica em JSON.' };
  }
  const dados = bruto as { specs?: unknown; fontes?: unknown };

  const fontes = (Array.isArray(dados.fontes) ? dados.fontes : []).filter(
    (f): f is string =>
      typeof f === 'string' &&
      dominioPermitido(f, contexto.dominios) &&
      contexto.urlsEncontradas.has(normalizarUrl(f)),
  );
  if (fontes.length === 0) {
    return {
      erro: 'Nenhuma fonte de fabricante verificável foi encontrada para esta peça.',
    };
  }

  const specs = sanitizarSpecs(dados.specs);
  const faltando = camposFaltando(contexto.categoria, specs);
  if (faltando.length > 0) {
    return {
      erro: `Ficha incompleta, faltam: ${faltando.join(', ')}.`,
    };
  }

  return {
    ficha: {
      categoria: contexto.categoria,
      nome: contexto.nome,
      specs,
      fontes,
      coletadaEm: contexto.agora.toISOString(),
    },
  };
}
