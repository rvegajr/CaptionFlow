import { z } from 'zod';

const Schema = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  BASE_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32),
  RESEND_API_KEY: z.string().optional(),
  FROM_EMAIL: z.string().email().optional(),
  LTI_ENCRYPTION_KEY: z.string().min(16).optional(),
  DEEPL_API_KEY: z.string().optional(),
  GOOGLE_TRANSLATE_API_KEY: z.string().optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type Config = ReturnType<typeof loadConfig>;

export function loadConfig(env: NodeJS.ProcessEnv) {
  const parsed = Schema.parse(env);
  const isProd = parsed.NODE_ENV === 'production';
  if (isProd && !parsed.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY required in production');
  }
  if (isProd && !parsed.FROM_EMAIL) {
    throw new Error('FROM_EMAIL required in production');
  }
  return {
    port: parsed.PORT,
    databaseUrl: parsed.DATABASE_URL,
    baseUrl: parsed.BASE_URL.replace(/\/$/, ''),
    sessionSecret: parsed.SESSION_SECRET,
    resendApiKey: parsed.RESEND_API_KEY ?? '',
    fromEmail: parsed.FROM_EMAIL ?? 'dev@localhost',
    ltiEncryptionKey: (parsed.LTI_ENCRYPTION_KEY ?? parsed.SESSION_SECRET).slice(0, 64),
    deeplApiKey: parsed.DEEPL_API_KEY ?? undefined,
    googleTranslateApiKey: parsed.GOOGLE_TRANSLATE_API_KEY ?? undefined,
    isProd,
  };
}
