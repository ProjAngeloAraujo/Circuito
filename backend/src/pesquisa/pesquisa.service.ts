import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnthropicService } from './anthropic.service';
import { CacheTtl } from './cache';
import { CAMPOS_OBRIGATORIOS, DESCRICAO_CAMPOS } from './campos';
import { verificarCompatibilidade } from './compatibilidade';
import { FABRICANTES_PADRAO, LOJAS_PADRAO, lerLista } from './fontes.config';
import {
  Categoria,
  FichaTecnica,
  ItemEntrada,
  Oferta,
  Problema,
} from './pesquisa.types';
import { extrairJson, validarFicha, validarOfertas } from './validacao';

const HORA_MS = 60 * 60 * 1000;
const DIA_MS = 24 * HORA_MS;

const AVISO_PRECOS =
  'Valores coletados na data indicada em cada oferta. Confirme preço, estoque e cupom na loja antes de comprar.';

const SISTEMA_OFERTAS = `Você pesquisa preços de peças de computador em lojas brasileiras.
Use a ferramenta de busca. Considere somente preços em reais (BRL) que aparecem nas páginas encontradas.
Nunca invente preço, loja, cupom ou URL. Se não encontrar, devolva a lista vazia.
Só informe cupom se a página mostrar o código, a condição de uso e a validade.
Responda SOMENTE com um JSON, sem texto fora dele, neste formato:
{"ofertas":[{"loja":"nome da loja","url":"https://...","precoBRL":1234.56,"disponivel":true,"cupom":null}]}
O preço é um número com ponto decimal. "disponivel" é true, false ou null se não souber.
Um cupom, quando existir, tem o formato {"codigo":"...","condicao":"...","validade":"..."}.`;

const SISTEMA_FICHA = `Você extrai a ficha técnica de peças de computador de páginas oficiais dos fabricantes.
Use a ferramenta de busca. Nunca invente valores: se não encontrar um campo, omita-o.
Responda SOMENTE com um JSON, sem texto fora dele, neste formato:
{"specs":{...campos pedidos...},"fontes":["https://...páginas usadas..."]}
Em "fontes" coloque apenas URLs de páginas que você realmente usou.`;

export interface ResultadoFicha {
  ficha?: FichaTecnica;
  erro?: string;
}

export interface ResultadoOfertas {
  ofertas: Oferta[];
  descartadas: string[];
}

export interface ItemRelatorio {
  categoria: Categoria;
  nome: string;
  ficha: FichaTecnica | null;
  motivoSemFicha: string | null;
  melhorOferta: Oferta | null;
  outrasOfertas: Oferta[];
  avisos: string[];
}

export interface RelatorioAnalise {
  geradoEm: string;
  itens: ItemRelatorio[];
  problemas: Problema[];
  /** Verdadeiro só quando todas as peças têm ficha verificada e nenhuma regra falhou. */
  compatibilidadeConfirmada: boolean;
  totalBRL: number | null;
  totalParcialBRL: number;
  aviso: string;
}

async function executarComLimite<T, R>(
  itens: T[],
  limite: number,
  tarefa: (item: T) => Promise<R>,
): Promise<R[]> {
  const resultados: R[] = new Array(itens.length);
  let proximo = 0;
  const trabalhadores = Array.from(
    { length: Math.min(limite, itens.length) },
    async () => {
      while (proximo < itens.length) {
        const indice = proximo++;
        resultados[indice] = await tarefa(itens[indice]);
      }
    },
  );
  await Promise.all(trabalhadores);
  return resultados;
}

