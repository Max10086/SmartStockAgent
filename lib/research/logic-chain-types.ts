/**
 * Research Node - A single logical step in an investigation chain
 */
export interface ResearchNode {
  id: string;
  step_name: string; // e.g., "Step 1: Assess Market Size"
  intent: string; // "Why are we asking this?"
  questions: string[]; // Specific queries to ask Tavily
  findings: string[]; // Raw facts found (numbers, dates, entities)
  reasoning: string; // How the facts answer the intent
  next_logic_step: string | null; // What to ask next based on this finding
}

/**
 * Topic Chain - A logical sequence of research nodes for a specific topic
 */
export interface TopicChain {
  topic: string; // e.g., "Competitive Landscape", "Financial Health", "Market Dynamics"
  chain: ResearchNode[]; // An ordered array of logical steps
}

/**
 * Complete research investigation with multiple topic chains
 */
export interface ResearchInvestigation {
  ticker: string;
  topicChains: TopicChain[];
  totalNodes: number;
  completedNodes: number;
}

/**
 * Node execution result
 */
export interface NodeExecutionResult {
  nodeId: string;
  success: boolean;
  findings: string[];
  reasoning: string;
  searchResults: Array<{
    title: string;
    content: string;
    link: string;
  }>;
  error?: string;
}

