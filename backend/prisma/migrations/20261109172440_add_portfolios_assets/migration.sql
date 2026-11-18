-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('CRYPTO');

-- CreateTable
CREATE TABLE "Portfolio" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "baseCurrency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assetType" "AssetType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Portfolio_userId_idx" ON "Portfolio"("userId");

-- AddForeignKey
ALTER TABLE "Portfolio" ADD CONSTRAINT "Portfolio_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed the supported metadata catalog; prices belong to market data.
INSERT INTO "Asset" ("id", "symbol", "name", "assetType", "createdAt", "updatedAt")
VALUES
    ('crypto:bitcoin', 'BTC', 'Bitcoin', 'CRYPTO', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('crypto:ethereum', 'ETH', 'Ethereum', 'CRYPTO', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
