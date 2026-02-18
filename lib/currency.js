function toAmount(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

const currencySymbolMap = {
  TRY: "₺",
  USD: "$",
  EUR: "€",
  AED: "AED",
};

export function formatCurrencyTrailing(value, currency = "TRY") {
  const amount = toAmount(value);
  const code = String(currency || "TRY").toUpperCase();
  const symbol = currencySymbolMap[code] || code;

  const numberPart = new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

  return `${numberPart} ${symbol}`;
}

