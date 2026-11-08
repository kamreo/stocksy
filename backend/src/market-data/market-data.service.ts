import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { MARKET_DATA_PROVIDER } from './market-data.provider.js';
import type { MarketDataProvider } from './market-data.provider.js';
import {
  MarketDataFileCache,
  type MarketDataCache,
} from './market-data-file-cache.js';
import type {
  BitcoinMarketDataSnapshot,
  CachedBitcoinMarketData,
} from './market-data.types.js';

const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class MarketDataService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MarketDataService.name);
  private data: CachedBitcoinMarketData = {
    quote: null,
    candles: [],
    fetchedAt: null,
    latestAttemptAt: null,
    nextRefreshAt: null,
    lastError: null,
  };
  private refreshTimer: NodeJS.Timeout | undefined;

  constructor(
    @Inject(MARKET_DATA_PROVIDER)
    private readonly provider: MarketDataProvider,
    @Inject(MarketDataFileCache)
    private readonly cache: MarketDataCache,
  ) {}

  async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    await this.loadCachedData();
    const dueIn = this.data.nextRefreshAt
      ? Date.parse(this.data.nextRefreshAt) - Date.now()
      : 0;
    this.scheduleRefresh(Math.max(dueIn, 0));
  }

  onModuleDestroy(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
  }

  getSnapshot(): BitcoinMarketDataSnapshot {
    return {
      ...this.data,
      status: this.data.candles.length > 0 ? 'available' : 'unavailable',
      symbol: 'BTC',
      quoteCurrency: 'USDT',
      interval: '1h',
      provider: 'Binance Spot',
      stale:
        this.data.fetchedAt === null ||
        Date.now() - Date.parse(this.data.fetchedAt) >= REFRESH_INTERVAL_MS,
    };
  }

  async refreshBitcoinData(): Promise<void> {
    const attemptedAt = new Date().toISOString();
    this.data = {
      ...this.data,
      latestAttemptAt: attemptedAt,
      nextRefreshAt: new Date(Date.now() + REFRESH_INTERVAL_MS).toISOString(),
    };

    try {
      const candles = await this.provider.fetchBitcoinCandles();
      if (candles.length !== 24) {
        throw new Error('Market-data provider did not return 24 hourly candles');
      }
      const fetchedAt = new Date().toISOString();
      const latestCandle = candles[candles.length - 1];
      this.data = {
        ...this.data,
        quote: {
          symbol: 'BTC',
          quoteCurrency: 'USDT',
          price: latestCandle.close,
          provider: 'Binance Spot',
          fetchedAt,
        },
        candles,
        fetchedAt,
        lastError: null,
      };
      this.logger.log(`Updated BTC/USDT with ${candles.length} hourly candles`);
    } catch (error) {
      this.data = {
        ...this.data,
        lastError:
          error instanceof Error ? error.message : 'Unknown market-data error',
      };
      this.logger.error(`Could not update BTC/USDT data: ${this.data.lastError}`);
    }

    this.data = {
      ...this.data,
      nextRefreshAt: new Date(Date.now() + REFRESH_INTERVAL_MS).toISOString(),
    };
    await this.persistData();
  }

  private async loadCachedData(): Promise<void> {
    try {
      const cached = await this.cache.read();
      if (cached) {
        this.data = cached;
        this.logger.log('Loaded cached BTC/USDT market data');
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown cache read error';
      this.logger.error(`Could not load market-data cache: ${message}`);
    }
  }

  private async persistData(): Promise<void> {
    try {
      await this.cache.write(this.data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown cache write error';
      this.logger.error(`Could not save market-data cache: ${message}`);
    }
  }

  private scheduleRefresh(delayMs: number): void {
    this.refreshTimer = setTimeout(() => {
      void this.refreshAndSchedule();
    }, delayMs);
    this.refreshTimer.unref?.();
  }

  private async refreshAndSchedule(): Promise<void> {
    await this.refreshBitcoinData();
    const dueIn = this.data.nextRefreshAt
      ? Date.parse(this.data.nextRefreshAt) - Date.now()
      : REFRESH_INTERVAL_MS;
    this.scheduleRefresh(Math.max(dueIn, 0));
  }
}
