import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class AssetsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  search(query: string) {
    return this.prisma.asset.findMany({
      where: {
        OR: [
          { symbol: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: [{ symbol: 'asc' }, { id: 'asc' }],
      take: 20,
      select: { id: true, symbol: true, name: true, assetType: true },
    });
  }
}
