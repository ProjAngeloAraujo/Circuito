import { Pergunta } from './triagem.types';

export const ORCAMENTO_MINIMO = 1500;
export const ORCAMENTO_MAXIMO = 100000;
export const TAMANHO_MAXIMO_RESPOSTA = 200;

export const PERGUNTAS: Pergunta[] = [
  {
    id: 1,
    chave: 'usoPrincipal',
    texto: 'Para começar, qual é o uso principal do computador?',
    tipo: 'opcoes',
    opcoes: [
      { valor: 'jogos', rotulo: 'Jogos' },
      { valor: 'estudo_trabalho', rotulo: 'Estudo e trabalho' },
      { valor: 'edicao', rotulo: 'Edição de vídeo e imagem' },
      { valor: 'programacao', rotulo: 'Programação' },
    ],
  },
  {
    id: 2,
    chave: 'orcamentoTotal',
    texto:
      'Qual é o orçamento total para o computador? Pode digitar, por exemplo, 5000 ou R$ 5.000,00.',
    tipo: 'numero',
  },
  {
    id: 3,
    chave: 'possuiAtual',
    texto: 'Você já tem algum desses itens?',
    tipo: 'opcoes',
    opcoes: [
      { valor: 'nada', rotulo: 'Nada' },
      { valor: 'so_monitor', rotulo: 'Só o monitor' },
      { valor: 'monitor_teclado_mouse', rotulo: 'Monitor, teclado e mouse' },
    ],
  },
  {
    id: 4,
    chave: 'preferenciaProcessador',
    texto: 'Tem preferência de marca para o processador?',
    tipo: 'opcoes',
    opcoes: [
      { valor: 'intel', rotulo: 'Intel' },
      { valor: 'amd', rotulo: 'AMD' },
      { valor: 'tanto_faz', rotulo: 'Tanto faz' },
    ],
  },
  {
    id: 5,
    chave: 'estetica',
    texto: 'Que estilo você prefere para o gabinete?',
    tipo: 'opcoes',
    opcoes: [
      { valor: 'rgb', rotulo: 'Quero RGB' },
      { valor: 'discreto', rotulo: 'Prefiro discreto' },
      { valor: 'tanto_faz', rotulo: 'Tanto faz' },
    ],
  },
  {
    id: 6,
    chave: 'prioridade',
    texto: 'O que é mais importante agora?',
    tipo: 'opcoes',
    opcoes: [
      { valor: 'desempenho_agora', rotulo: 'Desempenho agora' },
      { valor: 'margem_upgrade', rotulo: 'Margem para upgrade' },
    ],
  },
  {
    id: 7,
    chave: 'nivelConhecimento',
    texto:
      'Para eu ajustar as explicações: qual é o seu nível de conhecimento em hardware?',
    tipo: 'opcoes',
    opcoes: [
      { valor: 'iniciante', rotulo: 'Sou iniciante' },
      { valor: 'intermediario', rotulo: 'Já entendo o básico' },
    ],
  },
];

export const TOTAL_PERGUNTAS = PERGUNTAS.length;

const ROTULOS_LEGIVEIS: Record<string, string> = {
  usoPrincipal: 'uso principal',
  orcamentoTotal: 'orçamento',
  possuiAtual: 'o que já possui',
  preferenciaProcessador: 'preferência de processador',
  estetica: 'estética',
  prioridade: 'prioridade',
  nivelConhecimento: 'nível de conhecimento',
};

export function rotuloLegivelDoCampo(chave: string): string {
  return ROTULOS_LEGIVEIS[chave] ?? chave;
}
