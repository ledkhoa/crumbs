ALTER TABLE "crumbs" ADD COLUMN "user_hero_dish_override" text;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "editorial_summary" text;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "community_favorite_dish" text;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "reservation_url" text;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "reservation_provider" varchar(64);--> statement-breakpoint
ALTER TABLE "post_restaurants" ADD COLUMN "hero_dish" text;--> statement-breakpoint
ALTER TABLE "post_restaurants" ADD COLUMN "vibe_anchor" text;--> statement-breakpoint
ALTER TABLE "post_restaurants" ADD COLUMN "course_category" text;--> statement-breakpoint
ALTER TABLE "post_restaurants" ADD COLUMN "walk_in_tips" text;