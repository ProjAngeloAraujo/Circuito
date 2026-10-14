import { TriagemService } from './triagem.service';
import { PerfilUsuario } from './triagem.types';

describe('TriagemService', () => {
  let service: TriagemService;

  beforeEach(() => {
    service = new TriagemService();
  });

  describe('perguntas de opções', () => {
    it('aceita a resposta pelo rótulo, ignorando maiúsculas e acentos', () => {
      const resultado = service.processarResposta(
        1,
        'edição de vídeo e imagem',
      );
      expect(resultado).toEqual({
        sucesso: true,
        chave: 'usoPrincipal',
        valor: 'edicao',
      });
    });

    it('aceita a resposta pelo valor interno', () => {
      const resultado = service.processarResposta(1, 'PROGRAMACAO');
      expect(resultado).toEqual({
        sucesso: true,
        chave: 'usoPrincipal',
        valor: 'programacao',
      });
    });

    it('rejeita uma opção inexistente sem avançar', () => {
      const resultado = service.processarResposta(1, 'Netflix');
      expect(resultado.sucesso).toBe(false);
      if (!resultado.sucesso) {
        expect(resultado.erro).toContain('Não reconheci essa opção');
      }
    });
  });

  describe('pergunta de orçamento', () => {
    it.each([
      ['5000', 5000],
      ['5.000', 5000],
      ['R$ 5.000,00', 5000],
      ['r$5000', 5000],
    ])('interpreta "%s" como %d', (bruto, esperado) => {
      const resultado = service.processarResposta(2, bruto);
      expect(resultado).toEqual({
        sucesso: true,
        chave: 'orcamentoTotal',
        valor: esperado,
      });
    });

    it('rejeita valor abaixo do mínimo', () => {
      const resultado = service.processarResposta(2, '1000');
      expect(resultado.sucesso).toBe(false);
      if (!resultado.sucesso) {
        expect(resultado.erro).toContain('1.500');
      }
    });

    it('rejeita valor acima do máximo', () => {
      const resultado = service.processarResposta(2, '200000');
      expect(resultado.sucesso).toBe(false);
      if (!resultado.sucesso) {
        expect(resultado.erro).toContain('100.000');
      }
    });

    it('rejeita texto que não é um número', () => {
      const resultado = service.processarResposta(2, 'bastante dinheiro');
      expect(resultado.sucesso).toBe(false);
    });
  });

  describe('limite de tamanho', () => {
    it('rejeita respostas com mais de 200 caracteres', () => {
      const resultado = service.processarResposta(1, 'a'.repeat(201));
      expect(resultado.sucesso).toBe(false);
      if (!resultado.sucesso) {
        expect(resultado.erro).toContain('200 caracteres');
      }
    });
  });

  describe('montarResumo', () => {
    it('gera um resumo legível com todos os campos', () => {
      const perfil: PerfilUsuario = {
        usoPrincipal: 'jogos',
        orcamentoTotal: 5000,
        possuiAtual: 'nada',
        preferenciaProcessador: 'tanto_faz',
        estetica: 'rgb',
        prioridade: 'desempenho_agora',
        nivelConhecimento: 'iniciante',
      };

      const resumo = service.montarResumo(perfil);

      expect(resumo).toContain('Jogos');
      expect(resumo).toContain('R$ 5.000');
      expect(resumo).toContain('Quero RGB');
      expect(resumo).toContain('Sou iniciante');
    });
  });
});
