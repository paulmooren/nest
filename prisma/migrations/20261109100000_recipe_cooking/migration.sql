-- AlterTable
ALTER TABLE "recipes" ADD COLUMN "totalMinutes" INTEGER,
ADD COLUMN "imageUrl" TEXT,
ADD COLUMN "cookedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastCookedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "planned_meals" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "planned_meals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "planned_meals_householdId_day_idx" ON "planned_meals"("householdId", "day");

-- AddForeignKey
ALTER TABLE "planned_meals" ADD CONSTRAINT "planned_meals_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_meals" ADD CONSTRAINT "planned_meals_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
