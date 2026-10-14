import { Injectable } from '@nestjs/common';
import {
  ORCAMENTO_MAXIMO,
  ORCAMENTO_MINIMO,
  PERGUNTAS,
  TAMANHO_MAXIMO_RESPOSTA,
  TOTAL_PERGUNTAS,
} from './perguntas';
import { Pergunta, PerfilUsuario, ResultadoResposta } from './triagem.types';

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
}

function formatarReais(valor: number): string {
  return `R$ ${valor.toLocaleString('pt-BR')}`;
}

function listarOpcoes(pergunta: Pergunta): string {
  const rotulos = (pergunta.opcoes ?? []).map((opcao) => opcao.rotulo);
  if (rotulos.length <= 1) {
    return rotulos.join('');
  }
  return `${rotulos.slice(0, -1).join(', ')} ou ${rotulos[rotulos.length - 1]}`;
}

/**
 * Aceita "5000", "5.000" e "R$ 5.000,00": remove separador de milhar (ponto)
 * e trata a vírgula como separador decimal, na convenção brasileira.
 */
function tentarParsearOrcamento(bruto: string): number | null {
  let texto = bruto
    .trim()
    .replace(/^r\$\s*/i, '')
    .replace(/\s/g, '');
  if (texto.length === 0) {
    return null;
  }

  texto = texto.includes(',')
    ? texto.replace(/\./g, '').replace(',', '.')
    : texto.replace(/\./g, '');

  if (!/^\d+(\.\d+)?$/.test(texto)) {
    return null;
  }

  const valor = Number(texto);
  return Number.isFinite(valor) ? valor : null;
}

@Injectable()
export class TriagemService {
  obterPergunta(id: number): Pergunta | undefined {
    return PERGUNTAS.find((pergunta) => pergunta.id === id);
  }

  primeiraPergunta(): Pergunta {
    return PERGUNTAS[0];
  }

  totalPerguntas(): number {
    return TOTAL_PERGUNTAS;
  }

  /**
   * Valida a resposta bruta para a pergunta informada. Não altera estado:
   * quem chama decide o que fazer com o resultado (função pura e testável).
   */
  processarResposta(perguntaId: number, textoBruto: string): ResultadoResposta {
    const pergunta = this.obterPergunta(perguntaId);
    if (!pergunta) {
      return { sucesso: false, erro: 'Pergunta não encontrada.' };
    }

    if (textoBruto.length > TAMANHO_MAXIMO_RESPOSTA) {
      return {
        sucesso: false,
        erro: `Sua resposta é muito longa. Use no máximo ${TAMANHO_MAXIMO_RESPOSTA} caracteres.`,
      };
    }

    if (pergunta.tipo === 'numero') {
      return this.validarOrcamento(textoBruto);
    }

    return this.validarOpcao(pergunta, textoBruto);
  }

  private validarOpcao(
    pergunta: Pergunta,
    textoBruto: string,
  ): ResultadoResposta {
    const textoNormalizado = normalizar(textoBruto);
    const opcaoEncontrada = (pergunta.opcoes ?? []).find(
      (opcao) =>
        normalizar(opcao.valor) === textoNormalizado ||
        normalizar(opcao.rotulo) === textoNormalizado,
    );

    if (!opcaoEncontrada) {
      return {
        sucesso: false,
        erro: `Não reconheci essa opção. Escolha uma das opções: ${listarOpcoes(pergunta)}.`,
      };
    }

    return {
      sucesso: true,
      chave: pergunta.chave,
      valor: opcaoEncontrada.valor,
    };
  }

  private validarOrcamento(textoBruto: string): ResultadoResposta {
    const valor = tentarParsearOrcamento(textoBruto);

    if (valor === null) {
      return {
        sucesso: false,
        erro: 'Não entendi esse valor. Digite algo como 5000, 5.000 ou R$ 5.000,00.',
      };
    }

    if (valor < ORCAMENTO_MINIMO || valor > ORCAMENTO_MAXIMO) {
      return {
        sucesso: false,
        erro: `O orçamento deve ficar entre ${formatarReais(ORCAMENTO_MINIMO)} e ${formatarReais(
          ORCAMENTO_MAXIMO,
        )}. Pode ajustar o valor?`,
      };
    }

    return { sucesso: true, chave: 'orcamentoTotal', valor };
  }

  montarResumo(perfil: PerfilUsuario): string {
    const rotuloDaOpcao = (perguntaId: number, valor: string): string => {
      const pergunta = this.obterPergunta(perguntaId);
      return (
        pergunta?.opcoes?.find((opcao) => opcao.valor === valor)?.rotulo ??
        valor
      );
    };

    const linhas = [
      'Perfil montado com base nas suas respostas:',
      `- Uso principal: ${rotuloDaOpcao(1, perfil.usoPrincipal)}`,
      `- Orçamento total: ${formatarReais(perfil.orcamentoTotal)}`,
      `- O que já possui: ${rotuloDaOpcao(3, perfil.possuiAtual)}`,
      `- Preferência de processador: ${rotuloDaOpcao(4, perfil.preferenciaProcessador)}`,
      `- Estética: ${rotuloDaOpcao(5, perfil.estetica)}`,
      `- Prioridade: ${rotuloDaOpcao(6, perfil.prioridade)}`,
      `- Nível de conhecimento: ${rotuloDaOpcao(7, perfil.nivelConhecimento)}`,
    ];

    return linhas.join('\n');
  }
}
