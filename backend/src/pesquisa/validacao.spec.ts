import {
  coletarUrls,
  dominioPermitido,
  extrairJson,
  normalizarUrl,
  sanitizarSpecs,
  validarFicha,
  validarOfertas,
} from './validacao';

const agora = new Date('2026-10-13T12:00:00.000Z');
const lojas = ['kabum.com.br', 'pichau.com.br'];

const urlsEncontradas = (...urls: string[]) => new Set(urls.map(normalizarUrl));

describe('extrairJson', () => {
  it('lê JSON dentro de uma cerca de código', () => {
    const texto = 'Segue:\n```json\n{"ofertas":[]}\n```';
    expect(extrairJson(texto)).toEqual({ ofertas: [] });
  });

  it('devolve null quando não há JSON válido', () => {
    expect(extrairJson('sem json')).toBeNull();
    expect(extrairJson('{quebrado')).toBeNull();
  });
});

describe('coletarUrls', () => {
  it('junta URLs de resultados e citações em qualquer nível', () => {
    const blocos = [
      { type: 'server_tool_use', input: { query: 'ryzen 5 7600' } },
      {
        type: 'web_search_tool_result',
        content: [
          {
            type: 'web_search_result',
            url: 'https://www.kabum.com.br/produto/1/',
            title: 'x',
          },
        ],
      },
      {
        type: 'text',
        text: 'oi',
        citations: [
          {
            type: 'web_search_result_location',
            url: 'https://www.pichau.com.br/p2?ref=a',
          },
        ],
      },
    ];
    const urls = coletarUrls(blocos);
    expect(urls.has(normalizarUrl('https://www.kabum.com.br/produto/1'))).toBe(
      true,
    );
    expect(urls.has(normalizarUrl('https://www.pichau.com.br/p2'))).toBe(true);
  });
});

describe('dominioPermitido', () => {
  it('aceita o domínio e seus subdomínios com https', () => {
    expect(dominioPermitido('https://www.kabum.com.br/x', lojas)).toBe(true);
    expect(dominioPermitido('https://kabum.com.br/x', lojas)).toBe(true);
  });

  it('recusa http, domínios parecidos e URLs inválidas', () => {
    expect(dominioPermitido('http://kabum.com.br/x', lojas)).toBe(false);
    expect(dominioPermitido('https://kabum.com.br.golpe.com/x', lojas)).toBe(
      false,
    );
    expect(dominioPermitido('https://notkabum.com.br/x', lojas)).toBe(false);
    expect(dominioPermitido('não é url', lojas)).toBe(false);
  });
});

describe('validarOfertas', () => {
  const url1 = 'https://www.kabum.com.br/produto/1';
  const url2 = 'https://www.pichau.com.br/produto/2';
  const contexto = (extra = {}) => ({
    urlsEncontradas: urlsEncontradas(url1, url2),
    dominios: lojas,
    agora,
    ...extra,
  });

  it('aceita ofertas válidas e ordena pelo menor preço', () => {
    const bruto = {
      ofertas: [
        {
          loja: 'Pichau',
          url: url2,
          precoBRL: 1500,
          disponivel: true,
          cupom: null,
        },
        {
          loja: 'KaBuM!',
          url: url1,
          precoBRL: 1399.909,
          disponivel: true,
          cupom: null,
        },
      ],
    };
    const { ofertas, descartadas } = validarOfertas(bruto, contexto());
    expect(descartadas).toEqual([]);
    expect(ofertas.map((o) => o.loja)).toEqual(['KaBuM!', 'Pichau']);
    expect(ofertas[0].precoBRL).toBe(1399.91);
    expect(ofertas[0].coletadaEm).toBe(agora.toISOString());
  });

  it('descarta URL que não apareceu na busca', () => {
    const bruto = {
      ofertas: [
        {
          loja: 'KaBuM!',
          url: 'https://www.kabum.com.br/inventada',
          precoBRL: 900,
        },
      ],
    };
    const { ofertas, descartadas } = validarOfertas(bruto, contexto());
    expect(ofertas).toEqual([]);
    expect(descartadas[0]).toContain('não apareceu nos resultados');
  });

  it('descarta domínio fora da lista, preço inválido e oferta incompleta', () => {
    const bruto = {
      ofertas: [
        { loja: 'Golpe', url: 'https://loja-falsa.com/x', precoBRL: 100 },
        { loja: 'KaBuM!', url: url1, precoBRL: -5 },
        { loja: 'KaBuM!', url: url1, precoBRL: '1000' },
        { loja: '', url: url1, precoBRL: 1000 },
      ],
    };
    const { ofertas, descartadas } = validarOfertas(bruto, contexto());
    expect(ofertas).toEqual([]);
    expect(descartadas).toHaveLength(4);
  });

  it('só mantém cupom com código, condição e validade', () => {
    const bruto = {
      ofertas: [
        {
          loja: 'KaBuM!',
          url: url1,
          precoBRL: 1000,
          cupom: {
            codigo: 'PC10',
            condicao: 'acima de R$ 500',
            validade: '2026-10-31',
          },
        },
        {
          loja: 'Pichau',
          url: url2,
          precoBRL: 1100,
          cupom: { codigo: 'SEMREGRA' },
        },
      ],
    };
    const { ofertas } = validarOfertas(bruto, contexto());
    expect(ofertas[0].cupom?.codigo).toBe('PC10');
    expect(ofertas[1].cupom).toBeNull();
  });

  it('marca como suspeito um preço muito distante da referência', () => {
    const bruto = {
      ofertas: [
        { loja: 'KaBuM!', url: url1, precoBRL: 300 },
        { loja: 'Pichau', url: url2, precoBRL: 1000 },
      ],
    };
    const { ofertas } = validarOfertas(
      bruto,
      contexto({ precoReferencia: 1000 }),
    );
    expect(ofertas.find((o) => o.loja === 'KaBuM!')?.suspeita).toBeDefined();
    expect(ofertas.find((o) => o.loja === 'Pichau')?.suspeita).toBeUndefined();
  });

  it('trata resposta sem lista de ofertas', () => {
    const { ofertas, descartadas } = validarOfertas(null, contexto());
    expect(ofertas).toEqual([]);
    expect(descartadas).toHaveLength(1);
  });
});

