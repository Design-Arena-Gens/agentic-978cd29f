import { getSeriesBySymbol, marketSeries, type Candle } from "@/data/market";
import { newsSentiment } from "@/data/sentiment";

export type StrategyId = "momentum" | "meanReversion" | "breakout";

export type Trade = {
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  returnPct: number;
  holdingDays: number;
};

export type StrategyEvaluation = {
  id: StrategyId;
  name: string;
  description: string;
  trades: Trade[];
  totalReturnPct: number;
  cagr: number;
  maxDrawdown: number;
  winRate: number;
  recommendation: string;
  confidence: number;
  riskLabel: "Conservative" | "Balanced" | "Aggressive";
};

export type RiskMetrics = {
  annualReturn: number;
  annualVolatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  valueAtRisk: number;
  beta: number;
};

export type SentimentSummary = {
  score: number;
  label: "Bullish" | "Neutral" | "Bearish";
  catalyst: string;
  positive: number;
  negative: number;
  items: typeof newsSentiment;
};

export type AdvisorSnapshot = {
  candles: Candle[];
  metrics: RiskMetrics & {
    averageDailyReturn: number;
    bestDay: number;
    worstDay: number;
  };
  sentiment: SentimentSummary;
  strategies: StrategyEvaluation[];
  recommendations: string[];
};

const TRADING_DAYS = 252;
const RISK_FREE_RATE = 0.02;

const toDailyReturns = (candles: Candle[]) => {
  const returns: number[] = [];
  for (let i = 1; i < candles.length; i += 1) {
    const prev = candles[i - 1];
    const current = candles[i];
    if (!prev || !current) continue;
    returns.push(current.close / prev.close - 1);
  }
  return returns;
};

const mean = (values: number[]) => {
  if (!values.length) return 0;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
};

const standardDeviation = (values: number[]) => {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance =
    values.reduce((acc, value) => acc + (value - avg) ** 2, 0) /
    (values.length - 1);
  return Math.sqrt(variance);
};

const calculateMaxDrawdown = (candles: Candle[]) => {
  if (!candles.length) return 0;
  let peak = candles[0].close;
  let maxDrawdown = 0;
  candles.forEach((candle) => {
    peak = Math.max(peak, candle.close);
    const drawdown = (peak - candle.close) / peak;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  });
  return maxDrawdown;
};

const calculateValueAtRisk = (returns: number[], confidence = 0.95) => {
  if (!returns.length) return 0;
  const sorted = [...returns].sort((a, b) => a - b);
  const index = Math.floor((1 - confidence) * sorted.length);
  return Math.abs(sorted[index] ?? 0);
};

const calculateRSI = (values: number[], period = 14) => {
  const rsi: number[] = [];
  let gains = 0;
  let losses = 0;
  for (let i = 1; i < values.length; i += 1) {
    const change = values[i] - values[i - 1];
    if (i <= period) {
      if (change >= 0) gains += change;
      else losses -= change;
      rsi.push(50);
      continue;
    }
    const avgGain = (gains * (period - 1) + Math.max(change, 0)) / period;
    const avgLoss = (losses * (period - 1) + Math.max(-change, 0)) / period;
    gains = avgGain;
    losses = avgLoss;
    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - 100 / (1 + rs));
    }
  }
  // pad beginning to align indexes
  while (rsi.length < values.length) {
    rsi.unshift(50);
  }
  return rsi;
};

const calculateSMA = (values: number[], period: number) => {
  const sma: number[] = [];
  for (let i = 0; i < values.length; i += 1) {
    if (i + 1 < period) {
      sma.push(values[i]);
      continue;
    }
    const window = values.slice(i - period + 1, i + 1);
    sma.push(mean(window));
  }
  return sma;
};

const highestHigh = (candles: Candle[], period: number, index: number) => {
  const start = Math.max(0, index - period + 1);
  let high = -Infinity;
  for (let i = start; i <= index; i += 1) {
    high = Math.max(high, candles[i].high);
  }
  return high;
};

type StrategyConfig = {
  id: StrategyId;
  name: string;
  description: string;
  riskLabel: StrategyEvaluation["riskLabel"];
};

