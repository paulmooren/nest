import { ModuleGate } from "@/components/use-modules";

export const metadata = { title: "Tasks" };

export default function TasksLayout({ children }: { children: React.ReactNode }) {
  return <ModuleGate module="tasks">{children}</ModuleGate>;
}
