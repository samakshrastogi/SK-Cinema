-- DropForeignKey
ALTER TABLE "VideoAI" DROP CONSTRAINT "VideoAI_videoId_fkey";

-- AlterTable
ALTER TABLE "VideoAI" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending';

-- AddForeignKey
ALTER TABLE "VideoAI" ADD CONSTRAINT "VideoAI_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
