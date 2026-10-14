import { useCallback, useEffect, useRef, useState } from 'react';
import { criarSessao, enviarResposta } from './api';
import { Carregando } from './components/Carregando';
import { Chat } from './components/Chat';
import { EstadoErro } from './components/EstadoErro';
import type { SessaoResposta } from './types';

const MENSAGEM_ERRO_CONEXAO =
  'Não foi possível conectar ao servidor. Verifique sua conexão e tente de novo.';

function App() {
  const [sessao, setSessao] = useState<SessaoResposta | null>(null);
  const [carregandoInicial, setCarregandoInicial] = useState(true);
  const [erroInicial, setErroInicial] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const ultimoTextoRef = useRef<string | null>(null);

  const iniciarSessao = useCallback(async () => {
    setCarregandoInicial(true);
    setErroInicial(null);
    try {
      const nova = await criarSessao();
      setSessao(nova);
    } catch {
      setErroInicial(MENSAGEM_ERRO_CONEXAO);
    } finally {
      setCarregandoInicial(false);
    }
  }, []);

  useEffect(() => {
    iniciarSessao();
  }, [iniciarSessao]);

  const enviar = useCallback(
    async (texto: string) => {
      if (!sessao || enviando) {
        return;
      }
      ultimoTextoRef.current = texto;
      setEnviando(true);
      setErroEnvio(null);
      try {
        const atualizada = await enviarResposta(sessao.id, texto);
        setSessao(atualizada);
      } catch {
        setErroEnvio(MENSAGEM_ERRO_CONEXAO);
      } finally {
        setEnviando(false);
      }
    },
    [sessao, enviando],
  );

  const tentarNovamente = useCallback(() => {
    if (ultimoTextoRef.current !== null) {
      enviar(ultimoTextoRef.current);
    }
  }, [enviar]);

  const recomecar = useCallback(() => {
    setSessao(null);
    setErroEnvio(null);
    ultimoTextoRef.current = null;
    iniciarSessao();
  }, [iniciarSessao]);

  return (
    <div className="pagina">
      <header className="cabecalho">
        <h1>Circuito</h1>
        <p>O assistente que leva você até a configuração certa de PC, peça por peça.</p>
      </header>

      <main className="conteudo">
        {carregandoInicial && <Carregando />}

        {!carregandoInicial && erroInicial && !sessao && (
          <EstadoErro mensagem={erroInicial} onTentarNovamente={iniciarSessao} />
        )}

        {!carregandoInicial && sessao && (
          <Chat
            sessao={sessao}
            enviando={enviando}
            erroEnvio={erroEnvio}
            onEnviar={enviar}
            onTentarNovamente={tentarNovamente}
            onRecomecar={recomecar}
          />
        )}
      </main>
    </div>
  );
}

export default App;
