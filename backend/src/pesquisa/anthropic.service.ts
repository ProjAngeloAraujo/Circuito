import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { coletarUrls } from './validacao';

export interface OpcoesPesquisa {
  sistema: string;
  pergunta: string;
  dominios: string[];
  maxBuscas: number;
}

export interface ResultadoPesquisa {
  texto: string;
  urlsEncontradas: Set<string>;
}

const MAX_RODADAS = 4;

@Injectable()
export class AnthropicService {
  private readonly cliente: Anthropic | null;
  private readonly modelo: string;

  constructor(config: ConfigService) {
    const chave = config.get<string>('ANTHROPIC_API_KEY');
    this.cliente = chave ? new Anthropic({ apiKey: chave }) : null;
    this.modelo = config.get<string>('ANTHROPIC_MODEL') || 'claude-sonnet-5-5';
  }

  disponivel(): boolean {
    return this.cliente !== null;
  }

  /**
   * Faz uma pesquisa com a ferramenta de busca na web, limitada aos domínios informados.
   * Devolve o texto final e todas as URLs que apareceram nos resultados da busca,
   * para que quem chama confira se a IA não inventou endereços.
   */
  async pesquisar(opcoes: OpcoesPesquisa): Promise<ResultadoPesquisa> {
    if (!this.cliente) {
      throw new ServiceUnavailableException(
        'A pesquisa com IA está desativada: configure ANTHROPIC_API_KEY no backend.',
      );
    }

    const mensagens: Anthropic.MessageParam[] = [
      { role: 'user', content: opcoes.pergunta },
    ];
    const urlsEncontradas = new Set<string>();
    let texto = '';

    for (let rodada = 0; rodada < MAX_RODADAS; rodada++) {
      const resposta = await this.cliente.messages.create({
        model: this.modelo,
        max_tokens: 2048,
        system: opcoes.sistema,
        messages: mensagens,
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search',
            max_uses: opcoes.maxBuscas,
            allowed_domains: opcoes.dominios,
            user_location: {
              type: 'approximate',
              country: 'BR',
              timezone: 'America/Sao_Paulo',
            },
          },
        ],
      });

      coletarUrls(resposta.content, urlsEncontradas);
      texto = resposta.content
        .filter((bloco): bloco is Anthropic.TextBlock => bloco.type === 'text')
        .map((bloco) => bloco.text)
        .join('\n');

      if (resposta.stop_reason !== 'pause_turn') break;
      mensagens.push({ role: 'assistant', content: resposta.content });
    }

    return { texto, urlsEncontradas };
  }
}
