export type SettingsSection = { href: string; label: string; description: string };

/** The pages of Settings, in order. The Demo has no push notifications. */
export function settingsSections(demo: boolean): SettingsSection[] {
  return [
    { href: "/settings/profile", label: "Profile", description: "Name, picture, password, sign out" },
    { href: "/settings/categories", label: "Categories", description: "The kinds of spending and income" },
    { href: "/settings/household", label: "Household", description: "Name, modules, members, invite link" },
    ...(demo
      ? []
      : [{ href: "/settings/notifications", label: "Notifications", description: "Daily reminders on your phone" }]),
    { href: "/settings/data", label: "Data", description: "Export everything you have stored" },
  ];
}
