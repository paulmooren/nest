-- AlterTable
ALTER TABLE "titles" ADD COLUMN "season" INTEGER,
ADD COLUMN "episode" INTEGER;

-- CreateTable
CREATE TABLE "link_imports" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "link_imports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "link_imports_userId_createdAt_idx" ON "link_imports"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "link_imports" ADD CONSTRAINT "link_imports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
