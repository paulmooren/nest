"use client";

import { useState } from "react";

import { IS_DEMO_CLIENT } from "@/lib/demo";
import { useDelayed } from "@/components/use-delayed";
import { trpc } from "@/trpc/react";
import { useRefresh } from "@/trpc/optimistic";
import { useProfileActions } from "@/components/settings/use-settings";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ds/button";
import { Section } from "@/components/ds/section";
import { Skeleton } from "@/components/ds/skeleton";
import { TextField } from "@/components/ds/text-field";
import { PageBody } from "@/components/ds/page-header";
import { fileToAvatarDataUrl } from "@/lib/image";
import { signOutAction } from "../actions";

export default function ProfileSettingsPage() {
  const { data: me } = trpc.user.me.useQuery();
  const showSkeleton = useDelayed(me === undefined);
  if (me === undefined) return showSkeleton ? <FormBones /> : null;

  return (
    <PageBody className="gap-10">
      <ProfileSection />
      {/* The Demo has no real passwords to change. */}
      {!IS_DEMO_CLIENT && <SecuritySection />}
      <Section title="Session">
        <form action={signOutAction}>
          <Button type="submit" variant="outline" className="text-destructive">
            Sign out
          </Button>
        </form>
      </Section>
    </PageBody>
  );
}

function FormBones() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-4">
      <span className="sr-only">Loading…</span>
      <Skeleton className="size-16 rounded-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

function ProfileSection() {
  const { data: me } = trpc.user.me.useQuery();
  const profile = useProfileActions();
  const [name, setName] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const value = name ?? me?.name ?? "";
  const dirty = !!me && value.trim() !== "" && value.trim() !== (me.name ?? "");

  return (
    <Section label="Profile">
      <div className="flex items-center gap-4">
        <Avatar name={me?.name || me?.email || ""} image={me?.image} size={64} />
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" render={<label />} nativeButton={false} className="cursor-pointer">
            {me?.image ? "Change picture" : "Upload picture"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                try {
                  setImageError(false);
                  profile.updateAvatar({ image: await fileToAvatarDataUrl(file) });
                } catch {
                  setImageError(true);
                }
              }}
            />
          </Button>
          {me?.image && (
            <Button type="button" variant="ghost" onClick={() => profile.updateAvatar({ image: null })}>
              Remove
            </Button>
          )}
        </div>
      </div>
      {imageError && (
        <p role="alert" className="text-sm text-destructive">
          Couldn&apos;t read that image — try a JPG or PNG.
        </p>
      )}

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!dirty) return;
          profile.updateName({ name: value.trim() });
          setName(null);
        }}
      >
        <TextField
          label="Name"
          value={value}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="Your name"
          autoComplete="name"
        />
        <TextField label="Email" value={me?.email ?? ""} disabled readOnly />
        <Button type="submit" disabled={!dirty} className="self-start">
          Update
        </Button>
      </form>
    </Section>
  );
}

function SecuritySection() {
  const refresh = useRefresh();
  const { data: me } = trpc.user.me.useQuery();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const changePassword = trpc.user.changePassword.useMutation({
    onSuccess: () => {
      refresh("user.me");
      setCurrent("");
      setNext("");
      setConfirm("");
      setMessage({ text: "Password updated.", ok: true });
    },
    onError: (err) => setMessage({ text: err.message, ok: false }),
  });

  const hasPassword = me?.hasPassword ?? false;
  const mismatch = confirm.length > 0 && next !== confirm;
  const ready = next.length >= 8 && next === confirm && (!hasPassword || current.length > 0);
  const type = show ? "text" : "password";

  return (
    <Section
      title="Security"
      description={
        me && !hasPassword
          ? "You sign in with Google. Set a password if you also want to sign in with your email."
          : undefined
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!ready) return;
          setMessage(null);
          changePassword.mutate({
            currentPassword: hasPassword ? current : undefined,
            newPassword: next,
          });
        }}
      >
        {hasPassword && (
          <TextField
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        )}
        <TextField
          label="New password"
          type={type}
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          hint="At least 8 characters."
        />
        <TextField
          label="Confirm new password"
          type={type}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={mismatch ? "Passwords don't match." : undefined}
        />
        <Button type="button" variant="ghost" onClick={() => setShow((s) => !s)} className="self-start" aria-pressed={show}>
          {show ? "Hide passwords" : "Show passwords"}
        </Button>
        {message && (
          <p role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-success" : "text-destructive"}`}>
            {message.text}
          </p>
        )}
        <Button type="submit" disabled={!ready || changePassword.isPending} className="self-start">
          {hasPassword ? "Update" : "Set password"}
        </Button>
      </form>
    </Section>
  );
}
