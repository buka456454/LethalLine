export function formatRubFromMinor(minor: number) {
  return `${(minor / 100).toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₽`;
}
