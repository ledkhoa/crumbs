CREATE SCHEMA "auth";
--> statement-breakpoint
CREATE TABLE "auth"."account" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth"."session" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "auth"."user" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "auth"."verification" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "crumbs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"source_post_id" uuid,
	"status" varchar(32) DEFAULT 'inbox' NOT NULL,
	"user_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guide_crumbs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guide_id" uuid NOT NULL,
	"crumb_id" uuid NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"emoji_icon" varchar(32),
	"cover_image_url" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" varchar(32) NOT NULL,
	"post_type" varchar(32) DEFAULT 'unknown' NOT NULL,
	"platform_post_id" varchar(128) NOT NULL,
	"original_url" text NOT NULL,
	"caption" text,
	"location_name" varchar(255),
	"media_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"media_snapshot" jsonb,
	"classification" varchar(64) NOT NULL,
	"summary" text,
	"raw_metadata_json" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restaurants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"google_place_id" varchar(255),
	"name" varchar(255) NOT NULL,
	"formatted_address" text,
	"city" varchar(128),
	"state" varchar(128),
	"country" varchar(128),
	"latitude" double precision,
	"longitude" double precision,
	"cuisine" varchar(128),
	"rating" numeric(3, 2),
	"user_rating_count" integer,
	"price_level" varchar(64),
	"maps_url" text,
	"website_url" text,
	"photo_url" text,
	"regular_opening_hours" jsonb,
	"places_last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "restaurants_google_place_id_unique" UNIQUE("google_place_id")
);
--> statement-breakpoint
CREATE TABLE "post_restaurants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"recommended_dishes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"vibe_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"creator_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth"."account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crumbs" ADD CONSTRAINT "crumbs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crumbs" ADD CONSTRAINT "crumbs_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crumbs" ADD CONSTRAINT "crumbs_source_post_id_posts_id_fk" FOREIGN KEY ("source_post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_crumbs" ADD CONSTRAINT "guide_crumbs_guide_id_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."guides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_crumbs" ADD CONSTRAINT "guide_crumbs_crumb_id_crumbs_id_fk" FOREIGN KEY ("crumb_id") REFERENCES "public"."crumbs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guides" ADD CONSTRAINT "guides_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_restaurants" ADD CONSTRAINT "post_restaurants_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_restaurants" ADD CONSTRAINT "post_restaurants_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "auth"."account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "auth"."session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "auth"."verification" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "crumbs_user_restaurant_uidx" ON "crumbs" USING btree ("user_id","restaurant_id");--> statement-breakpoint
CREATE INDEX "crumbs_user_id_idx" ON "crumbs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "crumbs_status_idx" ON "crumbs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "crumbs_restaurant_id_idx" ON "crumbs" USING btree ("restaurant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "guide_crumbs_guide_crumb_uidx" ON "guide_crumbs" USING btree ("guide_id","crumb_id");--> statement-breakpoint
CREATE INDEX "guide_crumbs_guide_id_idx" ON "guide_crumbs" USING btree ("guide_id");--> statement-breakpoint
CREATE INDEX "guide_crumbs_crumb_id_idx" ON "guide_crumbs" USING btree ("crumb_id");--> statement-breakpoint
CREATE INDEX "guides_user_id_idx" ON "guides" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "guides_is_public_idx" ON "guides" USING btree ("is_public");--> statement-breakpoint
CREATE UNIQUE INDEX "posts_platform_post_id_uidx" ON "posts" USING btree ("platform","platform_post_id");--> statement-breakpoint
CREATE UNIQUE INDEX "restaurants_google_place_id_uidx" ON "restaurants" USING btree ("google_place_id");--> statement-breakpoint
CREATE INDEX "restaurants_name_city_idx" ON "restaurants" USING btree ("name","city");--> statement-breakpoint
CREATE INDEX "restaurants_coordinates_idx" ON "restaurants" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE UNIQUE INDEX "post_restaurants_post_restaurant_uidx" ON "post_restaurants" USING btree ("post_id","restaurant_id");--> statement-breakpoint
CREATE INDEX "post_restaurants_post_id_idx" ON "post_restaurants" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "post_restaurants_restaurant_id_idx" ON "post_restaurants" USING btree ("restaurant_id");