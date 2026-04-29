import { createRequire } from 'node:module';
import type { FastifyInstance } from 'fastify';
import fastifyExpress from '@fastify/express';
import type { PgInstitutionRepo } from '../repos/pg-institution-repo.js';
import type { PgInstructorRepo } from '../repos/pg-instructor-repo.js';
import type { PgResourceRepo } from '../repos/pg-resource-repo.js';
import type { PgCaptionRepo } from '../repos/pg-caption-repo.js';

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lti = require('ltijs').Provider as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Database = require('ltijs-sequelize') as any;

function parseDatabaseUrl(url: string) {
  const u = new URL(url);
  return {
    database: u.pathname.replace(/^\//, ''),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    host: u.hostname,
    port: Number(u.port) || 5432,
  };
}

export async function registerLti(
  app: FastifyInstance,
  opts: {
    databaseUrl: string;
    encryptionKey: string;
    baseUrl: string;
    isProd: boolean;
    institutions: PgInstitutionRepo;
    instructors: PgInstructorRepo;
    resources: PgResourceRepo;
    captions: PgCaptionRepo;
  },
): Promise<void> {
  const { database, user, password, host, port } = parseDatabaseUrl(opts.databaseUrl);
  const seq = new Database(database, user, password, {
    host,
    port,
    dialect: 'postgres',
    logging: false,
  });

  lti.setup(opts.encryptionKey, { plugin: seq }, {
    appRoute: '/lti/launch',
    loginRoute: '/lti/login',
    keysetRoute: '/.well-known/jwks',
    devMode: !opts.isProd,
    cookies: {
      secure: opts.isProd,
      sameSite: opts.isProd ? 'None' : 'Lax',
    },
  });

  lti.onConnect(
    async (token: Record<string, unknown>, _req: unknown, res: { redirect: (u: string) => void }) => {
      const platformContext = token.platformContext as
        | { resource?: { id?: string } }
        | undefined;
      const linkId = platformContext?.resource?.id ?? 'unknown-link';
      const iss = String(token.iss ?? '');
      const clientId = String((token as { aud?: string }).aud ?? '');
      const deploymentId = String((token as { deploymentId?: string }).deploymentId ?? '');

      const inst = await opts.institutions.upsertByLti({
        name: `Institution ${iss}`,
        ltiIss: iss,
        ltiClientId: clientId,
        ltiDeploymentId: deploymentId,
        licenseMaxViewsPerTerm: null,
      });

      const user = token.user as { email?: string; name?: string; id?: string } | undefined;
      const email = (user?.email ?? `unknown+${user?.id ?? 'user'}@lti.local`).toLowerCase();
      let instructor = await opts.instructors.findByEmail(email);
      if (!instructor) {
        instructor = await opts.instructors.create(email, user?.name ?? null);
      }
      if (!instructor.institutionId || instructor.institutionId !== inst.id) {
        await opts.instructors.setInstitutionAndLti(
          instructor.id,
          inst.id,
          String(user?.id ?? email),
          user?.name ?? null,
        );
      }

      let resource = await opts.resources.findByLtiResourceLink(linkId);
      if (!resource) {
        const stubVtt = `WEBVTT

00:00:00.000 --> 00:00:05.000
Configure this video in CaptionFlow — replace this placeholder caption.
`;
        const cap = await opts.captions.create({
          instructorId: instructor.id,
          youtubeVideoId: 'dQw4w9WgXcQ',
          format: 'vtt',
          languageCode: 'en',
          contentText: stubVtt,
        });
        resource = await opts.resources.create({
          instructorId: instructor.id,
          youtubeVideoId: 'dQw4w9WgXcQ',
          defaultCaptionId: cap.id,
          ltiResourceLinkId: linkId,
        });
      }

      const target = `${opts.baseUrl}/caption-surface.html?resource=${encodeURIComponent(resource.id)}`;
      return res.redirect(target);
    },
  );

  await lti.deploy({ serverless: true, silent: true });

  await app.register(fastifyExpress);
  app.use((req, res, next) => {
    const p = req.url ?? '';
    if (p.startsWith('/lti') || p.startsWith('/.well-known')) {
      return lti.app(req, res, next);
    }
    return next();
  });
}
