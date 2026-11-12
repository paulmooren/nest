-- AlterTable
ALTER TABLE "planned_meals" ALTER COLUMN "recipeId" DROP NOT NULL,
ADD COLUMN "name" TEXT;
