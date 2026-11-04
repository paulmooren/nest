import { addInterval, daysBetween, todayInHousehold } from "@/lib/schedule";

/** A statement is asked for every 90 days (ADR 0011). */
export const STATEMENT_INTERVAL_DAYS = 90;

/**
 * Where an account's next statement starts: the day of its last import (an import covers up to the day before it),
 * or the day the account was made when nothing was imported yet. Date-only values, as UTC midnight.
 */
export function statementStart(account: { lastImportedOn: Date | null; createdAt: Date }): Date {
  return account.lastImportedOn ?? todayInHousehold(account.createdAt);
}

/**
 * The statement an account is due for, or null while its 90 days are not up. It runs from `from` to `to`, the last
 * full day (yesterday); the longer the wait, the longer the range. `dueOn` is when the 90 days ran out.
 */
export function statementDue(
  account: { lastImportedOn: Date | null; createdAt: Date },
  today: Date,
): { from: Date; to: Date; dueOn: Date } | null {
  const from = statementStart(account);
  const dueOn = addInterval(from, STATEMENT_INTERVAL_DAYS, "DAY");
  if (daysBetween(dueOn, today) < 0) return null;
  return { from, to: addInterval(today, -1, "DAY"), dueOn };
}

const day = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** "3 Aug – 31 Oct". */
export function statementRange(from: Date, to: Date): string {
  return `${day(from)} – ${day(to)}`;
}
