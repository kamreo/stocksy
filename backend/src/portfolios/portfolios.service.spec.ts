import { NotFoundException } from '@nestjs/common';
import { vi } from 'vitest';
import type { PrismaService } from '../prisma.service.js';
import { PortfoliosService } from './portfolios.service.js';

describe('PortfoliosService', () => {
  const portfolio = {
    id: 'portfolio-1',
    name: 'Savings',
    baseCurrency: 'USD',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const prisma = {
    portfolio: { create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() },
  };
  const service = new PortfoliosService(prisma as unknown as PrismaService);

  beforeEach(() => vi.resetAllMocks());

  it('creates a portfolio with the server-provided owner and returns only public metadata', async () => {
    prisma.portfolio.create.mockResolvedValue(portfolio);
    await expect(
      service.create('user-a', { name: 'Savings', baseCurrency: 'USD' }),
    ).resolves.toEqual(portfolio);
    expect(prisma.portfolio.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { userId: 'user-a', name: 'Savings', baseCurrency: 'USD' },
        select: {
          id: true,
          name: true,
          baseCurrency: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    );
  });

  it('filters and orders the owner list, including an empty result', async () => {
    prisma.portfolio.findMany.mockResolvedValue([]);
    await expect(service.listForUser('user-b')).resolves.toEqual([]);
    expect(prisma.portfolio.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-b' },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
    );
  });

  it('looks up details by both portfolio and owner', async () => {
    prisma.portfolio.findFirst.mockResolvedValue(portfolio);
    await expect(service.findOwned('user-a', 'portfolio-1')).resolves.toEqual(
      portfolio,
    );
    expect(prisma.portfolio.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'portfolio-1', userId: 'user-a' },
      }),
    );
  });

  it('returns the same 404 for a missing or inaccessible portfolio', async () => {
    prisma.portfolio.findFirst.mockResolvedValue(null);
    await expect(service.findOwned('user-b', 'portfolio-1')).rejects.toThrow(
      new NotFoundException('Portfolio not found.'),
    );
  });
});
