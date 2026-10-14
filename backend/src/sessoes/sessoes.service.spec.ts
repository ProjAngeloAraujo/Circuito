import { NotFoundException } from '@nestjs/common';
import { TriagemService } from '../triagem/triagem.service';
import { SessoesService } from './sessoes.service';

const RESPOSTAS_VALIDAS = [
  'Jogos',
  '7000',
  'Nada',
  'Tanto faz',
  'Quero RGB',
  'Desempenho agora',
  'Sou iniciante',
];

describe('SessoesService', () => {
  let service: SessoesService;

  beforeEach(() => {
    service = new SessoesService(new TriagemService());
  });

  it('cria uma sessão com a primeira pergunta no histórico', () => {
    const sessao = service.criarSessao();

    expect(sessao.status).toBe('em_andamento');
    expect(sessao.perguntaAtualId).toBe(1);
    expect(sessao.historico).toHaveLength(1);
    expect(sessao.historico[0].autor).toBe('assistente');
  });

  it('lança NotFoundException para sessão inexistente', () => {
    expect(() => service.obterSessao('id-que-nao-existe')).toThrow(
      NotFoundException,
    );
  });

  it('repete a mesma pergunta e não avança o progresso quando a resposta é inválida', () => {
    const sessao = service.criarSessao();
    const atualizada = service.responder(sessao.id, 'opção que não existe');

    expect(atualizada.perguntaAtualId).toBe(1);
    expect(atualizada.status).toBe('em_andamento');
    const ultimaMensagem =
      atualizada.historico[atualizada.historico.length - 1];
    expect(ultimaMensagem.autor).toBe('assistente');
    expect(ultimaMensagem.texto).toContain('Não reconheci');
  });

  it('conclui a triagem após as 7 respostas válidas e monta o perfil', () => {
    const sessao = service.criarSessao();
    let atual = sessao;

    for (const resposta of RESPOSTAS_VALIDAS) {
      atual = service.responder(atual.id, resposta);
    }

    expect(atual.status).toBe('concluida');
    expect(atual.perguntaAtualId).toBeNull();
    expect(atual.perfil).toEqual({
      usoPrincipal: 'jogos',
      orcamentoTotal: 7000,
      possuiAtual: 'nada',
      preferenciaProcessador: 'tanto_faz',
      estetica: 'rgb',
      prioridade: 'desempenho_agora',
      nivelConhecimento: 'iniciante',
    });
  });

  it('avisa quando o usuário responde após a triagem já concluída', () => {
    const sessao = service.criarSessao();
    let atual = sessao;
    for (const resposta of RESPOSTAS_VALIDAS) {
      atual = service.responder(atual.id, resposta);
    }

    atual = service.responder(atual.id, 'mais uma mensagem');

    const ultimaMensagem = atual.historico[atual.historico.length - 1];
    expect(ultimaMensagem.texto).toContain('já foi concluída');
  });
});
