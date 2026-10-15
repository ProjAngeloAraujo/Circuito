/** Cache simples em memória com validade. Será trocado por Redis em uma fase futura. */
export class CacheTtl<T> {
  private readonly itens = new Map<string, { expiraEm: number; valor: T }>();

  constructor(private readonly ttlMs: number) {}

  get(chave: string): T | undefined {
    const item = this.itens.get(chave);
    if (!item) return undefined;
    if (item.expiraEm < Date.now()) {
      this.itens.delete(chave);
      return undefined;
    }
    return item.valor;
  }

  set(chave: string, valor: T): void {
    this.itens.set(chave, { expiraEm: Date.now() + this.ttlMs, valor });
  }
}