const arredondar = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class PesquisaService {
  private readonly logger = new Logger(PesquisaService.name);
  private readonly lojas: string[];
  private readonly fabricantes: string[];
  private readonly cacheOfertas: CacheTtl<ResultadoOfertas>;
  private readonly cacheFichas: CacheTtl<FichaTecnica>;

  constructor(
    private readonly ia: AnthropicService,
    config: ConfigService,
  ) {
    this.lojas = lerLista(config.get<string>('LOJAS_PERMITIDAS'), LOJAS_PADRAO);
    this.fabricantes = lerLista(
      config.get<string>('FABRICANTES_PERMITIDOS'),
      FABRICANTES_PADRAO,
    );
    const horas = Number(config.get('OFERTAS_TTL_HORAS') ?? 6);
    const dias = Number(config.get('FICHAS_TTL_DIAS') ?? 30);
    this.cacheOfertas = new CacheTtl(horas * HORA_MS);
    this.cacheFichas = new CacheTtl(dias * DIA_MS);
  }

  async ficha(categoria: Categoria, nome: string): Promise<ResultadoFicha> {
    const chave = `${categoria}|${nome.toLowerCase()}`;
    const emCache = this.cacheFichas.get(chave);
    if (emCache) return { ficha: emCache };

    const campos = CAMPOS_OBRIGATORIOS[categoria]
      .map((campo) => `- ${campo}: ${DESCRICAO_CAMPOS[campo]}`)
      .join('\n');

    const { texto, urlsEncontradas } = await this.ia.pesquisar({
      sistema: SISTEMA_FICHA,
      pergunta: `Peça: ${nome} (categoria: ${categoria}).\nCampos de "specs" a preencher:\n${campos}`,
      dominios: this.fabricantes,
      maxBuscas: 3,
    });

    const resultado = validarFicha(extrairJson(texto), {
      categoria,
      nome,
      urlsEncontradas,
      dominios: this.fabricantes,
      agora: new Date(),
    });

    if ('erro' in resultado) return { erro: resultado.erro };
    this.cacheFichas.set(chave, resultado.ficha);
    return { ficha: resultado.ficha };
  }

  async ofertas(
    categoria: Categoria,
    nome: string,
    precoReferencia?: number,
  ): Promise<ResultadoOfertas> {
    const chave = `${categoria}|${nome.toLowerCase()}`;
    const emCache = this.cacheOfertas.get(chave);
    if (emCache) return emCache;

    const { texto, urlsEncontradas } = await this.ia.pesquisar({
      sistema: SISTEMA_OFERTAS,
      pergunta: `Peça: ${nome} (categoria: ${categoria}). Encontre até 4 ofertas em lojas brasileiras.`,
      dominios: this.lojas,
      maxBuscas: 3,
    });

    const resultado = validarOfertas(extrairJson(texto), {
      urlsEncontradas,
      dominios: this.lojas,
      precoReferencia,
      agora: new Date(),
    });

    // Só guarda em cache quando houve ao menos uma oferta confirmada.
    if (resultado.ofertas.length > 0) this.cacheOfertas.set(chave, resultado);
    return resultado;
  }

  async analisar(itens: ItemEntrada[]): Promise<RelatorioAnalise> {
    const resultados = await executarComLimite(itens, 3, async (item) => {
      const ficha = await this.fichaSegura(item);
      const ofertas = await this.ofertasSegura(item);
      return { item, ficha, ofertas };
    });

    const fichas = resultados.flatMap((r) =>
      r.ficha.ficha ? [r.ficha.ficha] : [],
    );
    const problemas = verificarCompatibilidade(fichas);

    const linhas: ItemRelatorio[] = resultados.map(
      ({ item, ficha, ofertas }) => {
        const confiaveis = ofertas.ofertas.filter(
          (o) => o.disponivel !== false && !o.suspeita,
        );
        const melhor = confiaveis[0] ?? null;
        const avisos = [...ofertas.descartadas];
        if (!melhor) avisos.push('Nenhuma oferta confiável encontrada.');
        for (const o of ofertas.ofertas) {
          if (o.suspeita) avisos.push(`${o.loja}: ${o.suspeita}`);
        }
        return {
          categoria: item.categoria,
          nome: item.nome,
          ficha: ficha.ficha ?? null,
          motivoSemFicha: ficha.ficha
            ? null
            : (ficha.erro ?? 'Ficha não encontrada.'),
          melhorOferta: melhor,
          outrasOfertas: ofertas.ofertas.filter((o) => o !== melhor),
          avisos,
        };
      },
    );

    const todasComOferta = linhas.every((l) => l.melhorOferta);
    const parcial = linhas.reduce(
      (soma, l) => soma + (l.melhorOferta?.precoBRL ?? 0),
      0,
    );

    return {
      geradoEm: new Date().toISOString(),
      itens: linhas,
      problemas,
      compatibilidadeConfirmada:
        problemas.length === 0 && linhas.every((l) => l.ficha !== null),
      totalBRL: todasComOferta ? arredondar(parcial) : null,
      totalParcialBRL: arredondar(parcial),
      aviso: AVISO_PRECOS,
    };
  }

  private async fichaSegura(item: ItemEntrada): Promise<ResultadoFicha> {
    try {
      return await this.ficha(item.categoria, item.nome);
    } catch (erro) {
      this.logger.error(
        `Falha ao pesquisar ficha de "${item.nome}"`,
        erro as Error,
      );
      return { erro: 'Falha ao consultar a pesquisa. Tente novamente.' };
    }
  }

  private async ofertasSegura(item: ItemEntrada): Promise<ResultadoOfertas> {
    try {
      return await this.ofertas(
        item.categoria,
        item.nome,
        item.precoReferencia,
      );
    } catch (erro) {
      this.logger.error(
        `Falha ao pesquisar preços de "${item.nome}"`,
        erro as Error,
      );
      return {
        ofertas: [],
        descartadas: ['Falha ao consultar a pesquisa de preços.'],
      };
    }
  }
}
