import type { SessaoResposta } from './types';

const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export class ErroApi extends Error {
  status: number;

  constructor(mensagem: string, status: number) {
    super(mensagem);
    this.name = 'ErroApi';
    this.status = status;
  }
}

async function tratarResposta(resposta: Response): Promise<SessaoResposta> {
  if (!resposta.ok) {
    throw new ErroApi(`Falha na requisição (status ${resposta.status})`, resposta.status);
  }
  return (await resposta.json()) as SessaoResposta;
}

export async function criarSessao(): Promise<SessaoResposta> {
  const resposta = await fetch(`${BASE_URL}/sessoes`, { method: 'POST' });
  return tratarResposta(resposta);
}

export async function obterSessao(id: string): Promise<SessaoResposta> {
  const resposta = await fetch(`${BASE_URL}/sessoes/${id}`);
  return tratarResposta(resposta);
}

export async function enviarResposta(id: string, texto: string): Promise<SessaoResposta> {
  const resposta = await fetch(`${BASE_URL}/sessoes/${id}/mensagens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texto }),
  });
  return tratarResposta(resposta);
}
