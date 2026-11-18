import { Module } from '@nestjs/common';
import { AssetSearchQueryPipe } from './asset-search-query.pipe.js';
import { AssetsController } from './assets.controller.js';
import { AssetsService } from './assets.service.js';

@Module({
  controllers: [AssetsController],
  providers: [AssetsService, AssetSearchQueryPipe],
})
export class AssetsModule {}
