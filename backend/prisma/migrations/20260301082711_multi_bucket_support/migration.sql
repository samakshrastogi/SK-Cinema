/*
  Warnings:

  - Added the required column `name` to the `S3Credential` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "S3Credential_userId_key";

-- AlterTable
ALTER TABLE "S3Credential" ADD COLUMN     "name" TEXT NOT NULL;
