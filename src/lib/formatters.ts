export const formatPercent = (value: number, fractionDigits = 2) =>
  `${(value * 100).toFixed(fractionDigits)}%`;

export const formatPercentDirect = (value: number, fractionDigits = 2) =>
  `${value.toFixed(fractionDigits)}%`;

export const formatCurrency = (
  value: number,
  currency: string = "USD",
  options?: Intl.NumberFormatOptions
) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: options?.minimumFractionDigits ?? 2,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
    ...options,
  }).format(value);

export const trendColor = (value: number) =>
  value >= 0 ? "text-emerald-500" : "text-rose-500";
