"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import clsx from "clsx";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  getAdvisorSnapshot,
  listSymbols,
  type StrategyEvaluation,
} from "@/lib/analytics";
import {
  formatCurrency,
  formatPercent,
  formatPercentDirect,
  trendColor,
} from "@/lib/formatters";

const TIME_RANGES = [
  { label: "1M", days: 22 },
  { label: "3M", days: 66 },
  { label: "6M", days: 132 },
  { label: "9M", days: 198 },
  { label: "1Y", days: 252 },
];

const CAPITAL_OPTIONS = [10000, 25000, 50000, 100000, 250000];

const formatDateLabel = (isoDate: string) =>
  format(new Date(isoDate), "MMM d");

const StrategyCard = ({ strategy }: { strategy: StrategyEvaluation }) => (
  <article className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-emerald-500/5 backdrop-blur-md transition duration-300 hover:border-emerald-400/50 hover:bg-white/10 dark:border-white/5">
    <div className="flex items-start justify-between gap-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {strategy.name}
        </h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {strategy.description}
        </p>
      </div>
      <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500">
        {strategy.riskLabel}
      </span>
    </div>
    <dl className="mt-6 grid grid-cols-2 gap-4 text-sm text-slate-600 dark:text-slate-300">
      <div>
        <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-500">
          Net Return
        </dt>
        <dd className={clsx("mt-1 font-semibold", trendColor(strategy.totalReturnPct))}>
          {formatPercentDirect(strategy.totalReturnPct)}
        </dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-500">
          CAGR
        </dt>
        <dd className={clsx("mt-1 font-semibold", trendColor(strategy.cagr))}>
          {formatPercentDirect(strategy.cagr)}
        </dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-500">
          Win Rate
        </dt>
        <dd className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
          {formatPercentDirect(strategy.winRate)}
        </dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-500">
          Max Drawdown
        </dt>
        <dd className="mt-1 font-semibold text-rose-500">
          {formatPercentDirect(strategy.maxDrawdown)}
        </dd>
      </div>
    </dl>
    {strategy.trades.length > 0 ? (
      <div className="mt-6 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
          Recent Trades
        </p>
        <div className="grid gap-3">
          {strategy.trades.slice(-3).map((trade) => (
            <div
              key={`${trade.entryDate}-${trade.exitDate}`}
              className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-slate-600 dark:text-slate-300"
            >
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatDateLabel(trade.entryDate)} →{" "}
                  {formatDateLabel(trade.exitDate)}
                </p>
                <p>
                  {formatCurrency(trade.entryPrice)} →{" "}
                  {formatCurrency(trade.exitPrice)}
                </p>
              </div>
              <span className={clsx("font-semibold", trendColor(trade.returnPct))}>
                {formatPercentDirect(trade.returnPct)}
              </span>
            </div>
          ))}
        </div>
      </div>
    ) : (
      <p className="mt-6 text-xs text-slate-500">
        Signal is still forming — no entries triggered in the lookback window.
      </p>
    )}
    <p className="mt-6 text-sm text-slate-600 dark:text-slate-300">
      {strategy.recommendation} <span className="text-xs text-slate-500">Confidence {formatPercentDirect(strategy.confidence * 100, 0)}</span>
    </p>
  </article>
);

