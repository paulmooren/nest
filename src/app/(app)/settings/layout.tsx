import { SettingsFrame } from "@/components/settings/settings-frame";
import { settingsSections } from "@/components/settings/sections";
import { isDemoServer } from "@/lib/demo";

export const metadata = { title: "Settings" };

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <SettingsFrame sections={settingsSections(isDemoServer())}>{children}</SettingsFrame>;
}
