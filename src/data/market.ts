export type Candle = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type MarketSeries = {
  symbol: string;
  name: string;
  sector: string;
  beta: number;
  historical: Candle[];
};

type SeriesConfig = {
  name: string;
  sector: string;
  beta: number;
  basePrice: number;
  volatility: number;
};

const seriesConfig: Record<string, SeriesConfig> = {
  AAPL: {
    name: "Apple Inc.",
    sector: "Technology",
    beta: 1.18,
    basePrice: 187,
    volatility: 0.018,
  },
  MSFT: {
    name: "Microsoft Corporation",
    sector: "Technology",
    beta: 1.05,
    basePrice: 410,
    volatility: 0.015,
  },
  NVDA: {
    name: "NVIDIA Corporation",
    sector: "Semiconductors",
    beta: 1.42,
    basePrice: 880,
    volatility: 0.022,
  },
  TSLA: {
    name: "Tesla Inc.",
    sector: "Consumer Discretionary",
    beta: 1.92,
    basePrice: 198,
    volatility: 0.032,
  },
  AMZN: {
    name: "Amazon.com Inc.",
    sector: "Consumer Discretionary",
    beta: 1.26,
    basePrice: 178,
    volatility: 0.02,
  },
  JPM: {
    name: "JPMorgan Chase & Co.",
    sector: "Financials",
    beta: 1.09,
    basePrice: 204,
    volatility: 0.012,
  },
};

const mulberry32 = (seed: number) => {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const stringToSeed = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const generateHistoricalSeries = (
  symbol: string,
  config: SeriesConfig,
  days = 390
): Candle[] => {
  const rng = mulberry32(stringToSeed(symbol) + days);
  const today = new Date();
  const series: Candle[] = [];
  let previousClose = config.basePrice;

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);

    // skip weekends to mimic trading calendar
    if (date.getDay() === 0 || date.getDay() === 6) {
      continue;
    }

    const drift = (rng() - 0.48) * config.volatility * 1.6;
    const gap = (rng() - 0.5) * config.volatility;
    const close = Math.max(5, previousClose * (1 + drift));
    const open = Math.max(5, previousClose * (1 + gap));
    const high = Math.max(open, close) * (1 + rng() * config.volatility * 0.9);
    const low =
      Math.min(open, close) * (1 - rng() * config.volatility * 0.9 * 0.8);
    const volume =
      Math.round(800_000 + rng() * 1_200_000) * (1 + config.volatility * 4);

    previousClose = close;
    series.push({
      date: date.toISOString().split("T")[0],
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: Number(volume.toFixed(0)),
    });
  }

  return series;
};

export const marketSeries: MarketSeries[] = Object.entries(seriesConfig).map(
  ([symbol, config]) => ({
    symbol,
    name: config.name,
    sector: config.sector,
    beta: config.beta,
    historical: generateHistoricalSeries(symbol, config),
  })
);

export const symbols = marketSeries.map((series) => series.symbol);

export const getSeriesBySymbol = (symbol: string) =>
  marketSeries.find((series) => series.symbol === symbol);

