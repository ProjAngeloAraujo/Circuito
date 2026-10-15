import { verificarCompatibilidade } from './compatibilidade';
import { Categoria, FichaTecnica, Specs } from './pesquisa.types';

const ficha = (
  categoria: Categoria,
  specs: Specs,
  nome: string = categoria,
): FichaTecnica => ({
  categoria,
  nome,
  specs,
  fontes: ['https://exemplo.com/ficha'],
  coletadaEm: '2026-10-13T00:00:00.000Z',
});

const base = (): FichaTecnica[] => [
  ficha('cpu', { socket: 'AM5', tdpW: 105 }),
  ficha('placa-mae', { socket: 'AM5', ramType: 'DDR5', m2Slots: 2 }),
  ficha('ram', { ramType: 'DDR5' }),
  ficha('gpu', { lengthMm: 300, tdpW: 200 }),
  ficha('gabinete', { maxGpuLengthMm: 350, maxCoolerHeightMm: 160 }),
  ficha('cooler', {
    heightMm: 155,
    socketsSuportados: ['AM4', 'AM5', 'LGA1700'],
  }),
  ficha('fonte', { potenciaW: 650 }),
  ficha('armazenamento', { interface: 'NVME' }),
];

const trocar = (itens: FichaTecnica[], nova: FichaTecnica) =>
  itens.map((i) => (i.categoria === nova.categoria ? nova : i));

describe('verificarCompatibilidade', () => {
  it('não aponta problemas em uma combinação compatível', () => {
    expect(verificarCompatibilidade(base())).toEqual([]);
  });

  it('recusa soquete diferente entre processador e placa-mãe', () => {
    const itens = trocar(
      base(),
      ficha('placa-mae', { socket: 'LGA1700', ramType: 'DDR5', m2Slots: 2 }),
    );
    const regras = verificarCompatibilidade(itens).map((p) => p.regra);
    expect(regras).toContain('cpu-placa-mae');
  });

  it('ignora diferenças de formatação no soquete', () => {
    const itens = [
      ficha('cpu', { socket: 'LGA 1700', tdpW: 65 }),
      ficha('placa-mae', { socket: 'lga-1700', ramType: 'DDR4', m2Slots: 1 }),
    ];
    expect(verificarCompatibilidade(itens)).toEqual([]);
  });

  it('recusa memória de tipo diferente do aceito pela placa-mãe', () => {
    const itens = trocar(base(), ficha('ram', { ramType: 'DDR4' }));
    expect(verificarCompatibilidade(itens).map((p) => p.regra)).toContain(
      'ram-placa-mae',
    );
  });

  it('recusa placa de vídeo maior que o gabinete aceita', () => {
    const itens = trocar(base(), ficha('gpu', { lengthMm: 360, tdpW: 200 }));
    expect(verificarCompatibilidade(itens).map((p) => p.regra)).toContain(
      'gpu-gabinete',
    );
  });

  it('recusa cooler mais alto que o gabinete aceita', () => {
    const itens = trocar(
      base(),
      ficha('cooler', { heightMm: 170, socketsSuportados: ['AM5'] }),
    );
    expect(verificarCompatibilidade(itens).map((p) => p.regra)).toContain(
      'cooler-gabinete',
    );
  });

  it('recusa cooler sem suporte ao soquete do processador', () => {
    const itens = trocar(
      base(),
      ficha('cooler', { heightMm: 150, socketsSuportados: ['LGA1700'] }),
    );
    expect(verificarCompatibilidade(itens).map((p) => p.regra)).toContain(
      'cooler-cpu',
    );
  });

  it('recusa fonte abaixo da potência estimada com margem', () => {
    // consumo estimado: 105 + 200 + 100 = 405 W; com margem de 30%: 527 W
    const itens = trocar(base(), ficha('fonte', { potenciaW: 500 }));
    const problema = verificarCompatibilidade(itens).find(
      (p) => p.regra === 'fonte',
    );
    expect(problema?.mensagem).toContain('527');
  });

  it('recusa mais unidades NVMe do que slots M.2', () => {
    const itens = [
      ...trocar(
        base(),
        ficha('placa-mae', { socket: 'AM5', ramType: 'DDR5', m2Slots: 1 }),
      ),
      ficha('armazenamento', { interface: 'NVME' }, 'segundo'),
    ];
    expect(verificarCompatibilidade(itens).map((p) => p.regra)).toContain(
      'armazenamento-placa-mae',
    );
  });

  it('não conta unidades SATA nos slots M.2', () => {
    const itens = [
      ...trocar(
        base(),
        ficha('placa-mae', { socket: 'AM5', ramType: 'DDR5', m2Slots: 1 }),
      ),
      ficha('armazenamento', { interface: 'SATA' }, 'hd'),
    ];
    expect(verificarCompatibilidade(itens)).toEqual([]);
  });

  it('trata FCLGA1700 (Intel ARK) e LGA1700 como o mesmo soquete', () => {
    const itens = [
      ficha('cpu', { socket: 'FCLGA1700', tdpW: 65 }),
      ficha('placa-mae', { socket: 'LGA1700', ramType: 'DDR5', m2Slots: 1 }),
      ficha('cooler', { heightMm: 150, socketsSuportados: ['LGA1700'] }),
    ];
    expect(verificarCompatibilidade(itens)).toEqual([]);
  });

  it('usa a potência máxima em turbo da CPU na estimativa da fonte', () => {
    // Com TDP de 65 W a conta daria 215 W e a fonte de 320 W passaria.
    // Com 148 W em turbo: 148 + 100 = 248 W, com margem de 30% = 323 W.
    const itens = [
      ficha('cpu', { socket: 'LGA1700', tdpW: 65, potenciaMaximaW: 148 }),
      ficha('fonte', { potenciaW: 320 }),
    ];
    const problema = verificarCompatibilidade(itens).find(
      (p) => p.regra === 'fonte',
    );
    expect(problema?.mensagem).toContain('323');
  });

  it('recusa placa-mãe de formato que o gabinete não aceita', () => {
    const itens = [
      ficha('placa-mae', {
        socket: 'AM5',
        ramType: 'DDR5',
        m2Slots: 2,
        formFactor: 'E-ATX',
      }),
      ficha('gabinete', {
        maxGpuLengthMm: 350,
        maxCoolerHeightMm: 160,
        formFactorsSuportados: ['ITX', 'mATX', 'ATX'],
      }),
    ];
    expect(verificarCompatibilidade(itens).map((p) => p.regra)).toContain(
      'placa-mae-gabinete',
    );
  });

  it('aceita placa-mãe de formato listado pelo gabinete', () => {
    const itens = [
      ficha('placa-mae', {
        socket: 'AM5',
        ramType: 'DDR5',
        m2Slots: 2,
        formFactor: 'mATX',
      }),
      ficha('gabinete', {
        maxGpuLengthMm: 350,
        maxCoolerHeightMm: 160,
        formFactorsSuportados: ['ITX', 'mATX', 'ATX'],
      }),
    ];
    expect(verificarCompatibilidade(itens)).toEqual([]);
  });

  it('ignora regras que dependem de peças ausentes', () => {
    expect(
      verificarCompatibilidade([ficha('cpu', { socket: 'AM5', tdpW: 65 })]),
    ).toEqual([]);
    expect(verificarCompatibilidade([])).toEqual([]);
  });
});
