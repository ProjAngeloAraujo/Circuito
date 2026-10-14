import { TriagemService } from '../triagem/triagem.service';
import { PerguntaPublica } from '../triagem/triagem.types';
import { SessaoEntidade, SessaoRespostaDto } from './sessao.types';

export function paraRespostaDto(
  sessao: SessaoEntidade,
  triagem: TriagemService,
): SessaoRespostaDto {
  const pergunta = sessao.perguntaAtualId
    ? triagem.obterPergunta(sessao.perguntaAtualId)
    : undefined;

  const perguntaAtual: PerguntaPublica | null = pergunta
    ? {
        id: pergunta.id,
        chave: pergunta.chave,
        texto: pergunta.texto,
        tipo: pergunta.tipo,
        opcoes: pergunta.opcoes,
      }
    : null;

  const respondidas =
    sessao.status === 'concluida'
      ? triagem.totalPerguntas()
      : (sessao.perguntaAtualId ?? 1) - 1;

  return {
    id: sessao.id,
    status: sessao.status,
    progresso: { respondidas, total: triagem.totalPerguntas() },
    perguntaAtual,
    historico: sessao.historico,
    perfil: sessao.perfil
      ? { ...sessao.perfil, resumo: triagem.montarResumo(sessao.perfil) }
      : null,
  };
}
