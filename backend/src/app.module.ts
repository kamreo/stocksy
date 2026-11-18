import { Module } from '@nestjs/common';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { createAuth } from './auth.js';
import { AssetsModule } from './assets/assets.module.js';
import { PortfoliosModule } from './portfolios/portfolios.module.js';
import { PrismaModule } from './prisma.module.js';
import { PrismaService } from './prisma.service.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule.forRootAsync({
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) => ({ auth: createAuth(prisma) }),
    }),
    PortfoliosModule,
    AssetsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
