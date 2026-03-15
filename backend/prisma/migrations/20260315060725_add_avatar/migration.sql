-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarKey" TEXT;

-- CreateIndex
CREATE INDEX "VideoAction_actionType_idx" ON "VideoAction"("actionType");
