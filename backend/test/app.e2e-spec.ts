import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';

// Needs a disposable Postgres with the migrations applied: DATABASE_URL must
// point at it. Users are created with unique emails and left in place.
const ORIGIN = 'http://localhost:5000';
const email = `e2e-${Date.now()}@example.com`;
const password = 'password123';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.BETTER_AUTH_SECRET ??= 'e2e-secret-e2e-secret-e2e-secret-00';
    process.env.BETTER_AUTH_URL = ORIGIN;
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication({ bodyParser: false });
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  it('keeps the root route public', () =>
    http().get('/api').expect(200).expect('Hello World!'));

  it('rejects protected routes without a session', () =>
    http().get('/api/me').expect(401));

  it('signs up, serves /me with the session cookie, and signs out', async () => {
    const agent = request.agent(app.getHttpServer());

    const signUp = await agent
      .post('/api/auth/sign-up/email')
      .set('Origin', ORIGIN)
      .send({ name: 'E2E', email, password })
      .expect(200);
    expect(JSON.stringify(signUp.body)).not.toContain(password);

    const me = await agent.get('/api/me').expect(200);
    expect(me.body.email).toBe(email);
    expect(me.body).not.toHaveProperty('password');

    await agent
      .post('/api/auth/sign-out')
      .set('Origin', ORIGIN)
      .send({})
      .expect(200);
    await agent.get('/api/me').expect(401);
  });

  it('rejects a duplicate email', () =>
    http()
      .post('/api/auth/sign-up/email')
      .set('Origin', ORIGIN)
      .send({ name: 'E2E', email, password })
      .expect(422));

  it('rejects a wrong password', () =>
    http()
      .post('/api/auth/sign-in/email')
      .set('Origin', ORIGIN)
      .send({ email, password: 'wrongwrong' })
      .expect(401));

  // The origin check is verified manually: better-auth disables it when
  // NODE_ENV=test, which vitest sets.
});
