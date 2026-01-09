# Narrative Alpha

AI-powered investment research dashboard built with Next.js 14, TypeScript, and Google Gemini.

## Features

- **Autonomous Research Agent**: Multi-stage AI workflow for deep stock analysis
- **Real-time Market Data**: Integration with Tencent Finance API for US stocks
- **Web Search Integration**: Tavily/Serper API for comprehensive research
- **Multi-Model Support**: Automatic model selection (Gemini for US, DeepSeek/Qwen for CN/HK)
- **Live Research Terminal**: Real-time logging of AI research process
- **Comprehensive Dashboard**: Competitor analysis, financial red flags, narrative arc

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn/UI
- **AI Engine**: Google Generative AI SDK, OpenAI SDK (for DeepSeek/Qwen)
- **Data Sources**: Tencent Finance API, Tavily/Serper Search API
- **State Management**: React Context, Server Actions

## Getting Started

### Prerequisites

- Node.js 18.17 or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Max10086/SmartStockAgent.git
cd SmartStockAgent
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your API keys:
- `GOOGLE_API_KEY` - For US stocks (required)
- `DEEPSEEK_API_KEY` or `QWEN_API_KEY` - For CN/HK stocks (optional)
- `TAVILY_API_KEY` or `SERPER_API_KEY` - For web search (required)
- `SEARCH_PROVIDER` - Set to "tavily" or "serper" (default: tavily)

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
SmartStockAgent/
├── app/
│   ├── actions/          # Server Actions for research workflow
│   ├── api/              # API routes
│   ├── report/           # Report page with dynamic routes
│   └── page.tsx          # Home page
├── components/           # React components
│   ├── ui/               # Shadcn UI components
│   └── ...               # Custom components
├── lib/
│   ├── ai/               # AI model router and generator
│   ├── market-data/      # Market data adapters
│   ├── research/         # Research types and schemas
│   └── tools/            # External tool integrations
└── ...
```

## Usage

1. Enter a stock ticker (e.g., AAPL, TSLA, FCX) on the home page
2. Click "Research" to start the analysis
3. Watch the live terminal for real-time research progress
4. View the comprehensive report with competitor analysis and financial insights

## Research Workflow

The system follows a 3-stage autonomous research process:

1. **Strategist**: Identifies sector, peer group, and generates research missions
2. **Investigator**: Executes parallel searches for each mission
3. **Analyst**: Synthesizes all data into comprehensive investment report

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

