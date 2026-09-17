export function formatCurrency(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const rounded = Math.round(safe * 100) / 100;
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: rounded % 1 === 0 ? 0 : 2,
    minimumFractionDigits: 0,
  }).format(Math.abs(rounded));
  return `${rounded < 0 ? '-' : ''}₹${formatted}`;
}

export function formatSignedCurrency(amount: number): string {
  const sign = amount > 0 ? '+' : '';
  return `${sign}${formatCurrency(amount)}`;
}
