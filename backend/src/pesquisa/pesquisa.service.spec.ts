import { AnthropicService, ResultadoPesquisa } from './anthropic.service';
import { ConfigService } from '@nestjs/config';
import { PesquisaService } from './pesquisa.service';
import { normalizarUrl } from './validacao';

function iaFalsa(resposta: ResultadoPesquisa): AnthropicService {
  return { pesquisar: jest.fn().mockResolvedValue(resposta) } as unknown as AnthropicService;
}

function configFalsa(): ConfigService {
  return { get: () => undefined } as unknown as ConfigService;
}

describe('PesquisaService.analisar — checagem de preço suspeito', () => {
  const urlOferta = 'https://www.kabum.com.br/produto/123';

  it('marca como suspeita uma oferta muito abaixo do preço de referência', async () => {
    const textoOfertas = JSON.stringify({
      ofertas: [
        { loja: 'KaBuM!', url: urlOferta, precoBRL: 100, disponivel: true, cupom: null },
      ],
    });
    const ia = iaFalsa({
      texto: textoOfertas,
      urlsEncontradas: new Set([normalizarUrl(urlOferta)]),
    });
    const servico = new PesquisaService(ia, configFalsa());

    const relatorio = await servico.analisar([
      { categoria: 'cpu', nome: 'Processador Teste', precoReferencia: 2000 },
    ]);

    const item = relatorio.itens[0];
    // A oferta suspeita não pode virar "melhor oferta" nem entrar silenciosamente.
    expect(item.melhorOferta).toBeNull();
    expect(item.avisos.some((a) => a.includes('Preço muito diferente do valor de referência'))).toBe(
      true,
    );
  });

  it('não marca como suspeita uma oferta dentro da faixa aceitável', async () => {
    const textoOfertas = JSON.stringify({
      ofertas: [
        { loja: 'KaBuM!', url: urlOferta, precoBRL: 1900, disponivel: true, cupom: null },
      ],
    });
    const ia = iaFalsa({
      texto: textoOfertas,
      urlsEncontradas: new Set([normalizarUrl(urlOferta)]),
    });
    const servico = new PesquisaService(ia, configFalsa());

    const relatorio = await servico.analisar([
      { categoria: 'cpu', nome: 'Processador Teste', precoReferencia: 2000 },
    ]);

    const item = relatorio.itens[0];
    expect(item.melhorOferta?.precoBRL).toBe(1900);
    expect(item.avisos.some((a) => a.includes('valor de referência'))).toBe(false);
  });
});
