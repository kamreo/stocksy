import { Controller, Get } from '@nestjs/common';
import { MarketDataService } from './market-data.service.js';

@Controller('market-data')
export class MarketDataController {
  constructor(private readonly marketDataService: MarketDataService) {}

  @Get('bitcoin')
  getBitcoinMarketData() {
    return this.marketDataService.getSnapshot();
  }
}
