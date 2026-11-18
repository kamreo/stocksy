import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma.service.js';

const ORIGIN = 'http://localhost:5000';

describe('Portfolio and asset discovery (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let owner: ReturnType<typeof request.agent>;
  let other: ReturnType<typeof request.agent>;
  let ownerId: string;

  async function signUp() {
    const agent = request.agent(app.getHttpServer());
    const response = await agent
      .post('/api/auth/sign-up/email')
      .set('Origin', ORIGIN)
      .send({
        name: 'Portfolio E2E',
        email: `portfolio-${randomUUID()}@example.com`,
        password: 'password123',
      })
      .expect(200);
    return { agent, userId: response.body.user.id as string };
  }

  beforeAll(async () => {
    const database = new URL(
      process.env.DATABASE_URL ?? 'postgresql://invalid',
    );
    const dockerTest =
      process.env.STOCKSY_E2E_DISPOSABLE === '1' &&
      database.hostname === 'db' &&
      database.pathname === '/stocksy';
    const ciTest =
      process.env.CI === 'true' &&
      database.hostname === 'localhost' &&
      database.pathname === '/test';
    if (!dockerTest && !ciTest)
      throw new Error(
        'Use the documented disposable Docker database or the CI test database for E2E.',
      );
    process.env.BETTER_AUTH_SECRET ??= 'e2e-secret-e2e-secret-e2e-secret-00';
    process.env.BETTER_AUTH_URL = ORIGIN;
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication({ bodyParser: false });
    app.setGlobalPrefix('api');
    await app.init();
    prisma = app.get(PrismaService);
    const first = await signUp();
    owner = first.agent;
    ownerId = first.userId;
    other = (await signUp()).agent;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it.each([
    ['post', '/api/portfolios'],
    ['get', '/api/portfolios'],
    ['get', `/api/portfolios/${randomUUID()}`],
    ['get', '/api/assets/search?q=BTC'],
  ] as const)('requires a session for %s %s', async (method, route) => {
    await request(app.getHttpServer())
      [method](route)
      .send(method === 'post' ? { name: 'Savings' } : undefined)
      .expect(401);
  });

  it('creates, persists, lists and reads portfolio metadata', async () => {
    const created = await owner
      .post('/api/portfolios')
      .send({ name: '  Savings  ' })
      .expect(201);
    expect(created.body).toEqual({
      id: expect.any(String),
      name: 'Savings',
      baseCurrency: 'USD',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
    expect(
      await prisma.portfolio.findUnique({ where: { id: created.body.id } }),
    ).toMatchObject({ userId: ownerId, name: 'Savings' });
    const list = await owner.get('/api/portfolios').expect(200);
    expect(list.body).toContainEqual(created.body);
    const detail = await owner
      .get(`/api/portfolios/${created.body.id}`)
      .expect(200);
    expect(detail.body).toEqual(created.body);
  });

  it.each([' eur ', 'pln'])('normalizes currency %s', async (currency) => {
    const created = await owner
      .post('/api/portfolios')
      .send({ name: 'Currency', baseCurrency: currency })
      .expect(201);
    expect(created.body.baseCurrency).toBe(currency.trim().toUpperCase());
  });

  it('keeps another user list empty even with a forged ownership query', async () => {
    const list = await other
      .get(`/api/portfolios?userId=${ownerId}`)
      .expect(200);
    expect(list.body).toEqual([]);
  });

  it('returns identical 404 responses for another owner and an unknown ID', async () => {
    const created = await owner
      .post('/api/portfolios')
      .send({ name: 'Private' })
      .expect(201);
    const forbidden = await other
      .get(`/api/portfolios/${created.body.id}`)
      .expect(404);
    const missing = await other
      .get(`/api/portfolios/${randomUUID()}`)
      .expect(404);
    expect(forbidden.body).toEqual(missing.body);
    expect(forbidden.body.message).toBe('Portfolio not found.');
  });

  it('rejects a malformed portfolio ID', async () => {
    await owner.get('/api/portfolios/invalid').expect(400);
  });

  it.each(
    [
      {},
      { name: '' },
      { name: ' ' },
      { name: 1 },
      { name: 'a'.repeat(81) },
      { name: 'Savings', baseCurrency: null },
      { name: 'Savings', baseCurrency: 'USDT' },
      { name: 'Savings', userId: 'forged' },
      { name: 'Savings', ownerId: 'forged' },
      [],
    ].map((body) => ({ body })),
  )('rejects invalid portfolio body $body', async ({ body }) => {
    const before = await prisma.portfolio.count({ where: { userId: ownerId } });
    await owner.post('/api/portfolios').send(body).expect(400);
    expect(await prisma.portfolio.count({ where: { userId: ownerId } })).toBe(
      before,
    );
  });

  it.each([
    ['btc', 'crypto:bitcoin'],
    ['BITCOIN', 'crypto:bitcoin'],
    [' Ethereum ', 'crypto:ethereum'],
  ])('finds catalog metadata for %s', async (query, id) => {
    const response = await owner
      .get('/api/assets/search')
      .query({ q: query })
      .expect(200);
    expect(response.body).toEqual([
      {
        id,
        symbol: id === 'crypto:bitcoin' ? 'BTC' : 'ETH',
        name: id === 'crypto:bitcoin' ? 'Bitcoin' : 'Ethereum',
        assetType: 'CRYPTO',
      },
    ]);
  });

  it('returns no matches as an empty array', async () => {
    const response = await owner
      .get('/api/assets/search?q=unmatched')
      .expect(200);
    expect(response.body).toEqual([]);
  });

  it.each(['', '?q=', '?q=%20', '?q=BTC&q=ETH', `?q=${'a'.repeat(81)}`])(
    'rejects invalid search %s',
    async (query) => {
      await owner.get(`/api/assets/search${query}`).expect(400);
    },
  );

  it('keeps Better Auth account deletion disabled', async () => {
    await owner
      .post('/api/auth/delete-user')
      .set('Origin', ORIGIN)
      .send({ password: 'password123' })
      .expect(404);
    await owner.get('/api/me').expect(200);
    expect(
      await prisma.user.findUnique({ where: { id: ownerId } }),
    ).not.toBeNull();
  });

  it('cascades a test user deletion without deleting other portfolios or catalog assets', async () => {
    const doomed = await signUp();
    const created = await doomed.agent
      .post('/api/portfolios')
      .send({ name: 'Disposable' })
      .expect(201);
    const surviving = await other
      .post('/api/portfolios')
      .send({ name: 'Keep' })
      .expect(201);
    await prisma.user.delete({ where: { id: doomed.userId } });
    expect(
      await prisma.portfolio.findUnique({ where: { id: created.body.id } }),
    ).toBeNull();
    expect(
      await prisma.portfolio.findUnique({ where: { id: surviving.body.id } }),
    ).not.toBeNull();
    expect(
      await prisma.session.count({ where: { userId: doomed.userId } }),
    ).toBe(0);
    expect(
      await prisma.account.count({ where: { userId: doomed.userId } }),
    ).toBe(0);
    expect(await prisma.asset.count()).toBe(2);
    await doomed.agent.get('/api/portfolios').expect(401);
  });
});
