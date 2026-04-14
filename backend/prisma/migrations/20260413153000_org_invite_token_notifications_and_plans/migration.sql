-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('GENERAL', 'ORG_INVITE', 'ORG_APPROVED', 'VIDEO');

-- Normalize legacy Organization.subscriptionPlan values before enum replacement
UPDATE "Organization"
SET "subscriptionPlan" = 'SIX_MONTH'
WHERE "subscriptionPlan"::text = 'MONTHLY';

-- AlterEnum
BEGIN;
CREATE TYPE "OrganizationSubscriptionPlan_new" AS ENUM ('NONE', 'TRIAL_FREE', 'SIX_MONTH', 'YEARLY_INITIAL', 'YEARLY_RENEWAL');
ALTER TABLE "public"."Organization" ALTER COLUMN "subscriptionPlan" DROP DEFAULT;
ALTER TABLE "Organization" ALTER COLUMN "subscriptionPlan" TYPE "OrganizationSubscriptionPlan_new" USING ("subscriptionPlan"::text::"OrganizationSubscriptionPlan_new");
ALTER TYPE "OrganizationSubscriptionPlan" RENAME TO "OrganizationSubscriptionPlan_old";
ALTER TYPE "OrganizationSubscriptionPlan_new" RENAME TO "OrganizationSubscriptionPlan";
DROP TYPE "public"."OrganizationSubscriptionPlan_old";
ALTER TABLE "Organization" ALTER COLUMN "subscriptionPlan" SET DEFAULT 'NONE';
COMMIT;

-- Add OrganizationInvite columns as nullable first for backfill
ALTER TABLE "OrganizationInvite"
ADD COLUMN "expiresAt" TIMESTAMP(3),
ADD COLUMN "token" TEXT;

-- Backfill existing rows
UPDATE "OrganizationInvite"
SET
  "expiresAt" = COALESCE("expiresAt", "createdAt" + INTERVAL '30 day'),
  "token" = COALESCE("token", md5(random()::text || clock_timestamp()::text || id::text));

-- Make required
ALTER TABLE "OrganizationInvite"
ALTER COLUMN "expiresAt" SET NOT NULL,
ALTER COLUMN "token" SET NOT NULL;

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "type" "NotificationType" NOT NULL DEFAULT 'GENERAL',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationInvite_token_key" ON "OrganizationInvite"("token");

-- CreateIndex
CREATE INDEX "OrganizationInvite_token_idx" ON "OrganizationInvite"("token");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
