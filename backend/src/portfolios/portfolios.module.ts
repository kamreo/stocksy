import { Module } from '@nestjs/common';
import { CreatePortfolioPipe } from './create-portfolio.pipe.js';
import { PortfoliosController } from './portfolios.controller.js';
import { PortfoliosService } from './portfolios.service.js';

@Module({
  controllers: [PortfoliosController],
  providers: [PortfoliosService, CreatePortfolioPipe],
})
export class PortfoliosModule {}
