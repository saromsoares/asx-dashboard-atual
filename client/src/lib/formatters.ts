/**
 * Formatação de moedas e números — fonte única de verdade.
 * Importar daqui em vez de redefinir em cada componente.
 */

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Format as USD: $1,234.56 */
export function formatUSD(value: number): string {
  return usdFormatter.format(value);
}

/** Format as BRL: R$ 1.234,56 */
export function formatBRL(value: number): string {
  return brlFormatter.format(value);
}

/** Format number with 2 decimal places: 1.234,56 */
export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/** Format percentage: 45,2% */
export function formatPercent(value: number): string {
  return `${percentFormatter.format(value)}%`;
}
