CREATE TABLE "caption" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instructor_id" uuid NOT NULL,
	"youtube_video_id" text NOT NULL,
	"format" text NOT NULL,
	"language_code" text NOT NULL,
	"content_text" text NOT NULL,
	"is_machine_translated" boolean DEFAULT false NOT NULL,
	"source_caption_id" uuid,
	"content_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "caption_grant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_caption_id" uuid NOT NULL,
	"grantee_instructor_id" uuid NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "captioned_resource" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instructor_id" uuid NOT NULL,
	"youtube_video_id" text NOT NULL,
	"default_caption_id" uuid,
	"lti_resource_link_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "institution" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"lti_iss" text NOT NULL,
	"lti_client_id" text NOT NULL,
	"lti_deployment_id" text NOT NULL,
	"license_max_views_per_term" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instructor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institution_id" uuid,
	"lti_sub" text,
	"email" text NOT NULL,
	"display_name" text,
	"role" text DEFAULT 'instructor' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "magic_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "magic_link_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "view_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"captioned_resource_id" uuid NOT NULL,
	"institution_id" uuid,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "caption" ADD CONSTRAINT "caption_instructor_id_instructor_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."instructor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caption_grant" ADD CONSTRAINT "caption_grant_owner_caption_id_caption_id_fk" FOREIGN KEY ("owner_caption_id") REFERENCES "public"."caption"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caption_grant" ADD CONSTRAINT "caption_grant_grantee_instructor_id_instructor_id_fk" FOREIGN KEY ("grantee_instructor_id") REFERENCES "public"."instructor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "captioned_resource" ADD CONSTRAINT "captioned_resource_instructor_id_instructor_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."instructor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "captioned_resource" ADD CONSTRAINT "captioned_resource_default_caption_id_caption_id_fk" FOREIGN KEY ("default_caption_id") REFERENCES "public"."caption"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instructor" ADD CONSTRAINT "instructor_institution_id_institution_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institution"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "view_event" ADD CONSTRAINT "view_event_captioned_resource_id_captioned_resource_id_fk" FOREIGN KEY ("captioned_resource_id") REFERENCES "public"."captioned_resource"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "view_event" ADD CONSTRAINT "view_event_institution_id_institution_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institution"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "caption_instructor_video" ON "caption" USING btree ("instructor_id","youtube_video_id");--> statement-breakpoint
CREATE INDEX "caption_source_lang" ON "caption" USING btree ("source_caption_id","language_code");--> statement-breakpoint
CREATE UNIQUE INDEX "caption_grant_unique" ON "caption_grant" USING btree ("owner_caption_id","grantee_instructor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "captioned_resource_lti_unique" ON "captioned_resource" USING btree ("lti_resource_link_id");--> statement-breakpoint
CREATE UNIQUE INDEX "institution_lti_unique" ON "institution" USING btree ("lti_iss","lti_client_id","lti_deployment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "instructor_email_unique" ON "instructor" USING btree ("email");--> statement-breakpoint
CREATE INDEX "instructor_lti" ON "instructor" USING btree ("institution_id","lti_sub");--> statement-breakpoint
CREATE INDEX "magic_link_email" ON "magic_link" USING btree ("email");--> statement-breakpoint
CREATE INDEX "view_event_resource" ON "view_event" USING btree ("captioned_resource_id");--> statement-breakpoint
CREATE INDEX "view_event_institution" ON "view_event" USING btree ("institution_id");