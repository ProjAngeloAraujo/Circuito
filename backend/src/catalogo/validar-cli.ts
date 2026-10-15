import { carregarCatalogo } from './catalogo.loader';

const { pecas, erros } = carregarCatalogo();

const porCategoria: Record<string, number> = {};
const porStatus: Record<string, number> = {};
for (const peca of pecas) {
  porCategoria[peca.categoria] = (porCategoria[peca.categoria] ?? 0) + 1;
  porStatus[peca.status] = (porStatus[peca.status] ?? 0) + 1;
}

console.log(`Catálogo: ${pecas.length} peça(s)`);
console.log('Por categoria:', porCategoria);
console.log('Por status:', porStatus);

if (erros.length > 0) {
  console.error(`\n${erros.length} problema(s) encontrado(s):`);
  for (const erro of erros) console.error(`- ${erro}`);
  process.exit(1);
}
console.log('Nenhum problema encontrado.');
