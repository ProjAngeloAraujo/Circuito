export type UsoPrincipal =
  'jogos' | 'estudo_trabalho' | 'edicao' | 'programacao';
export type PossuiAtual = 'nada' | 'so_monitor' | 'monitor_teclado_mouse';
export type PreferenciaProcessador = 'intel' | 'amd' | 'tanto_faz';
export type Estetica = 'rgb' | 'discreto' | 'tanto_faz';
export type Prioridade = 'desempenho_agora' | 'margem_upgrade';
export type NivelConhecimento = 'iniciante' | 'intermediario';

export interface PerfilUsuario {
  usoPrincipal: UsoPrincipal;
  orcamentoTotal: number;
  possuiAtual: PossuiAtual;
  preferenciaProcessador: PreferenciaProcessador;
  estetica: Estetica;
  prioridade: Prioridade;
  nivelConhecimento: NivelConhecimento;
}

export type ChavePerfil = keyof PerfilUsuario;

export interface OpcaoPergunta {
  valor: string;
  rotulo: string;
}

export interface Pergunta {
  id: number;
  chave: ChavePerfil;
  texto: string;
  tipo: 'opcoes' | 'numero';
  opcoes?: OpcaoPergunta[];
}

export interface PerguntaPublica {
  id: number;
  chave: ChavePerfil;
  texto: string;
  tipo: 'opcoes' | 'numero';
  opcoes?: OpcaoPergunta[];
}

export type ResultadoResposta =
  | { sucesso: true; chave: ChavePerfil; valor: string | number }
  | { sucesso: false; erro: string };
