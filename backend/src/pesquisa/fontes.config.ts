/**
 * Listas iniciais de domínios. Elas precisam ser revisadas pelo dono do projeto:
 * qual loja é confiável é uma decisão humana, e a IA só pesquisa dentro dela.
 * Podem ser substituídas pelas variáveis LOJAS_PERMITIDAS e FABRICANTES_PERMITIDOS.
 */
export const LOJAS_PADRAO = [
  'kabum.com.br',
  'pichau.com.br',
  'terabyteshop.com.br',
  'amazon.com.br',
  'mercadolivre.com.br',
];

export const FABRICANTES_PADRAO = [
  'amd.com',
  'intel.com',
  'nvidia.com',
  'asus.com',
  'msi.com',
  'gigabyte.com',
  'corsair.com',
  'kingston.com',
  'crucial.com',
  'samsung.com',
  'wdc.com',
  'seagate.com',
  'coolermaster.com',
  'nzxt.com',
  'thermaltake.com',
];

export function lerLista(
  valor: string | undefined,
  padrao: string[],
): string[] {
  const lista = (valor ?? '')
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  return lista.length > 0 ? lista : padrao;
}