const strategies: StrategyConfig[] = [
  {
    id: "momentum",
    name: "Momentum Crossover",
    description:
      "Tracks 10/40 day momentum crossovers to follow primary trend strength.",
    riskLabel: "Balanced",
  },
  {
    id: "meanReversion",
    name: "RSI Mean Reversion",
    description:
      "Seeks oversold opportunities when relative strength dips below 40.",
    riskLabel: "Conservative",
  },
  {
    id: "breakout",
    name: "Volatility Breakout",
    description:
      "Targets 20-day closing breakouts with disciplined trailing exits.",
    riskLabel: "Aggressive",
  },
];

const runStrategySimulation = (
  config: StrategyConfig,
  candles: Candle[],
  capital: number
): StrategyEvaluation => {
  if (candles.length < 30) {
    return {
      id: config.id,
      name: config.name,
      description: config.description,
      trades: [],
      totalReturnPct: 0,
      cagr: 0,
      maxDrawdown: 0,
      winRate: 0,
      recommendation: "Insufficient data to evaluate strategy.",
      confidence: 0.2,
      riskLabel: config.riskLabel,
    };
  }

  const closes = candles.map((candle) => candle.close);
  const sma10 = calculateSMA(closes, 10);
  const sma40 = calculateSMA(closes, 40);
  const rsi = calculateRSI(closes, 14);

  const trades: Trade[] = [];
  let equity = capital;
  let positionEntryIndex: number | null = null;
  let positionEntryPrice = 0;
  const equityCurve: number[] = [capital];

  const executeExit = (exitIndex: number) => {
    if (positionEntryIndex === null) return;
    const entryPrice = positionEntryPrice;
    const exitPrice = candles[exitIndex].close;
    const returnPct = exitPrice / entryPrice - 1;
    equity *= 1 + returnPct;

    trades.push({
      entryDate: candles[positionEntryIndex].date,
      exitDate: candles[exitIndex].date,
      entryPrice: Number(entryPrice.toFixed(2)),
      exitPrice: Number(exitPrice.toFixed(2)),
      returnPct: Number((returnPct * 100).toFixed(2)),
      holdingDays: exitIndex - positionEntryIndex + 1,
    });

    positionEntryIndex = null;
    positionEntryPrice = 0;
  };

  for (let i = 1; i < candles.length; i += 1) {
    const candle = candles[i];
    equityCurve.push(equity);
    switch (config.id) {
      case "momentum": {
        const crossoverUp =
          sma10[i - 1] <= sma40[i - 1] && sma10[i] > sma40[i];
        const crossoverDown =
          sma10[i - 1] >= sma40[i - 1] && sma10[i] < sma40[i];
        if (positionEntryIndex === null && crossoverUp) {
          positionEntryIndex = i;
          positionEntryPrice = candle.close;
        } else if (positionEntryIndex !== null && crossoverDown) {
          executeExit(i);
        }
        break;
      }
      case "meanReversion": {
        if (positionEntryIndex === null && rsi[i] < 40) {
          positionEntryIndex = i;
          positionEntryPrice = candle.close;
        } else if (positionEntryIndex !== null && rsi[i] > 55) {
          executeExit(i);
        }
        break;
      }
      case "breakout": {
        const breakout = candle.close > highestHigh(candles, 20, i - 1);
        const breakdown = candle.close < sma10[i];
        if (positionEntryIndex === null && breakout) {
          positionEntryIndex = i;
          positionEntryPrice = candle.close;
        } else if (positionEntryIndex !== null && breakdown) {
          executeExit(i);
        }
        break;
      }
      default:
        break;
    }
  }

  if (positionEntryIndex !== null) {
    executeExit(candles.length - 1);
  }

  const totalReturnPct = ((equity / capital - 1) * 100 || 0) as number;
  const holdingPeriodYears = Math.max(
    1 / TRADING_DAYS,
    candles.length / TRADING_DAYS
  );
  const cagr = (Math.pow(equity / capital, 1 / holdingPeriodYears) - 1) * 100;
  const wins = trades.filter((trade) => trade.returnPct > 0).length;
  const winRate = trades.length ? (wins / trades.length) * 100 : 0;
  const maxDrawdown = calculateMaxDrawdown(
    equityCurve.map((value, index) => ({
      date: candles[index]?.date ?? candles[0].date,
      open: 0,
      high: value,
      low: value,
      close: value,
      volume: 0,
    }))
  );

  const recommendation =
    totalReturnPct > 12
      ? "Outperformed buy-and-hold over the period with attractive risk-adjusted returns."
      : totalReturnPct > 0
      ? "Moderately profitable, best paired with tight risk controls and diversification."
      : "Underperformed benchmark, deploy cautiously or wait for stronger signal confirmation.";

  const confidence =
    trades.length >= 6 ? 0.82 : trades.length >= 3 ? 0.64 : 0.42;

  return {
    id: config.id,
    name: config.name,
    description: config.description,
    trades,
    totalReturnPct: Number(totalReturnPct.toFixed(2)),
    cagr: Number(cagr.toFixed(2)),
    maxDrawdown: Number((maxDrawdown * 100).toFixed(2)),
    winRate: Number(winRate.toFixed(2)),
    recommendation,
    confidence: Number(confidence.toFixed(2)),
    riskLabel: config.riskLabel,
  };
};

