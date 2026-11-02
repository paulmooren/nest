"use client";

import { useState } from "react";

import { useDelayed } from "@/components/use-delayed";
import { trpc } from "@/trpc/react";
import { useRefresh } from "@/trpc/optimistic";
import { useHouseholdSettingsActions } from "@/components/settings/use-settings";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { PageBody } from "@/components/ui/page-header";
import { Row, RowList } from "@/components/ui/row";
import { Section } from "@/components/ui/section";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { TextField } from "@/components/ui/text-field";
import { MODULES, isModuleEnabled } from "@/lib/modules";
import { useConfirm } from "@/components/confirm-dialog";

export default function HouseholdSettingsPage() {
  const confirm = useConfirm();
  const refresh = useRefresh();
  const { data: me } = trpc.user.me.useQuery();
  const { data: household } = trpc.household.current.useQuery();
  const settings = useHouseholdSettingsActions();
  // A new invite code is made by the server, so this one waits (the button shows it).
  const regenerateInvite = trpc.household.regenerateInvite.useMutation({
    onSuccess: () => refresh("household.current"),
  });
  const [name, setName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const showSkeleton = useDelayed(household === undefined);
  const value = name ?? household?.name ?? "";
  const dirty = !!household && value.trim() !== "" && value.trim() !== household.name;

  async function copyInviteLink() {
    if (!household?.inviteCode) return;
    await navigator.clipboard.writeText(`${window.location.origin}/household-setup?join=${household.inviteCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (household === undefined) {
    return showSkeleton ? (
      <div role="status" aria-busy="true" className="flex flex-col gap-4">
        <span className="sr-only">Loading…</span>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    ) : null;
  }
  if (!household) return null;

  return (
    <PageBody className="gap-10">
      <Section label="Household name">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (dirty) {
              settings.rename({ name: value.trim() });
              setName(null);
            }
          }}
        >
          <TextField label="Household name" value={value} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" disabled={!dirty} className="self-start">
            Update
          </Button>
        </form>
      </Section>

      <Section
        title="Modules"
        description="Choose what your household uses. Switching something off only hides it — nothing is deleted."
      >
        <RowList>
          {MODULES.map((m) => (
            <Row
              key={m.key}
              title={m.label}
              meta={m.description}
              wrapMeta
              trailing={
                <Switch
                  aria-label={m.label}
                  checked={isModuleEnabled(household.disabledModules ?? [], m.key)}
                  onCheckedChange={(enabled) => settings.setModuleEnabled({ key: m.key, enabled })}
                />
              }
            />
          ))}
        </RowList>
      </Section>

      <Section title="Members">
        <RowList>
          {household.members.map((m) => (
            <Row
              key={m.user.id}
              leading={<Avatar name={m.user.name || m.user.email} image={m.user.image} size={32} />}
              title={m.user.name || m.user.email}
              trailing={m.user.id === me?.id ? <span className="text-sm text-muted-foreground">You</span> : undefined}
            />
          ))}
        </RowList>
      </Section>

      {household.inviteCode && (
        <Section title="Invite link" description="Share it with someone you want in your household. A new link replaces the old one.">
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-h-11 flex-1 rounded-xl border bg-muted px-3.5 py-3 text-sm tracking-[0.06em]">
              {household.inviteCode}
            </code>
            <Button variant="outline" onClick={copyInviteLink}>
              {copied ? "Copied!" : "Copy link"}
            </Button>
            <Button
              variant="ghost"
              onClick={async () => {
                if (
                  await confirm({
                    title: "Regenerate the invite link?",
                    description: "The current one will stop working.",
                    confirmLabel: "Regenerate",
                  })
                )
                  regenerateInvite.mutate();
              }}
            >
              Regenerate
            </Button>
          </div>
        </Section>
      )}
    </PageBody>
  );
}
