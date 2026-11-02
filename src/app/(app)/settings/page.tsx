import { SettingsIndex } from "@/components/settings/settings-frame";
import { settingsSections } from "@/components/settings/sections";
import { isDemoServer } from "@/lib/demo";

export default function SettingsPage() {
  return <SettingsIndex sections={settingsSections(isDemoServer())} />;
}
