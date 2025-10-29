-- CreateTable
CREATE TABLE "Mindmap" (
    "id" TEXT NOT NULL,
    "transcriptionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mindmap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Mindmap_transcriptionId_key" ON "Mindmap"("transcriptionId");

-- CreateIndex
CREATE INDEX "Mindmap_transcriptionId_idx" ON "Mindmap"("transcriptionId");

-- CreateIndex
CREATE INDEX "Mindmap_status_idx" ON "Mindmap"("status");

-- AddForeignKey
ALTER TABLE "Mindmap" ADD CONSTRAINT "Mindmap_transcriptionId_fkey" FOREIGN KEY ("transcriptionId") REFERENCES "Transcription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
