ALTER TABLE "Organization" ADD COLUMN "privateJoinToken" TEXT;

UPDATE "Organization"
SET "privateJoinToken" = md5(random()::text || clock_timestamp()::text || id::text || 'private')
WHERE "privateJoinToken" IS NULL;

ALTER TABLE "Organization" ALTER COLUMN "privateJoinToken" SET NOT NULL;

CREATE UNIQUE INDEX "Organization_privateJoinToken_key" ON "Organization"("privateJoinToken");
