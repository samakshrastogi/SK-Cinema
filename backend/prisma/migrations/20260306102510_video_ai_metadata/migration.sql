-- CreateTable
CREATE TABLE "VideoAI" (
    "id" SERIAL NOT NULL,
    "videoId" INTEGER NOT NULL,
    "transcript" TEXT,
    "keywords" TEXT[],
    "tags" TEXT[],
    "aiTitle" TEXT,
    "aiDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoAI_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoAI_videoId_key" ON "VideoAI"("videoId");

-- AddForeignKey
ALTER TABLE "VideoAI" ADD CONSTRAINT "VideoAI_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
