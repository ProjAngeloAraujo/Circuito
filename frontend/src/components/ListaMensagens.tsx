import type { MensagemChat } from '../types';

interface ListaMensagensProps {
  mensagens: MensagemChat[];
  enviando: boolean;
}

export function ListaMensagens({ mensagens, enviando }: ListaMensagensProps) {
  return (
    <div className="lista-mensagens" role="log" aria-live="polite" aria-label="Conversa com o assistente">
      {mensagens.map((mensagem, indice) => (
        <div
          key={`${mensagem.autor}-${indice}-${mensagem.criadaEm}`}
          className={`balao balao-${mensagem.autor}`}
        >
          <span className="balao-autor">{mensagem.autor === 'assistente' ? 'Circuito' : 'Você'}</span>
          <p className="balao-texto">{mensagem.texto}</p>
        </div>
      ))}
      {enviando && (
        <div className="balao balao-assistente balao-carregando" aria-hidden="true">
          <span className="balao-autor">Circuito</span>
          <p className="balao-texto">digitando…</p>
        </div>
      )}
    </div>
  );
}
