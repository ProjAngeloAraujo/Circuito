import { camposFaltando } from '../pesquisa/campos';
import { FABRICANTES_PADRAO } from '../pesquisa/fontes.config';
import { CATEGORIAS, Categoria, Specs } from '../pesquisa/pesquisa.types';
import { dominioPermitido, sanitizarSpecs } from '../pesquisa/validacao';
import { STATUS_CATALOGO } from './catalogo.types';

const ID_VALIDO = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATA_VALIDA = /^\d{4}-\d{2}-\d{2}$/;

const texto = (valor: unknown): valor is string =>
  typeof valor === 'string' && valor.trim() !== '';

/** Devolve a lista de problemas de uma peça do catálogo. Lista vazia significa válida. */
export function validarPeca(
  bruto: unknown,
  fabricantes: string[] = FABRICANTES_PADRAO,
): string[] {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) {
    return ['Entrada do catálogo não é um objeto.'];
  }
  const p = bruto as Record<string, unknown>;
  const rotulo = texto(p.id) ? p.id : '(sem id)';
  const erros: string[] = [];
  const erro = (mensagem: string) => erros.push(`${rotulo}: ${mensagem}`);

  if (!texto(p.id) || !ID_VALIDO.test(p.id)) {
    erro('id ausente ou fora do padrão (minúsculas, números e hífens).');
  }
  const categoriaValida =
    typeof p.categoria === 'string' &&
    (CATEGORIAS as readonly string[]).includes(p.categoria);
  if (!categoriaValida) erro('categoria inválida.');
  if (!texto(p.marca)) erro('marca ausente.');
  if (!texto(p.modelo)) erro('modelo ausente.');
  if (p.mpn !== undefined && !texto(p.mpn)) {
    erro('mpn, quando presente, não pode ser vazio.');
  }
  if (
    typeof p.status !== 'string' ||
    !(STATUS_CATALOGO as string[]).includes(p.status)
  ) {
    erro('status inválido.');
  }

  const specsBrutas =
    p.specs && typeof p.specs === 'object' && !Array.isArray(p.specs)
      ? (p.specs as Record<string, unknown>)
      : null;
  if (!specsBrutas) {
    erro('specs ausente.');
  } else {
    const limpas = sanitizarSpecs(specsBrutas) as Record<string, unknown>;
    for (const [campo, valor] of Object.entries(specsBrutas)) {
      if (!(campo in limpas)) {
        erro(`campo de specs desconhecido ou com valor inválido: ${campo}.`);
      } else if (JSON.stringify(limpas[campo]) !== JSON.stringify(valor)) {
        erro(
          `valor de ${campo} fora do formato padrão (esperado ${JSON.stringify(limpas[campo])}).`,
        );
      }
    }
    if (categoriaValida) {
      const faltando = camposFaltando(
        p.categoria as Categoria,
        limpas as Specs,
      );
      if (faltando.length > 0) {
        erro(`faltam campos obrigatórios: ${faltando.join(', ')}.`);
      }
    }
  }

  const fontes = Array.isArray(p.fontes) ? p.fontes : [];
  if (fontes.length === 0) erro('é preciso ao menos uma fonte.');
  let temFabricante = false;
  fontes.forEach((item, indice) => {
    const fonte = (item ?? {}) as Record<string, unknown>;
    const n = indice + 1;
    if (!texto(fonte.url) || !fonte.url.startsWith('https://')) {
      erro(`fonte ${n}: url ausente ou sem https.`);
    } else if (dominioPermitido(fonte.url, fabricantes)) {
      temFabricante = true;
    }
    if (!texto(fonte.titulo)) erro(`fonte ${n}: título ausente.`);
    if (!texto(fonte.coletadaEm) || !DATA_VALIDA.test(fonte.coletadaEm)) {
      erro(`fonte ${n}: coletadaEm deve estar no formato AAAA-MM-DD.`);
    }
  });
  if (p.status === 'verificada' && !temFabricante) {
    erro('peça verificada exige ao menos uma fonte de fabricante.');
  }

  if (p.evidencias !== undefined) {
    if (
      !p.evidencias ||
      typeof p.evidencias !== 'object' ||
      Array.isArray(p.evidencias)
    ) {
      erro('evidencias deve ser um objeto.');
    } else {
      for (const [campo, valor] of Object.entries(p.evidencias)) {
        if (specsBrutas && !(campo in specsBrutas)) {
          erro(`evidência para um campo que não está em specs: ${campo}.`);
        }
        if (!texto(valor)) erro(`evidência vazia em ${campo}.`);
      }
    }
  }

  if (
    p.notas !== undefined &&
    (!Array.isArray(p.notas) || !p.notas.every(texto))
  ) {
    erro('notas deve ser uma lista de textos.');
  }

  return erros;
}

export function validarCatalogo(
  pecas: unknown[],
  fabricantes: string[] = FABRICANTES_PADRAO,
): string[] {
  const erros = pecas.flatMap((p) => validarPeca(p, fabricantes));
  const vistos = new Set<string>();
  for (const p of pecas) {
    const id = (p as { id?: unknown } | null)?.id;
    if (typeof id !== 'string') continue;
    if (vistos.has(id)) erros.push(`${id}: id duplicado no catálogo.`);
    vistos.add(id);
  }
  return erros;
}
