export type NewsSentiment = {
  id: string;
  symbol: string;
  headline: string;
  summary: string;
  source: string;
  score: number; // -1 (bearish) to 1 (bullish)
  relevance: number; // 0-1
  date: string;
};

const today = new Date();

const daysAgo = (amount: number) => {
  const date = new Date(today);
  date.setDate(date.getDate() - amount);
  return date.toISOString().split("T")[0];
};

export const newsSentiment: NewsSentiment[] = [
  {
    id: "aapl-1",
    symbol: "AAPL",
    headline: "Apple advances AI-on-device roadmap with new neural cores",
    summary:
      "Upcoming hardware updates highlight investments in on-device inference, boosting expectations for refresh cycle demand.",
    source: "TechWire",
    score: 0.72,
    relevance: 0.88,
    date: daysAgo(1),
  },
  {
    id: "aapl-2",
    symbol: "AAPL",
    headline: "Regulators question App Store pricing practices in EU probe",
    summary:
      "European regulators reopened discussions on platform fees, creating headline risk but limited near-term financial impact.",
    source: "GlobalMarkets",
    score: -0.34,
    relevance: 0.42,
    date: daysAgo(3),
  },
  {
    id: "msft-1",
    symbol: "MSFT",
    headline: "Microsoft expands Azure OpenAI availability to enterprise suite",
    summary:
      "Broader access to AI services positions Microsoft to capture incremental cloud workloads with resilient margins.",
    source: "CloudDaily",
    score: 0.61,
    relevance: 0.76,
    date: daysAgo(2),
  },
  {
    id: "nvda-1",
    symbol: "NVDA",
    headline: "NVIDIA reports record data center backlog and new Blackwell demand",
    summary:
      "Stronger-than-expected demand from hyperscalers drives guidance revision, extending visibility into 2026.",
    source: "SemiTrends",
    score: 0.82,
    relevance: 0.93,
    date: daysAgo(1),
  },
  {
    id: "nvda-2",
    symbol: "NVDA",
    headline: "Competition intensifies as custom silicon gains traction",
    summary:
      "Cloud providers continue exploring custom AI accelerators, but execution risk remains elevated for challengers.",
    source: "AI Week",
    score: -0.18,
    relevance: 0.58,
    date: daysAgo(4),
  },
  {
    id: "tsla-1",
    symbol: "TSLA",
    headline: "Tesla announces subscription model for autonomous features",
    summary:
      "Software-first monetization shift diversifies revenue streams but requires regulatory clarity for rollout.",
    source: "EV Pulse",
    score: 0.37,
    relevance: 0.71,
    date: daysAgo(1),
  },
  {
    id: "tsla-2",
    symbol: "TSLA",
    headline: "Battery suppliers flag constraints for next-gen platform",
    summary:
      "Supply chain bottlenecks could delay production ramp, pressuring near-term gross margins.",
    source: "EnergyGrid",
    score: -0.52,
    relevance: 0.64,
    date: daysAgo(5),
  },
  {
    id: "amzn-1",
    symbol: "AMZN",
    headline: "AWS unveils AI-native developer tooling suite",
    summary:
      "New services strengthen AWS moat and cross-sell opportunities across enterprise workloads.",
    source: "CloudDaily",
    score: 0.55,
    relevance: 0.69,
    date: daysAgo(2),
  },
  {
    id: "jpm-1",
    symbol: "JPM",
    headline: "JPMorgan beats earnings on net interest income resilience",
    summary:
      "Higher for longer rate narrative supports credit expansion, though provisions inch higher.",
    source: "FinanceBeat",
    score: 0.41,
    relevance: 0.65,
    date: daysAgo(1),
  },
];

