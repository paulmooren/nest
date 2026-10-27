-- CreateTable
CREATE TABLE "vault_categories" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isFallback" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vault_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vault_attachments" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vault_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vault_categories_householdId_name_key" ON "vault_categories"("householdId", "name");
CREATE INDEX "vault_attachments_entryId_idx" ON "vault_attachments"("entryId");

-- AddForeignKey
ALTER TABLE "vault_categories" ADD CONSTRAINT "vault_categories_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vault_attachments" ADD CONSTRAINT "vault_attachments_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "vault_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Every Household starts with the old fixed categories plus Documents, Taxes and Warranty.
INSERT INTO "vault_categories" ("id", "householdId", "name", "position", "isFallback")
SELECT gen_random_uuid()::text, h."id", c."name", c."position", c."name" = 'Other'
FROM "households" h
CROSS JOIN (VALUES
  ('ID', 0), ('Insurance', 1), ('Bank', 2), ('Utility', 3), ('Vehicle', 4),
  ('Documents', 5), ('Taxes', 6), ('Warranty', 7), ('Other', 8)
) AS c("name", "position");

-- Entries: point at their category (unknown names fall back to Other), keep the main date's label.
ALTER TABLE "vault_entries" ADD COLUMN "categoryId" TEXT,
ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "expiryLabel" TEXT;

UPDATE "vault_entries" e
SET "categoryId" = COALESCE(
  (SELECT vc."id" FROM "vault_categories" vc WHERE vc."householdId" = e."householdId" AND vc."name" = e."category"),
  (SELECT vc."id" FROM "vault_categories" vc WHERE vc."householdId" = e."householdId" AND vc."isFallback")
);

-- Everything stored so far was encrypted, so every existing Field becomes a Secret.
UPDATE "vault_entries"
SET "fields" = COALESCE(
  (SELECT jsonb_agg(jsonb_build_object('label', f->>'label', 'kind', 'secret', 'value', f->>'value'))
   FROM jsonb_array_elements("fields") AS f),
  '[]'::jsonb
);

ALTER TABLE "vault_entries" ALTER COLUMN "categoryId" SET NOT NULL;
ALTER TABLE "vault_entries" DROP COLUMN "category";

CREATE INDEX "vault_entries_categoryId_idx" ON "vault_entries"("categoryId");
ALTER TABLE "vault_entries" ADD CONSTRAINT "vault_entries_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "vault_categories"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
