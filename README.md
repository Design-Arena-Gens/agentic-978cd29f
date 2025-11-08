## Agentic Investment Copilot

AI-native stock trading workspace that fuses technical analytics, sentiment intelligence, and multi-strategy backtesting into a single operator-grade dashboard.

### Quick Start

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to explore the advisor. Use the ticker, lookback, capital, and risk controls to tailor insights to your workflow.

### Key Capabilities

- **Technical Intelligence** — price diagnostics with annualized returns, volatility, Sharpe, VaR, and system beta.
- **Strategy Backtests** — momentum crossover, RSI mean reversion, and volatility breakout simulations with trade logs.
- **Sentiment Fusion** — curated catalyst feed with scoring, tone breakdown, and actionable narratives.
- **Capital Planning** — interactive risk tolerance slider projecting exposure, upside, and stress scenarios.
- **Trade Toolkit** — pre-baked target/stop map plus scenario analysis across momentum, neutral, and stress regimes.

### Stack

- [Next.js App Router](https://nextjs.org/) + TypeScript
- Tailwind CSS v4 design system
- Recharts for adaptive data visualizations
- Deterministic synthetic market engine for offline-ready analytics

### Deployment

```bash
npm run build
npm start
```

Deploy to Vercel via `vercel deploy --prod` with the configured project name.
