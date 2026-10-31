import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { type Express } from 'express';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { AppModule } from '../src/app.module.js';

let cachedApp: Express | null = null;

async function getApp(): Promise<Express> {
  if (cachedApp) return cachedApp;

  const server = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  app.setGlobalPrefix('api');
  app.enableCors();
  await app.init();

  cachedApp = server;
  return cachedApp;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await getApp();
  app(req, res);
}
