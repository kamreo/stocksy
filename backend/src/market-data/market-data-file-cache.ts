import { Injectable } from '@nestjs/common';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type {
  BitcoinCandle,
  BitcoinQuote,
  CachedBitcoinMarketData,
} from './market-data.types.js';

export interface MarketDataCache {
  read(): Promise<CachedBitcoinMarketData | null>;
  write(value: CachedBitcoinMarketData): Promise<void>;
}

@Injectable()
export class MarketDataFileCache implements MarketDataCache {
  constructor(
    private readonly filePath = resolve(
      process.env.MARKET_DATA_CACHE_FILE ?? 'data/bitcoin-quote.json',
    ),
  ) {}

  async read(): Promise<CachedBitcoinMarketData | null> {
    let contents: string;
    try {
      contents = await readFile(this.filePath, 'utf8');
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }

    let value: unknown;
    try {
      value = JSON.parse(contents);
    } catch {
      throw new Error(`Market-data cache contains invalid JSON: ${this.filePath}`);
    }

    if (isCachedMarketData(value)) {
      return value;
    }
    if (isLegacyQuoteCache(value)) {
      return {
        quote: value.quote,
        candles: [],
        fetchedAt: value.quote?.fetchedAt ?? null,
        latestAttemptAt: value.latestAttemptAt,
        nextRefreshAt: value.nextRefreshAt,
        lastError: value.lastError,
      };
    }

    throw new Error(`Market-data cache has an invalid shape: ${this.filePath}`);
  }

  async write(value: CachedBitcoinMarketData): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.${process.pid}.tmp`;

    try {
      await writeFile(
        temporaryPath,
        `${JSON.stringify(value, null, 2)}\n`,
        'utf8',
      );
      await rename(temporaryPath, this.filePath);
    } catch (error) {
      try {
        await unlink(temporaryPath);
      } catch (cleanupError) {
        if (!(isNodeError(cleanupError) && cleanupError.code === 'ENOENT')) {
          throw new AggregateError(
            [error, cleanupError],
            'Could not write market-data cache or clean up its temporary file',
          );
        }
      }
      throw error;
    }
  }
}

interface LegacyQuoteCache {
  quote: BitcoinQuote | null;
  latestAttemptAt: string | null;
  nextRefreshAt: string | null;
  lastError: string | null;
}

function isCachedMarketData(value: unknown): value is CachedBitcoinMarketData {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (value.quote === null || isBitcoinQuote(value.quote)) &&
    Array.isArray(value.candles) &&
    value.candles.every(isBitcoinCandle) &&
    isNullableTimestamp(value.fetchedAt) &&
    isNullableTimestamp(value.latestAttemptAt) &&
    isNullableTimestamp(value.nextRefreshAt) &&
    isNullableString(value.lastError)
  );
}

function isLegacyQuoteCache(value: unknown): value is LegacyQuoteCache {
  if (!isRecord(value) || !('quote' in value)) {
    return false;
  }

  return (
    (value.quote === null || isBitcoinQuote(value.quote)) &&
    isNullableTimestamp(value.latestAttemptAt) &&
    isNullableTimestamp(value.nextRefreshAt) &&
    isNullableString(value.lastError)
  );
}

function isBitcoinCandle(value: unknown): value is BitcoinCandle {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isTimestamp(value.openTime) &&
    isTimestamp(value.closeTime) &&
    isPositiveDecimal(value.open) &&
    isPositiveDecimal(value.high) &&
    isPositiveDecimal(value.low) &&
    isPositiveDecimal(value.close) &&
    isNonNegativeDecimal(value.volume)
  );
}

function isBitcoinQuote(value: unknown): value is BitcoinQuote {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.symbol === 'BTC' &&
    value.quoteCurrency === 'USDT' &&
    isPositiveDecimal(value.price) &&
    value.provider === 'Binance Spot' &&
    isTimestamp(value.fetchedAt)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNullableTimestamp(value: unknown): value is string | null {
  return value === null || isTimestamp(value);
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isPositiveDecimal(value: unknown): value is string {
  return isNonNegativeDecimal(value) && Number(value) > 0;
}

function isNonNegativeDecimal(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value) &&
    Number.isFinite(Number(value))
  );
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
