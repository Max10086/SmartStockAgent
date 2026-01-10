# Research Architecture: Logical Chain of Thought

## Overview

The research system uses a **Logical Chain of Thought** architecture instead of random questions. This creates structured, sequential investigations that build upon each other.

## Architecture

### Core Data Structures

#### `ResearchNode`
A single logical step in an investigation chain:

```typescript
{
  id: string;                    // Unique identifier
  step_name: string;             // e.g., "Step 1: Assess Market Size"
  intent: string;                // Why we're asking this
  questions: string[];           // Specific queries for Tavily
  findings: string[];            // Raw facts found (numbers, dates)
  reasoning: string;             // How facts answer the intent
  next_logic_step: string | null; // What to investigate next
}
```

#### `TopicChain`
A logical sequence of research nodes for a specific topic:

```typescript
{
  topic: string;        // e.g., "Competitive Landscape"
  chain: ResearchNode[]; // Ordered array of logical steps
}
```

#### `ResearchInvestigation`
Complete investigation with multiple topic chains:

```typescript
{
  ticker: string;
  topicChains: TopicChain[];
  totalNodes: number;
  completedNodes: number;
}
```

## Workflow

### Stage 1: Generate Topic Chains
The Strategist AI generates 5-7 major research topics, each with 3-5 sequential steps.

**Example:**
```
Topic: "Competitive Landscape"
├─ Step 1: Identify direct competitors
├─ Step 2: Compare market share and positioning
├─ Step 3: Analyze competitive advantages
└─ Step 4: Assess threat of new entrants
```

### Stage 2: Execute Topic Chains
Each chain is executed sequentially (nodes build on previous findings):

1. **Search Phase**: Execute all questions in the node using Tavily
2. **Fact Extraction**: Use AI to extract specific facts (numbers, dates, entities)
3. **Reasoning**: Generate reasoning explaining how facts answer the intent
4. **Update Node**: Store findings and reasoning in the node

### Stage 3: Synthesize Report
All findings from all chains are synthesized into a comprehensive report:

- `narrative_arc`: Market narrative with specific facts
- `competitor_matrix`: Detailed competitor analysis
- `financial_reality`: Cash burn, capex, revenue trends
- `marginal_changes`: Recent changes (last 3 months)
- `verdict`: Brutal truth based on all facts

## Usage

```typescript
import { runDeepResearchV3 } from "@/app/actions/research-v3";

const result = await runDeepResearchV3("AAPL");

// Access investigation structure
result.investigation.topicChains.forEach(chain => {
  console.log(`Topic: ${chain.topic}`);
  chain.chain.forEach(node => {
    console.log(`  ${node.step_name}: ${node.findings.length} facts`);
  });
});

// Access final report
console.log(result.report.verdict);
```

## Benefits

1. **Logical Flow**: Each step builds on previous findings
2. **Transparency**: Clear intent and reasoning for each step
3. **Fact Density**: Extracts specific facts (numbers, dates) not generic statements
4. **Structured Output**: Organized by topic with clear progression
5. **Traceability**: Can trace back from verdict to specific findings

## Example Investigation Flow

```
Topic: "Financial Health"
├─ Step 1: Assess Cash Position
│  ├─ Questions: ["AAPL cash reserves 2024", "AAPL cash burn rate"]
│  ├─ Findings: ["$150B cash reserves as of Q3 2024", "Cash burn: $2B/month"]
│  └─ Reasoning: "Strong cash position provides runway..."
│
├─ Step 2: Analyze Revenue Trends
│  ├─ Questions: ["AAPL revenue Q3 2024", "AAPL revenue growth rate"]
│  ├─ Findings: ["Revenue: $89.5B Q3 2024", "Growth: +5% YoY"]
│  └─ Reasoning: "Revenue growth slowing but still positive..."
│
└─ Step 3: Evaluate Debt Structure
   ├─ Questions: ["AAPL debt to equity ratio", "AAPL bond issuance 2024"]
   ├─ Findings: ["Debt/Equity: 1.7", "Issued $5B bonds in Q2"]
   └─ Reasoning: "Moderate leverage, manageable debt..."
```

## Migration from V2

The new `research-v3.ts` replaces the flat mission-based approach with structured chains:

- **V2**: 4 flat missions with random questions
- **V3**: 5-7 topic chains with 3-5 sequential steps each

To migrate:
1. Update imports: `runDeepResearchV3` instead of `runDeepResearch`
2. Access `investigation.topicChains` instead of `plan.missions`
3. Use `node.findings` and `node.reasoning` for detailed analysis

