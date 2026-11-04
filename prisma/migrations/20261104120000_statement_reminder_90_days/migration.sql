-- AlterTable
ALTER TABLE "financial_accounts" ADD COLUMN "lastImportedOn" DATE,
ADD COLUMN "statementPushedFor" DATE;

-- Existing accounts start their 90 days at the day after their newest transaction (never in the future).
-- An account with no transactions stays null and counts from its creation day.
UPDATE "financial_accounts" a
SET "lastImportedOn" = LEAST(t.newest + 1, CURRENT_DATE)
FROM (
  SELECT account_id, MAX(d) AS newest
  FROM (
    SELECT "accountId" AS account_id, "date"::date AS d FROM "transactions"
    UNION ALL
    SELECT "transferToAccountId" AS account_id, "date"::date AS d FROM "transactions" WHERE "transferToAccountId" IS NOT NULL
  ) x
  GROUP BY account_id
) t
WHERE t.account_id = a."id";
