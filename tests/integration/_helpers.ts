import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { join } from 'node:path';
import { makeDb, type Db } from '../../src/server/db/client.js';
import { buildApp, type BuildAppOptions } from '../../src/server/app.js';
import { FakeMagicLinkSender } from '../../src/server/adapters/fake-magic-link-sender.js';
import { SystemClock } from '../../src/server/adapters/system-clock.js';
import { UuidIdGenerator } from '../../src/server/adapters/uuid-id-generator.js';
import type { Clock } from '../../src/server/services/clock.js';

/** Mutable clock so tests can advance time deterministically. */
export class MutableClock implements Clock {
  constructor(public current: Date = new Date('2026-01-01T00:00:00Z')) {}
  now(): Date {
    return new Date(this.current);
  }
  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}

export interface IntegrationHarness {
  pg: StartedPostgreSqlContainer;
  db: Db;
  app: Awaited<ReturnType<typeof buildApp>>;
  magicLinks: FakeMagicLinkSender;
  clock: MutableClock;
  stop(): Promise<void>;
}

export async function startHarness(opts: Partial<BuildAppOptions> = {}): Promise<IntegrationHarness> {
  const pg = await new PostgreSqlContainer('postgres:16-alpine').start();
  const db = makeDb(pg.getConnectionUri());
  await migrate(db, { migrationsFolder: join(process.cwd(), 'src/server/db/migrations') });

  const magicLinks = new FakeMagicLinkSender();
  const clock = new MutableClock();
  const app = await buildApp({
    db,
    databaseUrl: pg.getConnectionUri(),
    clock: opts.clock ?? clock,
    ids: opts.ids ?? new UuidIdGenerator(),
    magicLinks: opts.magicLinks ?? magicLinks,
    baseUrl: opts.baseUrl ?? 'http://localhost:3000',
    sessionSecret: opts.sessionSecret ?? '01234567890123456789012345678901',
    ltiEncryptionKey: opts.ltiEncryptionKey ?? '01234567890123456789012345678901',
    staticDir: opts.staticDir ?? null,
    isProd: opts.isProd ?? false,
    enableLti: opts.enableLti ?? false,
    ...(opts.deeplApiKey !== undefined ? { deeplApiKey: opts.deeplApiKey } : {}),
    ...(opts.googleTranslateApiKey !== undefined
      ? { googleTranslateApiKey: opts.googleTranslateApiKey }
      : {}),
  });
  await app.ready();

  return {
    pg,
    db,
    app,
    magicLinks: (opts.magicLinks as FakeMagicLinkSender) ?? magicLinks,
    clock: (opts.clock as MutableClock) ?? clock,
    async stop() {
      await app.close();
      await db.$client.end();
      await pg.stop();
    },
  };
}

export { SystemClock };

/**
 * Drive the full magic-link login for `email` and return the cookie header to
 * send on subsequent authenticated requests.
 */
export async function loginAs(harness: IntegrationHarness, email: string): Promise<string> {
  await harness.app.inject({
    method: 'POST',
    url: '/auth/magic-link',
    payload: { email },
  });
  const link = harness.magicLinks.lastLink;
  if (!link) throw new Error('magic link sender never received a link');
  const token = new URL(link).searchParams.get('token');
  if (!token) throw new Error('no token in magic link');
  const res = await harness.app.inject({
    method: 'GET',
    url: `/auth/callback?token=${encodeURIComponent(token)}`,
  });
  if (res.statusCode !== 302) {
    throw new Error(`auth/callback returned ${res.statusCode}: ${res.body}`);
  }
  const setCookie = res.headers['set-cookie'];
  return Array.isArray(setCookie) ? setCookie.join('; ') : String(setCookie);
}

/** Multipart helpers for caption upload payloads. */
export function multipartCaption(opts: {
  videoId?: string | undefined;
  languageCode?: string | undefined;
  filename?: string | undefined;
  content: string;
}): { body: string; contentType: string } {
  const boundary = '----cf' + Math.random().toString(36).slice(2);
  const fields: string[] = [];
  if (opts.videoId !== undefined) {
    fields.push(
      `--${boundary}`,
      'Content-Disposition: form-data; name="youtube_video_id"',
      '',
      opts.videoId,
    );
  }
  if (opts.languageCode !== undefined) {
    fields.push(
      `--${boundary}`,
      'Content-Disposition: form-data; name="language_code"',
      '',
      opts.languageCode,
    );
  }
  fields.push(
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="${opts.filename ?? 't.vtt'}"`,
    'Content-Type: text/plain',
    '',
    opts.content,
    `--${boundary}--`,
    '',
  );
  return {
    body: fields.join('\r\n'),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

/** Minimal valid WebVTT body. */
export const SAMPLE_VTT = `WEBVTT

00:00:00.000 --> 00:00:01.000
Hi
`;
