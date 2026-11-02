import type { ScheduleMode, ScheduleUnit } from "@/lib/schedule";

export type ReminderData = {
  id: string;
  title: string;
  ownerId: string | null;
  intervalCount: number;
  intervalUnit: ScheduleUnit;
  mode: ScheduleMode;
  nextDueDate: Date | string;
  completions: {
    id: string;
    completedAt: Date | string;
    completedBy: { id: string; name: string | null; email: string } | null;
  }[];
};

export type ReminderPatch = {
  title?: string;
  ownerId?: string | null;
  intervalCount?: number;
  intervalUnit?: ScheduleUnit;
  mode?: ScheduleMode;
};
