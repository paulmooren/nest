import { z } from "zod";

import { createTRPCRouter, householdProcedure, protectedProcedure } from "@/server/api/trpc";
import { inboxItems } from "@/server/api/routers/inbox";
import { pushConfigured, sendToUser } from "@/server/push";

export const notificationRouter = createTRPCRouter({
  /** Whether the server can send pushes at all, and how many of your devices have them on. */
  status: protectedProcedure.query(async ({ ctx }) => ({
    configured: pushConfigured(),
    devices: await ctx.prisma.pushSubscription.count({ where: { userId: ctx.userId } }),
  })),

  /** Registers this phone/browser. The same device switching on again just refreshes it. */
  subscribe: protectedProcedure
    .input(
      z.object({
        endpoint: z.string().url().max(2000),
        p256dh: z.string().max(300),
        auth: z.string().max(100),
        userAgent: z.string().max(300).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.pushSubscription.upsert({
        where: { endpoint: input.endpoint },
        create: { ...input, userId: ctx.userId },
        update: { userId: ctx.userId, p256dh: input.p256dh, auth: input.auth, userAgent: input.userAgent },
      });
      return { success: true };
    }),

  unsubscribe: protectedProcedure
    .input(z.object({ endpoint: z.string().max(2000) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.pushSubscription.deleteMany({ where: { endpoint: input.endpoint, userId: ctx.userId } });
      return { success: true };
    }),

  /** Earlier: the Notifications sent to you, newest first (ADR 0012). */
  earlier: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.notification.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, title: true, body: true, url: true, createdAt: true, readAt: true },
    }),
  ),

  /** Marks everything in Earlier read: called when the Notification centre closes. */
  markEarlierRead: protectedProcedure.mutation(async ({ ctx }) => {
    const { count } = await ctx.prisma.notification.updateMany({
      where: { userId: ctx.userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { marked: count };
  }),

  /** The bell's number: Inbox items plus unread entries in Earlier. */
  badge: householdProcedure.query(async ({ ctx }) => {
    const [inbox, unread] = await Promise.all([
      inboxItems(ctx),
      ctx.prisma.notification.count({ where: { userId: ctx.userId, readAt: null } }),
    ]);
    return { inbox: inbox.length, unread, total: inbox.length + unread };
  }),

  /** Sends one notification to all of your devices, so you can check it works. */
  sendTest: protectedProcedure.mutation(async ({ ctx }) => {
    const sent = await sendToUser(ctx.prisma, ctx.userId, {
      title: "Nest",
      body: "Notifications are working — you'll hear about reminders here.",
      url: "/settings/notifications",
    });
    return { sent };
  }),
});
