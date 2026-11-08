import { BinanceMarketDataProvider } from './binance-market-data.provider.js';

const HOUR_MS = 60 * 60 * 1000;

describe('BinanceMarketDataProvider', () => {
  const provider = new BinanceMarketDataProvider();

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests exactly 24 one-hour BTCUSDT candles and normalizes them', async () => {
    const now = Math.floor(Date.now() / HOUR_MS) * HOUR_MS;
    const payload = Array.from({ length: 24 }, (_, index) =>
      makeBinanceCandle(now - (23 - index) * HOUR_MS),
    );
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(payload), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const candles = await provider.fetchBitcoinCandles();

    const [requestUrl, requestOptions] = fetchMock.mock.calls[0];
    const url = new URL(requestUrl.toString());
    expect(url.searchParams.get('symbol')).toBe('BTCUSDT');
    expect(url.searchParams.get('interval')).toBe('1h');
    expect(url.searchParams.get('limit')).toBe('24');
    expect(
      Number(url.searchParams.get('endTime')) -
        Number(url.searchParams.get('startTime')),
    ).toBe(24 * HOUR_MS);
    expect(url.searchParams.has('apiKey')).toBe(false);
    expect(requestOptions?.signal).toBeInstanceOf(AbortSignal);
    expect(candles).toHaveLength(24);
    expect(candles[0]).toEqual({
      openTime: new Date(now - 23 * HOUR_MS).toISOString(),
      closeTime: new Date(now - 22 * HOUR_MS - 1).toISOString(),
      open: '100.00',
      high: '110.00',
      low: '90.00',
      close: '105.00',
      volume: '1.25',
    });
  });

  it('rejects incomplete or non-hourly responses', async () => {
    const now = Math.floor(Date.now() / HOUR_MS) * HOUR_MS;
    const payload = Array.from({ length: 24 }, (_, index) =>
      makeBinanceCandle(
        now - (23 - index) * HOUR_MS + (index === 12 ? HOUR_MS : 0),
      ),
    );
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify(payload), { status: 200 }),
      ),
    );

    await expect(provider.fetchBitcoinCandles()).rejects.toThrow(
      'non-hourly BTCUSDT candle series',
    );
  });

  it('reports Binance HTTP errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(null, { status: 429 }),
      ),
    );

    await expect(provider.fetchBitcoinCandles()).rejects.toThrow(
      'Binance returned HTTP 429',
    );
  });
});

function makeBinanceCandle(openTime: number): unknown[] {
  return [
    openTime,
    '100.00',
    '110.00',
    '90.00',
    '105.00',
    '1.25',
    openTime + HOUR_MS - 1,
  ];
}
