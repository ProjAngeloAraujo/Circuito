import { verificarCompatibilidade } from '../pesquisa/compatibilidade';
import { FichaTecnica } from '../pesquisa/pesquisa.types';
import { carregarCatalogo } from './catalogo.loader';
import { validarPeca } from './catalogo.validacao';
import { PecaCatalogo } from './catalogo.types';

const { pecas, erros } = carregarCatalogo();

const ficha = (id: string): FichaTecnica => {
  const p = pecas.find((x) => x.id === id);
  if (!p) throw new Error(`peça ${id} não encontrada`);
  return {
    categoria: p.categoria,
    nome: `${p.marca} ${p.modelo}`,
    specs: p.specs,
    fontes: p.fontes.map((f) => f.url),
    coletadaEm: p.fontes[0].coletadaEm,
  };
};

describe('catálogo real', () => {
  it('não tem erros de validação', () => {
    expect(erros).toEqual([]);
  });

  it('tem ao menos uma peça por categoria', () => {
    const cats = new Set(pecas.map((p) => p.categoria));
    expect(cats.size).toBe(8);
  });

  it('build A (AMD) não tem problemas de compatibilidade', () => {
    const itens = [
      'amd-ryzen-5-7600',
      'asus-prime-b650m-a',
      'kingston-fury-beast-ddr5',
      'asus-dual-rtx4060-o8g',
      'corsair-4000d-airflow-cc-9011200-ww',
      'cooler-master-hyper-212-black',
      'corsair-rm750e-cp-9020295-na',
      'samsung-990-evo-1tb',
    ].map(ficha);
    expect(verificarCompatibilidade(itens)).toEqual([]);
  });

  it('build B (i5 numa placa AM5) acusa soquete incompatível', () => {
    const itens = ['intel-core-i5-14400f', 'asus-prime-b650m-a'].map(ficha);
    expect(verificarCompatibilidade(itens).map((p) => p.regra)).toContain(
      'cpu-placa-mae',
    );
  });
});

describe('validarPeca', () => {
  const base = (): PecaCatalogo => JSON.parse(JSON.stringify(pecas[0]));

  it('rejeita peça verificada sem fonte de fabricante', () => {
    const p = base();
    p.status = 'verificada';
    p.fontes = [
      {
        url: 'https://www.kabum.com.br/x',
        titulo: 'x',
        coletadaEm: '2026-10-14',
      },
    ];
    expect(validarPeca(p).length).toBeGreaterThan(0);
  });

  it('rejeita campo obrigatório ausente', () => {
    const p = base();
    delete p.specs.socket;
    expect(validarPeca(p).length).toBeGreaterThan(0);
  });
});
