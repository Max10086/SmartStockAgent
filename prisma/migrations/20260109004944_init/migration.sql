-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticker" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "summary" TEXT,
    "narrativeArc" TEXT,
    "marginalChanges" TEXT,
    "verdict" TEXT,
    "financialReality" TEXT,
    "competitorMatrix" TEXT,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TopicChain" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "topic" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "reportId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TopicChain_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResearchNode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chainId" TEXT NOT NULL,
    "stepName" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "questions" TEXT NOT NULL,
    "findings" TEXT NOT NULL,
    "reasoning" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "rawSearchResults" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResearchNode_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "TopicChain" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Report_ticker_idx" ON "Report"("ticker");

-- CreateIndex
CREATE INDEX "Report_createdAt_idx" ON "Report"("createdAt");

-- CreateIndex
CREATE INDEX "TopicChain_reportId_idx" ON "TopicChain"("reportId");

-- CreateIndex
CREATE INDEX "ResearchNode_chainId_idx" ON "ResearchNode"("chainId");

-- CreateIndex
CREATE INDEX "ResearchNode_orderIndex_idx" ON "ResearchNode"("orderIndex");
