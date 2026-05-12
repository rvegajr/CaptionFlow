import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const institution = pgTable(
  'institution',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    ltiIss: text('lti_iss').notNull(),
    ltiClientId: text('lti_client_id').notNull(),
    ltiDeploymentId: text('lti_deployment_id').notNull(),
    licenseMaxViewsPerTerm: integer('license_max_views_per_term'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniqLti: uniqueIndex('institution_lti_unique').on(t.ltiIss, t.ltiClientId, t.ltiDeploymentId),
  }),
);

export const instructor = pgTable(
  'instructor',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    institutionId: uuid('institution_id').references(() => institution.id),
    ltiSub: text('lti_sub'),
    email: text('email').notNull(),
    displayName: text('display_name'),
    role: text('role', { enum: ['instructor', 'institution_admin'] })
      .notNull()
      .default('instructor'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    emailIdx: uniqueIndex('instructor_email_unique').on(t.email),
    ltiIdx: index('instructor_lti').on(t.institutionId, t.ltiSub),
  }),
);

export const caption = pgTable(
  'caption',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    instructorId: uuid('instructor_id')
      .notNull()
      .references(() => instructor.id),
    youtubeVideoId: text('youtube_video_id').notNull(),
    format: text('format', { enum: ['srt', 'vtt'] }).notNull(),
    languageCode: text('language_code').notNull(),
    contentText: text('content_text').notNull(),
    isMachineTranslated: boolean('is_machine_translated').default(false).notNull(),
    sourceCaptionId: uuid('source_caption_id'),
    contentHash: text('content_hash'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    instructorVideoIdx: index('caption_instructor_video').on(t.instructorId, t.youtubeVideoId),
    sourceLangIdx: index('caption_source_lang').on(t.sourceCaptionId, t.languageCode),
  }),
);

export const captionedResource = pgTable(
  'captioned_resource',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    instructorId: uuid('instructor_id')
      .notNull()
      .references(() => instructor.id),
    youtubeVideoId: text('youtube_video_id').notNull(),
    defaultCaptionId: uuid('default_caption_id').references(() => caption.id),
    ltiResourceLinkId: text('lti_resource_link_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    ltiIdx: uniqueIndex('captioned_resource_lti_unique').on(t.ltiResourceLinkId),
  }),
);

export const magicLink = pgTable(
  'magic_link',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    emailIdx: index('magic_link_email').on(t.email),
  }),
);

export const viewEvent = pgTable(
  'view_event',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    captionedResourceId: uuid('captioned_resource_id')
      .notNull()
      .references(() => captionedResource.id),
    institutionId: uuid('institution_id').references(() => institution.id),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    resIdx: index('view_event_resource').on(t.captionedResourceId),
    instIdx: index('view_event_institution').on(t.institutionId),
  }),
);

export const captionGrant = pgTable(
  'caption_grant',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerCaptionId: uuid('owner_caption_id')
      .notNull()
      .references(() => caption.id),
    granteeInstructorId: uuid('grantee_instructor_id')
      .notNull()
      .references(() => instructor.id),
    grantedAt: timestamp('granted_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniqGrant: uniqueIndex('caption_grant_unique').on(t.ownerCaptionId, t.granteeInstructorId),
  }),
);

export const ltiPlatform = pgTable(
  'lti_platform',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    issuerUrl: text('issuer_url').notNull(),
    clientId: text('client_id').notNull(),
    authEndpoint: text('auth_endpoint').notNull(),
    tokenEndpoint: text('token_endpoint').notNull(),
    jwksUrl: text('jwks_url').notNull(),
    deploymentIds: text('deployment_ids').array().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    issuerClientIdx: uniqueIndex('lti_platform_issuer_client_unique').on(t.issuerUrl, t.clientId),
  }),
);
