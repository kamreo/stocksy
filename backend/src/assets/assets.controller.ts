import { Controller, Get, Inject, Query } from '@nestjs/common';
import { AssetSearchQueryPipe } from './asset-search-query.pipe.js';
import { AssetsService } from './assets.service.js';

@Controller('assets')
export class AssetsController {
  constructor(@Inject(AssetsService) private readonly assets: AssetsService) {}

  @Get('search')
  search(@Query('q', AssetSearchQueryPipe) query: string) {
    return this.assets.search(query);
  }
}
