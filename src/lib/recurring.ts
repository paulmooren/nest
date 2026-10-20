import { addInterval, type ScheduleUnit } from "@/lib/schedule";

/** What a payment on this schedule comes to per month. */
export function monthlyEquivalent(amount: number, count: number, unit: ScheduleUnit): number {
  const n = Math.max(1, count);
  switch (unit) {
    case "DAY":
      return (amount * 365) / 12 / n;
    case "WEEK":
      return (amount * 52) / 12 / n;
    case "YEAR":
      return amount / 12 / n;
    case "MONTH":
    default:
      return amount / n;
  }
}

export function nextOccurrence(from: Date, count: number, unit: ScheduleUnit): Date {
  return addInterval(from, Math.max(1, count), unit);
}

/**
 * The payment date that makes `next` the next one due: one interval earlier. A month step cannot always undo
 * itself (29–31 into a shorter month), so a next date on those days can come back a few days early.
 */
export function previousOccurrence(next: Date, count: number, unit: ScheduleUnit): Date {
  return addInterval(next, -Math.max(1, count), unit);
}
