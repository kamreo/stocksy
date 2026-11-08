import type { BitcoinCandle } from './market-data.types.js';

export const MARKET_DATA_PROVIDER = Symbol('MARKET_DATA_PROVIDER');

export interface MarketDataProvider {
  fetchBitcoinCandles(): Promise<BitcoinCandle[]>;
}