describe('sanitizarSpecs', () => {
  it('normaliza tipos e descarta campos desconhecidos ou inválidos', () => {
    const specs = sanitizarSpecs({
      socket: ' AM5 ',
      ramType: 'ddr 5',
      interface: 'nvme',
      tdpW: 105,
      lengthMm: -1,
      m2Slots: 0,
      socketsSuportados: ['AM5', '', 3],
      campoInventado: 'x',
    });
    expect(specs).toEqual({
      socket: 'AM5',
      ramType: 'DDR5',
      interface: 'NVME',
      tdpW: 105,
      m2Slots: 0,
      socketsSuportados: ['AM5'],
    });
  });
});

describe('validarFicha', () => {
  const fonte = 'https://www.amd.com/pt/products/cpu/ryzen-5-7600';
  const contexto = {
    categoria: 'cpu' as const,
    nome: 'Ryzen 5 7600',
    urlsEncontradas: urlsEncontradas(fonte),
    dominios: ['amd.com', 'intel.com'],
    agora,
  };

  it('aceita ficha completa com fonte verificada', () => {
    const r = validarFicha(
      { specs: { socket: 'AM5', tdpW: 65 }, fontes: [fonte] },
      contexto,
    );
    expect('ficha' in r && r.ficha.specs).toEqual({ socket: 'AM5', tdpW: 65 });
    expect('ficha' in r && r.ficha.fontes).toEqual([fonte]);
  });

  it('recusa ficha sem fonte verificável', () => {
    const r = validarFicha(
      {
        specs: { socket: 'AM5', tdpW: 65 },
        fontes: ['https://www.amd.com/inventada'],
      },
      contexto,
    );
    expect('erro' in r).toBe(true);
  });

  it('recusa ficha incompleta e diz quais campos faltam', () => {
    const r = validarFicha(
      { specs: { socket: 'AM5' }, fontes: [fonte] },
      contexto,
    );
    expect('erro' in r && r.erro).toContain('tdpW');
  });

  it('recusa resposta que não é um objeto', () => {
    expect('erro' in validarFicha(null, contexto)).toBe(true);
  });
});

describe('sanitizarSpecs com formato da placa e potência máxima', () => {
  it('padroniza formatos escritos de formas diferentes e ignora os desconhecidos', () => {
    const specs = sanitizarSpecs({
      formFactor: 'Micro-ATX',
      formFactorsSuportados: [
        'Mini-ITX',
        'MicroATX',
        'ATX',
        'E-ATX (305mm x 277mm)',
        'xyz',
      ],
      potenciaMaximaW: 148,
    });
    expect(specs).toEqual({
      formFactor: 'mATX',
      formFactorsSuportados: ['ITX', 'mATX', 'ATX', 'E-ATX'],
      potenciaMaximaW: 148,
    });
  });
});
