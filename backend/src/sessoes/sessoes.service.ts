import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { TriagemService } from '../triagem/triagem.service';
import { PerfilUsuario } from '../triagem/triagem.types';
import { SessaoEntidade } from './sessao.types';

const MENSAGEM_TRIAGEM_CONCLUIDA =
  'A triagem já foi concluída para esta sessão. Inicie uma nova sessão para recomeçar.';

@Injectable()
export class SessoesService {
  private readonly sessoes = new Map<string, SessaoEntidade>();

  constructor(private readonly triagem: TriagemService) {}

  criarSessao(): SessaoEntidade {
    const agora = new Date().toISOString();
    const primeiraPergunta = this.triagem.primeiraPergunta();

    const sessao: SessaoEntidade = {
      id: randomUUID(),
      criadaEm: agora,
      status: 'em_andamento',
      perguntaAtualId: primeiraPergunta.id,
      perfilParcial: {},
      perfil: null,
      historico: [
        { autor: 'assistente', texto: primeiraPergunta.texto, criadaEm: agora },
      ],
    };

    this.sessoes.set(sessao.id, sessao);
    return sessao;
  }

  obterSessao(id: string): SessaoEntidade {
    const sessao = this.sessoes.get(id);
    if (!sessao) {
      throw new NotFoundException('Sessão não encontrada.');
    }
    return sessao;
  }

  responder(id: string, textoBruto: string): SessaoEntidade {
    const sessao = this.obterSessao(id);
    sessao.historico.push({
      autor: 'usuario',
      texto: textoBruto,
      criadaEm: new Date().toISOString(),
    });

    if (sessao.status === 'concluida' || sessao.perguntaAtualId === null) {
      sessao.historico.push({
        autor: 'assistente',
        texto: MENSAGEM_TRIAGEM_CONCLUIDA,
        criadaEm: new Date().toISOString(),
      });
      return sessao;
    }

    const resultado = this.triagem.processarResposta(
      sessao.perguntaAtualId,
      textoBruto,
    );

    if (!resultado.sucesso) {
      sessao.historico.push({
        autor: 'assistente',
        texto: resultado.erro,
        criadaEm: new Date().toISOString(),
      });
      return sessao;
    }

    (sessao.perfilParcial as Record<string, string | number>)[resultado.chave] =
      resultado.valor;

    const proximaPergunta = this.triagem.obterPergunta(
      sessao.perguntaAtualId + 1,
    );

    if (proximaPergunta) {
      sessao.perguntaAtualId = proximaPergunta.id;
      sessao.historico.push({
        autor: 'assistente',
        texto: proximaPergunta.texto,
        criadaEm: new Date().toISOString(),
      });
      return sessao;
    }

    sessao.status = 'concluida';
    sessao.perguntaAtualId = null;
    sessao.perfil = sessao.perfilParcial as PerfilUsuario;

    sessao.historico.push({
      autor: 'assistente',
      texto: this.triagem.montarResumo(sessao.perfil),
      criadaEm: new Date().toISOString(),
    });

    return sessao;
  }
}
