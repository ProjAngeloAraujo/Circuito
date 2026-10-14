import { useId, useState } from 'react';
import type { FormEvent } from 'react';

interface CampoOrcamentoProps {
  desabilitado: boolean;
  onEnviar: (valor: string) => void;
}

const TAMANHO_MAXIMO_RESPOSTA = 200;

export function CampoOrcamento({ desabilitado, onEnviar }: CampoOrcamentoProps) {
  const [valor, setValor] = useState('');
  const idCampo = useId();
  const idDica = useId();

  function aoSubmeter(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const texto = valor.trim();
    if (!texto || desabilitado) {
      return;
    }
    onEnviar(texto);
    setValor('');
  }

  return (
    <form className="campo-orcamento" onSubmit={aoSubmeter}>
      <label htmlFor={idCampo}>Qual é o seu orçamento?</label>
      <div className="campo-orcamento-linha">
        <input
          id={idCampo}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="Ex.: 5000 ou R$ 5.000,00"
          maxLength={TAMANHO_MAXIMO_RESPOSTA}
          value={valor}
          disabled={desabilitado}
          aria-describedby={idDica}
          onChange={(evento) => setValor(evento.target.value)}
        />
        <button type="submit" disabled={desabilitado || valor.trim().length === 0}>
          Enviar
        </button>
      </div>
      <span id={idDica} className="campo-orcamento-dica">
        Entre R$ 1.500 e R$ 100.000. Formatos aceitos: 5000, 5.000 ou R$ 5.000,00.
      </span>
    </form>
  );
}
