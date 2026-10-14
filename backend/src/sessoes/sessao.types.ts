import { PerfilUsuario, PerguntaPublica } from '../triagem/triagem.types';

export type AutorMensagem = 'assistente' | 'usuario';

export interface MensagemChat {
  autor: AutorMensagem;
  texto: string;
  criadaEm: string;
}

export type StatusSessao = 'em_andamento' | 'concluida';

export interface SessaoEntidade {
  id: string;
  criadaEm: string;
  status: StatusSessao;
  perguntaAtualId: number | null;
  perfilParcial: Partial<PerfilUsuario>;
  perfil: PerfilUsuario | null;
  historico: MensagemChat[];
}

export interface SessaoRespostaDto {
  id: string;
  status: StatusSessao;
  progresso: { respondidas: number; total: number };
  perguntaAtual: PerguntaPublica | null;
  historico: MensagemChat[];
  perfil: (PerfilUsuario & { resumo: string }) | null;
}
