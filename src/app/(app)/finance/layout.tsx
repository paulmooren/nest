import { ModuleGate } from "@/components/use-modules";

export const metadata = { title: "Finance" };

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return <ModuleGate module="finance">{children}</ModuleGate>;
}
