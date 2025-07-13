-- CreateTable
CREATE TABLE "ExtractedDataLog" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "productTitle" TEXT NOT NULL,
    "extractedData" JSONB NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtractedDataLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LLMPromptLog" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "productTitle" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "userPrompt" TEXT NOT NULL,
    "scrapedDataSection" TEXT,
    "promptLength" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LLMPromptLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExtractedDataLog_shop_createdAt_idx" ON "ExtractedDataLog"("shop", "createdAt");

-- CreateIndex
CREATE INDEX "LLMPromptLog_shop_createdAt_idx" ON "LLMPromptLog"("shop", "createdAt");