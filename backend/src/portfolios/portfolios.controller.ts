import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import {
  CreatePortfolioPipe,
  type CreatePortfolioInput,
} from './create-portfolio.pipe.js';
import { PortfoliosService } from './portfolios.service.js';

@Controller('portfolios')
export class PortfoliosController {
  constructor(
    @Inject(PortfoliosService) private readonly portfolios: PortfoliosService,
  ) {}

  @Post()
  create(
    @Session() session: UserSession,
    @Body(CreatePortfolioPipe) input: CreatePortfolioInput,
  ) {
    return this.portfolios.create(session.user.id, input);
  }

  @Get()
  list(@Session() session: UserSession) {
    return this.portfolios.listForUser(session.user.id);
  }

  @Get(':id')
  findOne(
    @Session() session: UserSession,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.portfolios.findOwned(session.user.id, id);
  }
}
