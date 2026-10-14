import type { PerfilResumo } from '../types';

interface ResumoPerfilProps {
  perfil: PerfilResumo;
  onRecomecar: () => void;
}

function formatarReais(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

const CAMPOS: { chave: keyof PerfilResumo; rotulo: string }[] = [
  { chave: 'usoPrincipal', rotulo: 'Uso principal' },
  { chave: 'orcamentoTotal', rotulo: 'Orçamento total' },
  { chave: 'possuiAtual', rotulo: 'O que já possui' },
  { chave: 'preferenciaProcessador', rotulo: 'Preferência de processador' },
  { chave: 'estetica', rotulo: 'Estética' },
  { chave: 'prioridade', rotulo: 'Prioridade' },
  { chave: 'nivelConhecimento', rotulo: 'Nível de conhecimento' },
];

const ROTULOS_VALOR: Record<string, string> = {
  jogos: 'Jogos',
  estudo_trabalho: 'Estudo e trabalho',
  edicao: 'Edição de vídeo e imagem',
  programacao: 'Programação',
  nada: 'Nada',
  so_monitor: 'Só o monitor',
  monitor_teclado_mouse: 'Monitor, teclado e mouse',
  intel: 'Intel',
  amd: 'AMD',
  tanto_faz: 'Tanto faz',
  rgb: 'Quero RGB',
  discreto: 'Prefiro discreto',
  desempenho_agora: 'Desempenho agora',
  margem_upgrade: 'Margem para upgrade',
  iniciante: 'Sou iniciante',
  intermediario: 'Já entendo o básico',
};

function rotuloDoValor(valor: string | number): string {
  if (typeof valor === 'number') {
    return formatarReais(valor);
  }
  return ROTULOS_VALOR[valor] ?? valor;
}

export function ResumoPerfil({ perfil, onRecomecar }: ResumoPerfilProps) {
  return (
    <section className="resumo-perfil" aria-label="Resumo do perfil">
      <h2>Triagem concluída</h2>
      <dl>
        {CAMPOS.map(({ chave, rotulo }) => (
          <div key={chave} className="resumo-perfil-item">
            <dt>{rotulo}</dt>
            <dd>{rotuloDoValor(perfil[chave] as string | number)}</dd>
          </div>
        ))}
      </dl>
      <p className="resumo-perfil-aviso">
        A próxima etapa — montar a configuração com preços e cupons — ainda está em construção.
      </p>
      <button type="button" className="botao-recomecar" onClick={onRecomecar}>
        Começar uma nova triagem
      </button>
    </section>
  );
}
