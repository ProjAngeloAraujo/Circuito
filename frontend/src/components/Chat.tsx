import { useEffect, useRef } from 'react';
import type { SessaoResposta } from '../types';
import { BarraProgresso } from './BarraProgresso';
import { CampoOrcamento } from './CampoOrcamento';
import { EstadoErro } from './EstadoErro';
import { ListaMensagens } from './ListaMensagens';
import { ResumoPerfil } from './ResumoPerfil';
import { RespostasRapidas } from './RespostasRapidas';

interface ChatProps {
  sessao: SessaoResposta;
  enviando: boolean;
  erroEnvio: string | null;
  onEnviar: (texto: string) => void;
  onTentarNovamente: () => void;
  onRecomecar: () => void;
}

export function Chat({ sessao, enviando, erroEnvio, onEnviar, onTentarNovamente, onRecomecar }: ChatProps) {
  const { perguntaAtual, status, historico, perfil, progresso } = sessao;
  const fimRef = useRef<HTMLDivElement>(null);

  // Rola para o fim sempre que uma nova mensagem, pergunta ou o resumo aparece,
  // para que a próxima pergunta/resposta rápida fique visível sem scroll manual.
  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [historico.length, perguntaAtual?.id, status, enviando]);

  return (
    <div className="chat">
      <BarraProgresso respondidas={progresso.respondidas} total={progresso.total} />
      <ListaMensagens mensagens={historico} enviando={enviando} />

      {erroEnvio && <EstadoErro mensagem={erroEnvio} onTentarNovamente={onTentarNovamente} />}

      {status === 'em_andamento' && perguntaAtual && (
        <div className="area-resposta">
          {perguntaAtual.tipo === 'opcoes' && perguntaAtual.opcoes && (
            <RespostasRapidas
              opcoes={perguntaAtual.opcoes}
              desabilitado={enviando}
              onEscolher={onEnviar}
            />
          )}
          {perguntaAtual.tipo === 'numero' && (
            <CampoOrcamento desabilitado={enviando} onEnviar={onEnviar} />
          )}
        </div>
      )}

      {status === 'concluida' && perfil && <ResumoPerfil perfil={perfil} onRecomecar={onRecomecar} />}

      <div ref={fimRef} aria-hidden="true" />
    </div>
  );
}
