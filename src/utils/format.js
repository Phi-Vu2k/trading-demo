export function toNumber(value, fallback = 0) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

export function formatPrice(value, digits = 2, empty = '—') {
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return empty;
  return n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatFixed(value, digits = 2, empty = '—') {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n.toFixed(digits) : empty;
}

export function formatSigned(value, digits = 2, prefix = '') {
  const n = toNumber(value);
  return `${n >= 0 ? '+' : ''}${prefix}${n.toFixed(digits)}`;
}

export function formatCurrency(value, digits = 2, symbol = '$', empty = '—') {
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return empty;
  return `${symbol}${n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

export function formatPercent(value, digits = 2, signed = true) {
  const n = toNumber(value);
  return `${signed && n >= 0 ? '+' : ''}${n.toFixed(digits)}%`;
}

export function formatCompactVolume(value, empty = '—') {
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return empty;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toFixed(2);
}

export function formatAmount(value, digits = 6, empty = '—') {
  return formatFixed(value, digits, empty);
}

export function formatInteger(value, empty = '—') {
  const n = parseFloat(value);
  return Number.isFinite(n) ? Math.trunc(n).toLocaleString() : empty;
}
