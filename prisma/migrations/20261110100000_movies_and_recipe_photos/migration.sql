-- AlterTable
ALTER TABLE "recipes" ADD COLUMN "photoKey" TEXT;

-- CreateEnum
CREATE TYPE "TitleKind" AS ENUM ('MOVIE', 'SERIES');

-- CreateEnum
CREATE TYPE "TitleStatus" AS ENUM ('WANT', 'WATCHING', 'WATCHED');

-- CreateTable
CREATE TABLE "watchlists" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "ownerId" TEXT,
    "visibleToHousehold" BOOLEAN NOT NULL DEFAULT true,
    "isStarter" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watchlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "titles" (
    "id" TEXT NOT NULL,
    "watchlistId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "TitleKind" NOT NULL DEFAULT 'MOVIE',
    "status" "TitleStatus" NOT NULL DEFAULT 'WANT',
    "year" INTEGER,
    "runtimeMinutes" INTEGER,
    "overview" TEXT,
    "posterUrl" TEXT,
    "tmdbId" INTEGER,
    "watchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "titles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "title_ratings" (
    "id" TEXT NOT NULL,
    "titleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "halfStars" INTEGER,
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "title_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "watchlists_householdId_idx" ON "watchlists"("householdId");

-- CreateIndex
CREATE INDEX "titles_watchlistId_idx" ON "titles"("watchlistId");

-- CreateIndex
CREATE UNIQUE INDEX "title_ratings_titleId_userId_key" ON "title_ratings"("titleId", "userId");

-- AddForeignKey
ALTER TABLE "watchlists" ADD CONSTRAINT "watchlists_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlists" ADD CONSTRAINT "watchlists_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "titles" ADD CONSTRAINT "titles_watchlistId_fkey" FOREIGN KEY ("watchlistId") REFERENCES "watchlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "title_ratings" ADD CONSTRAINT "title_ratings_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "titles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "title_ratings" ADD CONSTRAINT "title_ratings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
