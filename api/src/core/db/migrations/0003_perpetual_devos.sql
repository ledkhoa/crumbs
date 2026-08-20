ALTER TABLE "restaurants" ADD COLUMN "neighborhood" varchar(128);--> statement-breakpoint
CREATE INDEX "restaurants_neighborhood_idx" ON "restaurants" USING btree ("neighborhood");