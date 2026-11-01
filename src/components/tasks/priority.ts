import type { TaskPriority } from "@/components/tasks/types";

export const PRIORITIES: { value: TaskPriority; label: string; dot: string }[] = [
  { value: "HIGH", label: "High", dot: "#e5484d" },
  { value: "MEDIUM", label: "Medium", dot: "#e0b04d" },
  { value: "LOW", label: "Low", dot: "#9a9da5" },
];

export const PRIORITY_ORDER: Record<TaskPriority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
