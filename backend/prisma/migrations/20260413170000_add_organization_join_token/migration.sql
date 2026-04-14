ALTER TABLE "Organization" ADD COLUMN "joinToken" TEXT;

UPDATE "Organization"
SET "joinToken" = md5(random()::text || clock_timestamp()::text || id::text)
WHERE "joinToken" IS NULL;

ALTER TABLE "Organization" ALTER COLUMN "joinToken" SET NOT NULL;

CREATE UNIQUE INDEX "Organization_joinToken_key" ON "Organization"("joinToken");
