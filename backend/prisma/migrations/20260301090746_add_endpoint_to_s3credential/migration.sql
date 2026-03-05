-- AlterTable
ALTER TABLE "S3Credential" ADD COLUMN     "endpoint" TEXT,
ALTER COLUMN "region" DROP NOT NULL;
