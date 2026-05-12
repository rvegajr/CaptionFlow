CREATE TABLE "lti_platform" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"issuer_url" text NOT NULL,
	"client_id" text NOT NULL,
	"auth_endpoint" text NOT NULL,
	"token_endpoint" text NOT NULL,
	"jwks_url" text NOT NULL,
	"deployment_ids" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "lti_platform_issuer_client_unique" ON "lti_platform" USING btree ("issuer_url","client_id");