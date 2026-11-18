import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import type { CreatePortfolioInput } from './create-portfolio.pipe.js';

const portfolioSelect = {
  id: true,
  name: true,
  baseCurrency: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class PortfoliosService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  create(userId: string, input: CreatePortfolioInput) {
    return this.prisma.portfolio.create({
      data: { userId, name: input.name, baseCurrency: input.baseCurrency },
      select: portfolioSelect,
    });
  }

  listForUser(userId: string) {
    return this.prisma.portfolio.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      select: portfolioSelect,
    });
  }

  async findOwned(userId: string, id: string) {
    const portfolio = await this.prisma.portfolio.findFirst({
      where: { id, userId },
      select: portfolioSelect,
    });
    if (!portfolio) throw new NotFoundException('Portfolio not found.');
    return portfolio;
  }
}
