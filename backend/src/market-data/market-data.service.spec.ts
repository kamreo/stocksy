import type { Mock } from 'vitest';
import type { MarketDataCache } from './market-data-file-cache.js';
import { MarketDataService } from './market-data.service.js';
import type { MarketDataProvider } from './market-data.provider.js';
import type { BitcoinCandle } from './market-data.types.js';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

describe('MarketDataService', () => {
  let service: MarketDataService;
  let fetchBitcoinCandles: Mock<MarketDataProvider['fetchBitcoinCandles']>;
  let writeCache: Mock<MarketDataCache['write']>;

  beforeEach(async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-08T16:00:00.000Z'));
    fetchBitcoinCandles =
      vi.fn<MarketDataProvider['fetchBitcoinCandles']>().mockResolvedValue(
        makeCandles(),
      );
    writeCache = vi.fn<MarketDataCache['write']>().mockResolvedValue(undefined);
    const provider: MarketDataProvider = { fetchBitcoinCandles };
    const cache: MarketDataCache = {
      read: vi.fn().mockResolvedValue(null),
      write: writeCache,
    };
    service = new MarketDataService(provider, cache);
  });

  afterEach(() => {
    service.onModuleDestroy();
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('loads the initial 24-hour dataset and refreshes it once per day', async () => {
    await service.onModuleInit();
    await vi.advanceTimersByTimeAsync(0);

    expect(fetchBitcoinCandles).toHaveBeenCalledTimes(1);
    expect(service.getSnapshot()).toMatchObject({
      status: 'available',
      symbol: 'BTC',
      quoteCurrency: 'USDT',
      interval: '1h',
      provider: 'Binance Spot',
      stale: false,
      candles: makeCandles(),
      quote: {
        price: '123.00',
        provider: 'Binance Spot',
        fetchedAt: '2026-11-08T16:00:00.000Z',
      },
      nextRefreshAt: '2026-11-09T16:00:00.000Z',
      lastError: null,
    });
    expect(writeCache).toHaveBeenCalledWith(
      expect.objectContaining({
        candles: makeCandles(),
        nextRefreshAt: '2026-11-09T16:00:00.000Z',
      }),
    );

    await vi.advanceTimersByTimeAsync(DAY_MS);
    expect(fetchBitcoinCandles).toHaveBeenCalledTimes(2);
  });

  it('keeps cached candles when a refresh fails', async () => {
    await service.refreshBitcoinData();
    fetchBitcoinCandles.mockRejectedValueOnce(new Error('Binance unavailable'));

    await service.refreshBitcoinData();

    expect(service.getSnapshot()).toMatchObject({
      status: 'available',
      candles: makeCandles(),
      lastError: 'Binance unavailable',
    });
  });
});

function makeCandles(): BitcoinCandle[] {
  return Array.from({ length: 24 }, (_, index) => {
    const openTime = Date.parse('2026-11-07T17:00:00.000Z') + index * HOUR_MS;
    return {
      openTime: new Date(openTime).toISOString(),
      closeTime: new Date(openTime + HOUR_MS - 1).toISOString(),
      open: '120.00',
      high: '125.00',
      low: '115.00',
      close: '123.00',
      volume: '1.50',
    };
  });
}
