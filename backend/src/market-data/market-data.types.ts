export interface BitcoinCandle {
  openTime: string;
  closeTime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

export interface BitcoinQuote {
  symbol: 'BTC';
  quoteCurrency: 'USDT';
  price: string;
  provider: 'Binance Spot';
  fetchedAt: string;
}

export interface CachedBitcoinMarketData {
  quote: BitcoinQuote | null;
  candles: BitcoinCandle[];
  fetchedAt: string | null;
  latestAttemptAt: string | null;
  nextRefreshAt: string | null;
  lastError: string | null;
}

export interface BitcoinMarketDataSnapshot extends CachedBitcoinMarketData {
  status: 'available' | 'unavailable';
  symbol: 'BTC';
  quoteCurrency: 'USDT';
  interval: '1h';
  provider: 'Binance Spot';
  stale: boolean;
}
