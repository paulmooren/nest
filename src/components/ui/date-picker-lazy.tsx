"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

import type { DatePicker as DatePickerType } from "@/components/ui/date-picker";

/**
 * The date picker, with its calendar library (react-day-picker) fetched when one first appears instead of with the
 * page. Same props as `DatePicker`; the placeholder is about the size of the closed field.
 */
export const DatePicker = dynamic(() => import("@/components/ui/date-picker").then((m) => m.DatePicker), {
  loading: () => <span className="inline-block h-6 w-28 rounded-md border border-border-soft bg-surface" aria-hidden />,
}) as (props: ComponentProps<typeof DatePickerType>) => React.ReactNode;
