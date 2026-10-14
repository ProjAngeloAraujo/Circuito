export type AutorMensagem = 'assistente' | 'usuario';

export interface MensagemChat {
  autor: AutorMensagem;
  texto: string;
  criadaEm: string;
}

export interface OpcaoPergunta {
  valor: string;
  rotulo: string;
}

export type TipoPergunta = 'opcoes' | 'numero';

export interface PerguntaPublica {
  id: number;
  chave: string;
  texto: string;
  tipo: TipoPergunta;
  opcoes?: OpcaoPergunta[];
}

export type StatusSessao = 'em_andamento' | 'concluida';

export interface PerfilResumo {
  usoPrincipal: string;
  orcamentoTotal: number;
  possuiAtual: string;
  preferenciaProcessador: string;
  estetica: string;
  prioridade: string;
  nivelConhecimento: string;
  resumo: string;
}

export interface SessaoResposta {
  id: string;
  status: StatusSessao;
  progresso: { respondidas: number; total: number };
  perguntaAtual: PerguntaPublica | null;
  historico: MensagemChat[];
  perfil: PerfilResumo | null;
}
