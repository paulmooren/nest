import { ModuleGate } from "@/components/use-modules";
import { TasksTabs } from "@/components/tasks/tasks-tabs";

export default function TasksLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleGate module="tasks">
      <TasksTabs>{children}</TasksTabs>
    </ModuleGate>
  );
}
