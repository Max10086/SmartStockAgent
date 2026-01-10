/**
 * Supported languages
 */
export type Language = "en" | "cn";

/**
 * Get system prompt suffix for language-specific output
 */
export function getLanguageSystemPrompt(lang: Language): string {
  if (lang === "cn") {
    return `

**重要语言要求**:
- 你必须使用**简体中文**输出所有推理、分析和最终报告。
- 当使用搜索工具时，你可以使用英文查询以获取更好的全球数据，但必须将发现翻译回中文。
- 所有 JSON 结构中的值（如 step_name、reasoning、verdict 等）都必须是中文。
- 数字和专有名词可以保留英文，但解释必须是中文。`;
  }

  return `

**IMPORTANT LANGUAGE REQUIREMENT**:
- You must output ALL reasoning, analysis, and final reports in **English**.
- All values in JSON structures (such as step_name, reasoning, verdict, etc.) must be in English.
- Use clear, professional financial language.`;
}

/**
 * UI translations
 */
export const translations = {
  en: {
    // Home page
    title: "Narrative Alpha",
    subtitle: "AI-powered investment research dashboard",
    description: "Get deep insights into stocks with autonomous AI analysis",
    placeholder: "Enter Ticker (e.g., AAPL, NVDA, TSLA)...",
    research: "Research",
    history: "History",
    enterTicker: "Enter a stock ticker to begin AI-powered research analysis",

    // Report page
    deepResearch: "Deep Research",
    researchInProgress: "Research in progress...",
    researchComplete: "Research complete",
    hideLogicChains: "Hide Logic Chains",
    showLogicChains: "Show Logic Chains",
    narrativeArc: "Narrative Arc",
    competitorAnalysis: "Competitor Analysis",
    financialReality: "Financial Reality",
    recentChanges: "Recent Changes (Last 3 Months)",
    theVerdict: "The Verdict",
    showEvidence: "Show Evidence",
    hideEvidence: "Hide Evidence",
    showFullInvestigation: "Show Full Investigation Logic",
    hideFullInvestigation: "Hide Full Investigation",

    // Logic Chain Viewer
    investigationLogicChains: "Investigation Logic Chains",
    stepsCompleted: "steps completed",
    topics: "topics",
    facts: "facts",
    searchQueries: "Search Queries",
    evidence: "Evidence",
    deduction: "Deduction",

    // History page
    researchHistory: "Research History",
    viewAndManage: "View and manage your saved research reports",
    newResearch: "New Research",
    noReportsYet: "No Reports Yet",
    startResearch: "Start Research",
    startNewResearch: "Start a new research to save your first report",
    view: "View",
    delete: "Delete",
    page: "Page",
    of: "of",
    previous: "Previous",
    next: "Next",
    tokens: "tokens",
    topicChains: "topic chains",
    confirmDelete: "Are you sure you want to delete this report?",

    // Errors
    error: "Error",
    noTickerProvided: "No Ticker Provided",
    pleaseProvideTicker: "Please provide a ticker symbol",
    reportNotFound: "Report not found",
    backToHistory: "Back to History",

    // Status messages
    generatingChains: "Generating logical investigation chains",
    analyzing: "Analyzing",
    searching: "Searching",
    extractingFacts: "Extracting facts",
    synthesizingReport: "Synthesizing report",
    savingToDatabase: "Saving report to database...",
    identifying: "Identifying targets...",
  },
  cn: {
    // 首页
    title: "叙事阿尔法",
    subtitle: "AI 驱动的投资研究仪表盘",
    description: "通过自主 AI 分析深入洞察股票",
    placeholder: "输入股票代码（如 AAPL、NVDA、TSLA）...",
    research: "开始研究",
    history: "历史记录",
    enterTicker: "输入股票代码开始 AI 驱动的研究分析",

    // 报告页面
    deepResearch: "深度研究",
    researchInProgress: "研究进行中...",
    researchComplete: "研究完成",
    hideLogicChains: "隐藏逻辑链",
    showLogicChains: "显示逻辑链",
    narrativeArc: "市场叙事",
    competitorAnalysis: "竞争对手分析",
    financialReality: "财务现实",
    recentChanges: "近期变化（过去3个月）",
    theVerdict: "最终判决",
    showEvidence: "显示证据",
    hideEvidence: "隐藏证据",
    showFullInvestigation: "显示完整调查逻辑",
    hideFullInvestigation: "隐藏完整调查",

    // 逻辑链查看器
    investigationLogicChains: "调查逻辑链",
    stepsCompleted: "步骤已完成",
    topics: "个主题",
    facts: "个事实",
    searchQueries: "搜索查询",
    evidence: "证据",
    deduction: "推理",

    // 历史页面
    researchHistory: "研究历史",
    viewAndManage: "查看和管理您保存的研究报告",
    newResearch: "新研究",
    noReportsYet: "暂无报告",
    startResearch: "开始研究",
    startNewResearch: "开始新研究以保存您的第一份报告",
    view: "查看",
    delete: "删除",
    page: "第",
    of: "/",
    previous: "上一页",
    next: "下一页",
    tokens: "个 Token",
    topicChains: "个主题链",
    confirmDelete: "确定要删除此报告吗？",

    // 错误
    error: "错误",
    noTickerProvided: "未提供股票代码",
    pleaseProvideTicker: "请提供股票代码",
    reportNotFound: "报告未找到",
    backToHistory: "返回历史记录",

    // 状态消息
    generatingChains: "正在生成逻辑调查链",
    analyzing: "正在分析",
    searching: "正在搜索",
    extractingFacts: "正在提取事实",
    synthesizingReport: "正在综合报告",
    savingToDatabase: "正在保存报告到数据库",
    identifying: "正在识别目标...",
  },
} as const;

/**
 * Get translation for a specific key
 */
export function t(lang: Language, key: keyof typeof translations.en): string {
  return translations[lang][key] || translations.en[key];
}

/**
 * Default language
 */
export const defaultLanguage: Language = "en";

