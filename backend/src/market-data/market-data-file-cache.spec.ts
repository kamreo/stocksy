import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MarketDataFileCache } from './market-data-file-cache.js';
import type { CachedBitcoinMarketData } from './market-data.types.js';

describe('MarketDataFileCache', () => {
  let directory: string;
  let cache: MarketDataFileCache;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'stocksy-market-data-'));
    cache = new MarketDataFileCache(join(directory, 'bitcoin-quote.json'));
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('writes and reads the hourly candle data as JSON', async () => {
    const value: CachedBitcoinMarketData = {
      quote: {
        symbol: 'BTC',
        quoteCurrency: 'USDT',
        price: '105.00',
        provider: 'Binance Spot',
        fetchedAt: '2026-11-08T16:00:00.000Z',
      },
      candles: [
        {
          openTime: '2026-11-08T15:00:00.000Z',
          closeTime: '2026-11-08T15:59:59.999Z',
          open: '100.00',
          high: '110.00',
          low: '90.00',
          close: '105.00',
          volume: '1.25',
        },
      ],
      fetchedAt: '2026-11-08T16:00:00.000Z',
      latestAttemptAt: '2026-11-08T16:00:00.000Z',
      nextRefreshAt: '2026-11-09T16:00:00.000Z',
      lastError: null,
    };

    await cache.write(value);

    expect(await cache.read()).toEqual(value);
    expect(
      JSON.parse(await readFile(join(directory, 'bitcoin-quote.json'), 'utf8')),
    ).toEqual(value);
  });

  it('migrates the previous single-quote JSON format', async () => {
    const legacyValue = {
      quote: {
        symbol: 'BTC',
        quoteCurrency: 'USDT',
        price: '75977.64000000',
        provider: 'Binance Spot',
        fetchedAt: '2026-11-07T10:47:07.827Z',
      },
      latestAttemptAt: '2026-11-07T10:47:07.321Z',
      nextRefreshAt: '2026-11-08T10:47:07.828Z',
      lastError: null,
    };
    await writeFile(
      join(directory, 'bitcoin-quote.json'),
      JSON.stringify(legacyValue),
      'utf8',
    );

    await expect(cache.read()).resolves.toEqual({
      quote: legacyValue.quote,
      candles: [],
      fetchedAt: legacyValue.quote.fetchedAt,
      latestAttemptAt: legacyValue.latestAttemptAt,
      nextRefreshAt: legacyValue.nextRefreshAt,
      lastError: null,
    });
  });
});
