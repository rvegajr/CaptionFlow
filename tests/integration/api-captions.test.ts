import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { join } from 'node:path';
import { makeDb, type Db } from '../../src/server/db/client.js';
import { buildApp } from '../../src/server/app.js';
import { FakeMagicLinkSender } from '../../src/server/adapters/fake-magic-link-sender.js';
import { SystemClock } from '../../src/server/adapters/system-clock.js';
import { UuidIdGenerator } from '../../src/server/adapters/uuid-id-generator.js';

let pg: StartedPostgreSqlContainer;
let db: Db;
let app: Awaited<ReturnType<typeof buildApp>>;
let cookieHeader: string;

beforeAll(async () => {
  pg = await new PostgreSqlContainer('postgres:16-alpine').start();
  db = makeDb(pg.getConnectionUri());
  await migrate(db, { migrationsFolder: join(process.cwd(), 'src/server/db/migrations') });
  const magicLinks = new FakeMagicLinkSender();
  app = await buildApp({
    db,
    databaseUrl: pg.getConnectionUri(),
    clock: new SystemClock(),
    ids: new UuidIdGenerator(),
    magicLinks,
    baseUrl: 'http://localhost:3000',
    sessionSecret: '01234567890123456789012345678901',
    ltiEncryptionKey: '01234567890123456789012345678901',
    staticDir: null,
    isProd: false,
    enableLti: false,
  });
  await app.ready();
  await app.inject({ method: 'POST', url: '/auth/magic-link', payload: { email: 't@example.com' } });
  const link = magicLinks.lastLink!;
  const u = new URL(link);
  const token = u.searchParams.get('token')!;
  const res = await app.inject({ method: 'GET', url: `/auth/callback?token=${encodeURIComponent(token)}` });
  const setCookie = res.headers['set-cookie'];
  expect(setCookie).toBeDefined();
  cookieHeader = Array.isArray(setCookie) ? setCookie.join('; ') : String(setCookie);
}, 120_000);

afterAll(async () => {
  await app.close();
  await db.$client.end();
  await pg.stop();
});

describe('API captions', () => {
  it('creates and lists captions', async () => {
    const vtt = `WEBVTT

00:00:00.000 --> 00:00:01.000
Hi
`;
    const boundary = '----cf';
    const body = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="youtube_video_id"',
      '',
      'dQw4w9WgXcQ',
      `--${boundary}`,
      'Content-Disposition: form-data; name="language_code"',
      '',
      'en',
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="t.vtt"',
      'Content-Type: text/plain',
      '',
      vtt,
      `--${boundary}--`,
      '',
    ].join('\r\n');

    const post = await app.inject({
      method: 'POST',
      url: '/api/captions',
      headers: {
        cookie: cookieHeader,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });
    expect(post.statusCode).toBe(200);
    const cap = JSON.parse(post.body) as { id: string };
    const list = await app.inject({
      method: 'GET',
      url: '/api/captions',
      headers: { cookie: cookieHeader },
    });
    expect(list.statusCode).toBe(200);
    const arr = JSON.parse(list.body) as { id: string }[];
    expect(arr.some((c) => c.id === cap.id)).toBe(true);
  });
});
