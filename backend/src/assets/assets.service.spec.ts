import { vi } from 'vitest';
import type { PrismaService } from '../prisma.service.js';
import { AssetsService } from './assets.service.js';

describe('AssetsService', () => {
  const prisma = { asset: { findMany: vi.fn() } };
  const service = new AssetsService(prisma as unknown as PrismaService);

  beforeEach(() => vi.resetAllMocks());

  it('searches both labels without prices or provider calls', async () => {
    const assets = [
      {
        id: 'crypto:bitcoin',
        symbol: 'BTC',
        name: 'Bitcoin',
        assetType: 'CRYPTO',
      },
    ];
    prisma.asset.findMany.mockResolvedValue(assets);
    await expect(service.search('btc')).resolves.toEqual(assets);
    expect(prisma.asset.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { symbol: { contains: 'btc', mode: 'insensitive' } },
          { name: { contains: 'btc', mode: 'insensitive' } },
        ],
      },
      orderBy: [{ symbol: 'asc' }, { id: 'asc' }],
      take: 20,
      select: { id: true, symbol: true, name: true, assetType: true },
    });
  });

  it('returns an empty array when nothing matches', async () => {
    prisma.asset.findMany.mockResolvedValue([]);
    await expect(service.search('unmatched')).resolves.toEqual([]);
  });
});
