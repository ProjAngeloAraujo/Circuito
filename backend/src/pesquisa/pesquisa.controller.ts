import {
  BadRequestException,
  Body,
  Controller,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AnthropicService } from './anthropic.service';
import { CATEGORIAS, Categoria, ItemEntrada } from './pesquisa.types';
import { PesquisaService } from './pesquisa.service';

const MAX_ITENS = 10;

function lerItem(bruto: unknown): ItemEntrada {
  const item = (bruto ?? {}) as {
    categoria?: unknown;
    nome?: unknown;
    precoReferencia?: unknown;
  };
  if (
    typeof item.categoria !== 'string' ||
    !(CATEGORIAS as readonly string[]).includes(item.categoria)
  ) {
    throw new BadRequestException(
      `Categoria inválida. Use uma de: ${CATEGORIAS.join(', ')}.`,
    );
  }
  const nome = typeof item.nome === 'string' ? item.nome.trim() : '';
  if (nome.length < 2 || nome.length > 120) {
    throw new BadRequestException(
      'O nome da peça deve ter entre 2 e 120 caracteres.',
    );
  }
  let precoReferencia: number | undefined;
  if (item.precoReferencia !== undefined) {
    if (
      typeof item.precoReferencia !== 'number' ||
      !Number.isFinite(item.precoReferencia) ||
      item.precoReferencia <= 0
    ) {
      throw new BadRequestException(
        '"precoReferencia", quando enviado, deve ser um número positivo.',
      );
    }
    precoReferencia = item.precoReferencia;
  }
  return { categoria: item.categoria as Categoria, nome, precoReferencia };
}

@Controller('pesquisa')
export class PesquisaController {
  constructor(
    private readonly pesquisa: PesquisaService,
    private readonly ia: AnthropicService,
  ) {}

  /** Pesquisa ficha técnica e preços de uma lista de peças e confere a compatibilidade. */
  @Post('analisar')
  analisar(@Body() corpo: { itens?: unknown }) {
    this.exigirIa();
    if (!Array.isArray(corpo?.itens) || corpo.itens.length === 0) {
      throw new BadRequestException('Envie "itens" com pelo menos uma peça.');
    }
    if (corpo.itens.length > MAX_ITENS) {
      throw new BadRequestException(
        `Envie no máximo ${MAX_ITENS} peças por análise.`,
      );
    }
    return this.pesquisa.analisar(corpo.itens.map(lerItem));
  }

  @Post('ficha')
  async ficha(@Body() corpo: unknown) {
    this.exigirIa();
    const item = lerItem(corpo);
    return this.pesquisa.ficha(item.categoria, item.nome);
  }

  @Post('ofertas')
  async ofertas(@Body() corpo: unknown) {
    this.exigirIa();
    const item = lerItem(corpo);
    return this.pesquisa.ofertas(item.categoria, item.nome);
  }

  private exigirIa() {
    if (!this.ia.disponivel()) {
      throw new ServiceUnavailableException(
        'A pesquisa com IA está desativada: configure ANTHROPIC_API_KEY no backend.',
      );
    }
  }
}
