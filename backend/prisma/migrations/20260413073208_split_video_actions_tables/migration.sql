/*
  Warnings:

  - The values [EXTERNAL] on the enum `ShareMethod` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ShareMethod_new" AS ENUM ('COPY_LINK', 'NATIVE', 'WHATSAPP', 'TELEGRAM', 'X', 'FACEBOOK', 'LINKEDIN', 'EMAIL');
ALTER TABLE "public"."VideoShare" ALTER COLUMN "method" DROP DEFAULT;
ALTER TABLE "VideoShare" ALTER COLUMN "method" TYPE "ShareMethod_new" USING ("method"::text::"ShareMethod_new");
ALTER TYPE "ShareMethod" RENAME TO "ShareMethod_old";
ALTER TYPE "ShareMethod_new" RENAME TO "ShareMethod";
DROP TYPE "public"."ShareMethod_old";
ALTER TABLE "VideoShare" ALTER COLUMN "method" SET DEFAULT 'COPY_LINK';
COMMIT;
