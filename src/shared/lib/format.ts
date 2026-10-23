const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

/**
 * Entrada de dinheiro do jeito brasileiro: "186,50", "1.234,5", "R$ 54".
 * Vazio → null. Texto inválido → NaN (quem chama decide a mensagem).
 */
export function parseMoney(input: string): number | null {
  const cleaned = input.replace(/[R$\s]/g, '');
  if (cleaned === '') return null;
  const normalized = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned;
  return /^\d+(\.\d{1,2})?$/.test(normalized) ? Number(normalized) : Number.NaN;
}

/** Valor → texto editável no campo ("186,5" → "186,50"). */
export function moneyToInput(value: number | null): string {
  return value === null ? '' : value.toFixed(2).replace('.', ',');
}

/** "2026-10-23" →"23 de out. de 2026". Meio-dia evita pular de dia por fuso. */
export function formatDate(isoDate: string): string {
  return dateFormatter.format(new Date(`${isoDate.slice(0, 10)}T12:00:00`));
}

/** Data local de hoje no formato YYYY-MM-DD (o tipo `date` do Postgres). */
export function todayIsoDate(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
