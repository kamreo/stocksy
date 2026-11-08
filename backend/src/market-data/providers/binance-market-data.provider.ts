import { Injectable } from '@nestjs/common';
import type { MarketDataProvider } from '../market-data.provider.js';
import type { BitcoinCandle } from '../market-data.types.js';

const BINANCE_KLINES_URL = 'https://api.binance.com/api/v3/klines';
const CANDLE_COUNT = 24;
const HOUR_MS = 60 * 60 * 1000;
const DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;

@Injectable()
export class BinanceMarketDataProvider implements MarketDataProvider {
  async fetchBitcoinCandles(): Promise<BitcoinCandle[]> {
    const endTime = Date.now();
    const startTime = endTime - CANDLE_COUNT * HOUR_MS;
    const url = new URL(BINANCE_KLINES_URL);
    url.searchParams.set('symbol', 'BTCUSDT');
    url.searchParams.set('interval', '1h');
    url.searchParams.set('limit', String(CANDLE_COUNT));
    url.searchParams.set('startTime', String(startTime));
    url.searchParams.set('endTime', String(endTime));

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(`Binance returned HTTP ${response.status}`);
    }

    const payload: unknown = await response.json();
    if (!Array.isArray(payload) || payload.length !== CANDLE_COUNT) {
      throw new Error(
        `Binance returned an invalid hourly candle count; expected ${CANDLE_COUNT}`,
      );
    }

    const candles = payload.map(parseCandle);
    if (
      candles.some((candle) => {
        const openTime = Date.parse(candle.openTime);
        return openTime < startTime || openTime > endTime;
      })
    ) {
      throw new Error('Binance returned a BTCUSDT candle outside the past 24 hours');
    }

    for (let index = 1; index < candles.length; index += 1) {
      const previousTime = Date.parse(candles[index - 1].openTime);
      const currentTime = Date.parse(candles[index].openTime);
      if (currentTime - previousTime !== HOUR_MS) {
        throw new Error('Binance returned a non-hourly BTCUSDT candle series');
      }
    }

    return candles;
  }
}

function parseCandle(value: unknown): BitcoinCandle {
  if (!Array.isArray(value) || value.length < 7) {
    throw new Error('Binance returned an invalid BTCUSDT candle');
  }

  const openTime = parseTimestamp(value[0]);
  const open = parsePrice(value[1]);
  const high = parsePrice(value[2]);
  const low = parsePrice(value[3]);
  const close = parsePrice(value[4]);
  const volume = parseVolume(value[5]);
  const closeTime = parseTimestamp(value[6]);
  const openTimeMs = Date.parse(openTime);
  const closeTimeMs = Date.parse(closeTime);

  if (
    openTimeMs % HOUR_MS !== 0 ||
    Number(high) < Math.max(Number(open), Number(low), Number(close)) ||
    Number(low) > Math.min(Number(open), Number(high), Number(close)) ||
    closeTimeMs < openTimeMs ||
    closeTimeMs >= openTimeMs + HOUR_MS
  ) {
    throw new Error('Binance returned an invalid BTCUSDT candle range');
  }

  return {
    openTime,
    closeTime,
    open,
    high,
    low,
    close,
    volume,
  };
}

function parseTimestamp(value: unknown): string {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error('Binance returned an invalid candle timestamp');
  }

  const timestamp = new Date(value);
  if (!Number.isFinite(timestamp.getTime())) {
    throw new Error('Binance returned an invalid candle timestamp');
  }
  return timestamp.toISOString();
}

function parsePrice(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !DECIMAL_PATTERN.test(value) ||
    !Number.isFinite(Number(value)) ||
    Number(value) <= 0
  ) {
    throw new Error('Binance returned an invalid BTCUSDT candle price');
  }
  return value;
}

function parseVolume(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !DECIMAL_PATTERN.test(value) ||
    !Number.isFinite(Number(value))
  ) {
    throw new Error('Binance returned an invalid BTCUSDT candle volume');
  }
  return value;
}