export const getAdvisorSnapshot = (
  symbol: string,
  options?: { lookbackDays?: number; capital?: number }
): AdvisorSnapshot => {
  const { lookbackDays = 180, capital = 25_000 } = options ?? {};
  const meta = getSeriesBySymbol(symbol) ?? marketSeries[0];
  const candles = meta.historical.slice(-lookbackDays);
  const returns = toDailyReturns(candles);
  const avgDaily = mean(returns);
  const annualReturn = Math.pow(1 + avgDaily, TRADING_DAYS) - 1;
  const annualVolatility = standardDeviation(returns) * Math.sqrt(TRADING_DAYS);
  const sharpe =
    annualVolatility === 0
      ? 0
      : (annualReturn - RISK_FREE_RATE) / annualVolatility;
  const maxDrawdown = calculateMaxDrawdown(candles);
  const valueAtRisk = calculateValueAtRisk(returns);

  const sentimentItems = newsSentiment.filter(
    (item) => item.symbol === meta.symbol
  );
  const sentimentScore = mean(sentimentItems.map((item) => item.score));
  const sentimentLabel =
    sentimentScore > 0.25
      ? "Bullish"
      : sentimentScore < -0.25
      ? "Bearish"
      : "Neutral";

  const catalyst =
    sentimentItems.find((item) => item.score > 0.5)?.headline ??
    sentimentItems.find((item) => item.score < -0.5)?.headline ??
    "No high conviction catalyst detected.";

  const strategyEvaluations = strategies.map((config) =>
    runStrategySimulation(config, candles, capital)
  );

  const recommendations: string[] = [];
  if (sentimentLabel === "Bullish" && annualReturn > 0) {
    recommendations.push(
      `Bias positioning slightly overweight relative benchmark given ${(
        sentimentScore * 100
      ).toFixed(0)}% positive news skew.`
    );
  } else if (sentimentLabel === "Bearish") {
    recommendations.push(
      "Elevate hedging and tighten stops; consider reducing gross exposure by 15-20% until news tone improves."
    );
  }
  if (annualVolatility > 0.35) {
    recommendations.push(
      "Volatility exceeds 35% annualized — layer in staggered entries or use option spreads to cap downside."
    );
  }
  const bestStrategy = [...strategyEvaluations].sort(
    (a, b) => b.totalReturnPct - a.totalReturnPct
  )[0];
  if (bestStrategy && bestStrategy.totalReturnPct > 0) {
    recommendations.push(
      `${bestStrategy.name} delivered ${bestStrategy.totalReturnPct}% gross return; allocate pilot capital with ${bestStrategy.riskLabel.toLowerCase()} sizing.`
    );
  }
  if (recommendations.length === 0) {
    recommendations.push(
      "Maintain neutral exposure and monitor technical signals for fresh confirmation."
    );
  }

  return {
    candles,
    metrics: {
      annualReturn,
      annualVolatility,
      sharpeRatio: sharpe,
      maxDrawdown,
      valueAtRisk,
      beta: meta.beta,
      averageDailyReturn: avgDaily,
      bestDay: Math.max(...returns, 0),
      worstDay: Math.min(...returns, 0),
    },
    sentiment: {
      score: sentimentScore,
      label: sentimentLabel,
      catalyst,
      positive: sentimentItems.filter((item) => item.score > 0).length,
      negative: sentimentItems.filter((item) => item.score < 0).length,
      items: sentimentItems,
    },
    strategies: strategyEvaluations,
    recommendations,
  };
};

export const listSymbols = () =>
  marketSeries.map((series) => ({
    symbol: series.symbol,
    name: series.name,
    sector: series.sector,
  }));

