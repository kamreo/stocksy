import { Module } from '@nestjs/common';
import { BinanceMarketDataProvider } from './providers/binance-market-data.provider.js';
import { MARKET_DATA_PROVIDER } from './market-data.provider.js';
import { MarketDataController } from './market-data.controller.js';
import { MarketDataFileCache } from './market-data-file-cache.js';
import { MarketDataService } from './market-data.service.js';

@Module({
  controllers: [MarketDataController],
  providers: [
    {
      provide: MarketDataFileCache,
      useFactory: () => new MarketDataFileCache(),
    },
    MarketDataService,
    {
      provide: MARKET_DATA_PROVIDER,
      useClass: BinanceMarketDataProvider,
    },
  ],
})
export class MarketDataModule {}
