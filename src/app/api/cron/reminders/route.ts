import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { HOUSEHOLD_TIME_ZONE, todayInHousehold } from "@/lib/schedule";
import { buildDigests, digestMessage } from "@/server/reminder-digest";
import { pushConfigured, sendToUser } from "@/server/push";
import { buildStatementPushes, markStatementsPushed, statementMessage } from "@/server/statement-push";

/** The hour of the day, in the household's time zone, at which reminders go out. */
const SEND_HOUR = 10;

export const dynamic = "force-dynamic";

/**
 * Called by Vercel Cron (see vercel.json). Cron times are fixed in UTC, so it is
 * scheduled for both 08:00 and 09:00 UTC and only the run that lands in the
 * 10:00 hour in Amsterdam does anything — which keeps it at 10:00 through the
 * summer/winter clock change. `?force=1` skips the hour check (with the
 * secret), and `?dry=1` reports who would be told without sending anything. It also tells each Member
 * whose account is due a statement, 90 days after the last one (ADR 0011).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";
  const dry = url.searchParams.get("dry") === "1";

  const hour = Number(
    new Date().toLocaleString("en-GB", { timeZone: HOUSEHOLD_TIME_ZONE, hour: "2-digit", hour12: false }),
  );
  if (!force && hour !== SEND_HOUR) return NextResponse.json({ skipped: `it is ${hour}:00 in Amsterdam, not ${SEND_HOUR}:00` });
  if (!pushConfigured()) return NextResponse.json({ error: "Push keys are not configured" }, { status: 500 });

  const today = todayInHousehold();
  const digests = await buildDigests(prisma, today);
  const { byUser: statements, cycles } = await buildStatementPushes(prisma, today);

  if (dry) {
    return NextResponse.json({
      dryRun: true,
      date: today.toISOString().slice(0, 10),
      people: [...digests.entries()].map(([userId, d]) => ({ userId, ...d })),
      statements: [...statements.entries()].map(([userId, accounts]) => ({ userId, accounts: accounts.map((a) => a.accountName) })),
    });
  }

  // Once per day, even if the job is retried or both schedule slots fire.
  try {
    await prisma.notificationRun.create({ data: { date: today } });
  } catch {
    if (!force) return NextResponse.json({ skipped: "already sent today" });
  }

  let people = 0;
  let devices = 0;
  for (const [userId, digest] of digests) {
    const reached = await sendToUser(prisma, userId, digestMessage(digest));
    if (reached > 0) people += 1;
    devices += reached;
  }
  // The same once-a-day guard above covers this, so a retried run never sends it twice.
  let statementPeople = 0;
  for (const [userId, accounts] of statements) {
    const reached = await sendToUser(prisma, userId, statementMessage(accounts));
    if (reached > 0) statementPeople += 1;
    devices += reached;
  }
  // Each cycle is pushed once: later days only show it in the Inbox.
  await markStatementsPushed(prisma, cycles);
  return NextResponse.json({ sent: true, people, statementPeople, devices });
}
