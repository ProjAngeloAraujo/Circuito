import type { OpcaoPergunta } from '../types';

interface RespostasRapidasProps {
  opcoes: OpcaoPergunta[];
  desabilitado: boolean;
  onEscolher: (valor: string) => void;
}

export function RespostasRapidas({ opcoes, desabilitado, onEscolher }: RespostasRapidasProps) {
  return (
    <div className="respostas-rapidas" role="group" aria-label="Opções de resposta">
      {opcoes.map((opcao) => (
        <button
          key={opcao.valor}
          type="button"
          className="botao-resposta-rapida"
          disabled={desabilitado}
          onClick={() => onEscolher(opcao.rotulo)}
        >
          {opcao.rotulo}
        </button>
      ))}
    </div>
  );
}