export const AdvisorPage = () => {
  const [selectedSymbol, setSelectedSymbol] = useState("AAPL");
  const [timeRange, setTimeRange] =
    useState<(typeof TIME_RANGES)[number]>(TIME_RANGES[2]);
  const [capital, setCapital] = useState(25000);
  const [riskTolerance, setRiskTolerance] = useState(55);

  const snapshot = useMemo(
    () =>
      getAdvisorSnapshot(selectedSymbol, {
        lookbackDays: timeRange.days,
        capital,
      }),
    [capital, selectedSymbol, timeRange.days]
  );

  const candles = snapshot.candles;
  const pricesChart = useMemo(
    () =>
      candles.map((candle) => ({
        date: formatDateLabel(candle.date),
        close: candle.close,
      })),
    [candles]
  );

  const latestPrice = candles[candles.length - 1]?.close ?? 0;
  const firstPrice = candles[0]?.close ?? latestPrice;
  const performance = ((latestPrice / firstPrice - 1) * 100) || 0;
  const annualReturnLabel = formatPercent(snapshot.metrics.annualReturn);
  const annualVolLabel = formatPercent(snapshot.metrics.annualVolatility);
  const sharpeLabel = snapshot.metrics.sharpeRatio.toFixed(2);

  const projectedCapital = useMemo(() => {
    const exposure = capital * (riskTolerance / 100);
    const expected = exposure * (1 + snapshot.metrics.annualReturn);
    const downside = exposure * (1 - snapshot.metrics.valueAtRisk * Math.sqrt(timeRange.days / 22));
    return {
      exposure,
      expected,
      downside,
    };
  }, [
    capital,
    riskTolerance,
    snapshot.metrics.annualReturn,
    snapshot.metrics.valueAtRisk,
    timeRange.days,
  ]);

  const allocationAdvice =
    snapshot.metrics.annualVolatility * 100 > riskTolerance + 25
      ? "Current volatility exceeds risk budget — stagger entries and cap single-position exposure at 3-4% of portfolio."
      : "Volatility profile aligns with risk appetite — scale into positions in 2-3 tranches.";

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.25),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(59,130,246,0.2),_transparent_55%)]" />
      <main className="relative mx-auto flex max-w-7xl flex-col gap-10 px-6 py-16 lg:px-12">
        <header className="grid gap-8 rounded-3xl border border-white/10 bg-white/5 p-10 shadow-2xl shadow-emerald-500/10 backdrop-blur-xl lg:grid-cols-[2fr,1fr]">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl lg:text-5xl">
              Stock Trading & Investment Copilot
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300">
              AI-native workflow that fuses technicals, sentiment, and strategy
              backtesting to surface risk-aware trade ideas in real time.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3 text-xs font-medium text-emerald-300">
              <span className="rounded-full border border-emerald-300/40 bg-emerald-500/10 px-3 py-1 tracking-wide">
                Live Technicals
              </span>
              <span className="rounded-full border border-emerald-300/40 bg-emerald-500/10 px-3 py-1 tracking-wide">
                Sentiment Fusion
              </span>
              <span className="rounded-full border border-emerald-300/40 bg-emerald-500/10 px-3 py-1 tracking-wide">
                Institutional Risk Stack
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-sm text-emerald-100">
            <p className="text-xs uppercase tracking-wide text-emerald-200/80">
              Adaptive Playbook
            </p>
            <p className="mt-3 text-lg font-semibold text-emerald-100">
              {allocationAdvice}
            </p>
            <ul className="mt-6 space-y-2 text-emerald-100/90">
              <li>• Quantified edge from algorithmic backtests</li>
              <li>• Auto-prioritized catalysts and risk events</li>
              <li>• Portfolio-aware trade sizing guidance</li>
            </ul>
          </div>
        </header>

        <section className="grid gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md lg:grid-cols-[1.8fr,1fr]">
          <div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Ticker
                </label>
                <select
                  value={selectedSymbol}
                  onChange={(event) => setSelectedSymbol(event.target.value)}
                  className="mt-1 w-36 rounded-xl border border-white/10 bg-slate-900/80 px-4 py-2 text-sm font-semibold text-slate-50 shadow-inner focus:border-emerald-400 focus:outline-none"
                >
                  {listSymbols().map((symbol) => (
                    <option
                      className="text-slate-900"
                      key={symbol.symbol}
                      value={symbol.symbol}
                    >
                      {symbol.symbol} · {symbol.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Lookback
                </label>
                <div className="mt-1 flex items-center gap-2 rounded-full border border-white/5 bg-slate-900/60 p-1">
                  {TIME_RANGES.map((range) => (
                    <button
                      key={range.label}
                      onClick={() => setTimeRange(range)}
                      className={clsx(
                        "rounded-full px-3 py-1 text-xs font-semibold transition",
                        range.label === timeRange.label
                          ? "bg-emerald-500 text-slate-900 shadow-lg shadow-emerald-500/30"
                          : "text-slate-300 hover:bg-white/10"
                      )}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Capital
                </label>
                <select
                  value={capital}
                  onChange={(event) => setCapital(Number(event.target.value))}
                  className="mt-1 w-36 rounded-xl border border-white/10 bg-slate-900/80 px-4 py-2 text-sm font-semibold text-slate-50 shadow-inner focus:border-emerald-400 focus:outline-none"
                >
                  {CAPITAL_OPTIONS.map((value) => (
                    <option className="text-slate-900" key={value} value={value}>
                      {formatCurrency(value)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-8 h-[320px] w-full rounded-3xl border border-white/5 bg-slate-900/40 p-4 shadow-inner">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={pricesChart}>
                  <defs>
                    <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.7} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                  <XAxis
                    dataKey="date"
                    stroke="#94a3b8"
                    tickLine={false}
                    style={{ fontSize: "12px" }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tickLine={false}
                    style={{ fontSize: "12px" }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.9)",
                      borderRadius: "12px",
                      border: "1px solid rgba(148,163,184,0.2)",
                    }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, "Close"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="close"
                    stroke="#34d399"
                    strokeWidth={2.4}
                    fillOpacity={1}
                    fill="url(#priceGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <aside className="flex h-full flex-col justify-between">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-sm text-emerald-100 shadow-lg shadow-emerald-500/20">
              <p className="text-xs uppercase tracking-wide text-emerald-200/80">
                Price Diagnostics
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-white">
                {formatCurrency(latestPrice)}
              </h2>
              <p className={clsx("mt-2 text-sm font-semibold", trendColor(performance))}>
                {formatPercentDirect(performance)}
              </p>
              <div className="mt-6 grid gap-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-100/70">Annual Return</span>
                  <span className="font-semibold text-emerald-100">
                    {annualReturnLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-100/70">Annual Volatility</span>
                  <span className="font-semibold text-emerald-100">
                    {annualVolLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-100/70">Sharpe Ratio</span>
                  <span className="font-semibold text-emerald-100">
                    {sharpeLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-100/70">VaR (95%)</span>
                  <span className="font-semibold text-emerald-100">
                    {formatPercent(snapshot.metrics.valueAtRisk)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-100/70">Systemic Beta</span>
                  <span className="font-semibold text-emerald-100">
                    {snapshot.metrics.beta.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Risk Tolerance
              </p>
              <div className="mt-4 flex items-center gap-3">
                <input
                  className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-slate-700 accent-emerald-400"
                  type="range"
                  min={20}
                  max={90}
                  value={riskTolerance}
                  onChange={(event) => setRiskTolerance(Number(event.target.value))}
                />
                <span className="w-12 text-right text-sm font-semibold text-slate-100">
                  {riskTolerance}
                </span>
              </div>
              <div className="mt-4 grid gap-2 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span>Active Capital</span>
                  <span>{formatCurrency(projectedCapital.exposure)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Projected Upside</span>
                  <span>{formatCurrency(projectedCapital.expected)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Stress Scenario</span>
                  <span>{formatCurrency(projectedCapital.downside)}</span>
                </div>
              </div>
              <p className="mt-4 text-xs text-slate-400">
                Allocation scales with tolerance. Stress scenario applies VaR and
                timeframe scaling to approximate downside at confidence.
              </p>
            </div>
          </aside>
        </section>

        <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur-md">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                Strategy Intelligence Stack
              </h2>
              <span className="text-xs uppercase tracking-wide text-emerald-200">
                Backtested over {timeRange.label}
              </span>
            </div>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {snapshot.strategies.map((strategy) => (
                <StrategyCard key={strategy.id} strategy={strategy} />
              ))}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
              <h2 className="text-lg font-semibold text-white">Sentiment Feed</h2>
              <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                {snapshot.sentiment.label} · Score{" "}
                {formatPercent(snapshot.sentiment.score)}
              </p>
              <p className="mt-4 text-sm text-slate-300">
                {snapshot.sentiment.catalyst}
              </p>
              <div className="mt-4 grid gap-2 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Positive Catalysts</span>
                  <span>{snapshot.sentiment.positive}</span>
                </div>
                <div className="flex justify-between">
                  <span>Negative Headlines</span>
                  <span>{snapshot.sentiment.negative}</span>
                </div>
              </div>
              <div className="mt-5 space-y-4">
                {snapshot.sentiment.items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-white/5 bg-slate-900/60 p-4"
                  >
                    <p className="text-sm font-semibold text-white">
                      {item.headline}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">{item.summary}</p>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                      <span>{item.source}</span>
                      <span className={trendColor(item.score)}>
                        {formatPercent(item.score)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-6 text-sm text-emerald-100 shadow-lg">
              <h2 className="text-lg font-semibold text-white">
                Tactical Playbook
              </h2>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-emerald-100/90">
                {snapshot.recommendations.map((item, index) => (
                  <li key={index} className="flex gap-2">
                    <span>•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Trade Simulator
              </h2>
              <p className="text-sm text-slate-400">
                Blend position sizing, target multiples, and stop levels then
                project P&L distribution instantly.
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-sm">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Entry Price
              </p>
              <p className="mt-2 text-xl font-semibold text-white">
                {formatCurrency(latestPrice)}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                Anchored to latest close — adjust manually when executing.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-sm">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Target (2.2x R:R)
              </p>
              <p className="mt-2 text-xl font-semibold text-emerald-400">
                {formatCurrency(latestPrice * 1.12)}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                Hit probability boost if momentum strategy active.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-sm">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Stop Loss (1R)
              </p>
              <p className="mt-2 text-xl font-semibold text-rose-400">
                {formatCurrency(latestPrice * 0.95)}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                Adjust to prior swing low for structural protection.
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm">
              <p className="text-xs uppercase tracking-wide text-emerald-200/80">
                Expected Value
              </p>
              <p className="mt-2 text-xl font-semibold text-emerald-300">
                {formatCurrency(projectedCapital.exposure * (performance / 100))}
              </p>
              <p className="mt-2 text-xs text-emerald-200/80">
                Calibrated against recent hit rate to frame trade sizing.
              </p>
            </div>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 text-sm">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Scenario — Momentum
              </p>
              <p className="mt-3 text-sm text-slate-300">
                If trend persists, projected payoff on allocated capital hits{" "}
                <span className="font-semibold text-emerald-300">
                  {formatCurrency(
                    projectedCapital.exposure * (snapshot.metrics.annualReturn + 0.08)
                  )}
                </span>
                . Consider trailing stops at 1.8x ATR.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 text-sm">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Scenario — Neutral
              </p>
              <p className="mt-3 text-sm text-slate-300">
                Base case yields{" "}
                <span className="font-semibold text-slate-100">
                  {formatCurrency(projectedCapital.expected)}
                </span>{" "}
                with risk {formatPercent(snapshot.metrics.valueAtRisk)}. Lean on
                covered calls to monetize sideways drift.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 text-sm">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Scenario — Stress
              </p>
              <p className="mt-3 text-sm text-slate-300">
                Shock move re-prices to{" "}
                <span className="font-semibold text-rose-400">
                  {formatCurrency(projectedCapital.downside)}
                </span>
                . Hedge via short-dated puts or reduce gross to protect equity.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdvisorPage;

