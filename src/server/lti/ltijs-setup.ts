import { createRequire } from 'node:module';
import type { FastifyInstance } from 'fastify';
import fastifyExpress from '@fastify/express';
import type { PgInstitutionRepo } from '../repos/pg-institution-repo.js';
import type { PgInstructorRepo } from '../repos/pg-instructor-repo.js';
import type { PgResourceRepo } from '../repos/pg-resource-repo.js';
import type { PgCaptionRepo } from '../repos/pg-caption-repo.js';
import type { PgLtiPlatformRepo } from '../repos/pg-lti-platform-repo.js';

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
    ltiPlatforms: PgLtiPlatformRepo;
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
    deepLinkingRoute: '/lti/deep-link',
    devMode: !opts.isProd,
    cookies: {
      secure: opts.isProd,
      sameSite: opts.isProd ? 'None' : 'Lax',
    },
  });

  // Deep Linking handler - instructor picks content
  lti.onDeepLinking(async (token: Record<string, unknown>, req: unknown, res: { redirect: (u: string) => void }) => {
    // Read the instructor from the token
    const user = token.user as { email?: string; name?: string; id?: string } | undefined;
    const email = (user?.email ?? `unknown+${user?.id ?? 'user'}@lti.local`).toLowerCase();
    let instructor = await opts.instructors.findByEmail(email);
    if (!instructor) {
      instructor = await opts.instructors.create(email, user?.name ?? null);
    }

    // Redirect to content picker page with LTI session
    const pickerUrl = `${opts.baseUrl}/lti/picker`;
    return res.redirect(pickerUrl);
  });

  // Regular launch handler - student views content
  lti.onConnect(
    async (token: Record<string, unknown>, _req: unknown, res: { redirect: (u: string) => void }) => {
      const platformContext = token.platformContext as
        | { resource?: { id?: string }; custom?: { captionflow_resource_id?: string } }
        | undefined;
      const linkId = platformContext?.resource?.id ?? 'unknown-link';
      const customResourceId = platformContext?.custom?.captionflow_resource_id;

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

      // If deep-linked resource ID is present, use it
      if (customResourceId) {
        const target = `${opts.baseUrl}/caption-surface.html?resource=${encodeURIComponent(customResourceId)}`;
        return res.redirect(target);
      }

      // Otherwise fall back to resource link lookup or stub creation
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

  // Register all platforms from the database
  const platforms = await opts.ltiPlatforms.findAll();
  for (const platform of platforms) {
    try {
      await lti.registerPlatform({
        url: platform.issuerUrl,
        name: platform.name,
        clientId: platform.clientId,
        authenticationEndpoint: platform.authEndpoint,
        accesstokenEndpoint: platform.tokenEndpoint,
        authConfig: {
          method: 'JWK_SET',
          key: platform.jwksUrl,
        },
      });
      app.log.info({ platformId: platform.id, name: platform.name }, 'Registered LTI platform');
    } catch (err) {
      app.log.warn({ err, platformId: platform.id }, 'Failed to register LTI platform');
    }
  }

  await app.register(fastifyExpress);
  app.use((req, res, next) => {
    const p = req.url ?? '';
    if (p.startsWith('/lti') || p.startsWith('/.well-known')) {
      return lti.app(req, res, next);
    }
    return next();
  });

  // Content picker endpoint (returns deep link to LMS)
  app.post('/lti/picker/confirm', async (req, reply) => {
    const body = req.body as { resourceId: string };
    const resourceId = body.resourceId;

    if (!resourceId) {
      return reply.code(400).send({ error: 'resourceId required' });
    }

    try {
      const contentItem = {
        type: 'ltiResourceLink',
        title: 'CaptionFlow Video',
        url: `${opts.baseUrl}/lti/launch`,
        custom: {
          captionflow_resource_id: resourceId,
        },
      };

      const form = await lti.DeepLinking.createDeepLinkingForm(req, reply, [contentItem]);
      return reply.type('text/html').send(form);
    } catch (err) {
      app.log.error({ err }, 'Deep linking failed');
      return reply.code(500).send({ error: 'Deep linking failed' });
    }
  });
}
