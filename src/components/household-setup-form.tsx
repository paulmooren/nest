"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { trpc } from "@/trpc/react";
import { AuthHeader, AuthNotice } from "@/components/ui/auth-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Mode = "create" | "join";

export function HouseholdSetupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillCode = searchParams.get("join") ?? "";
  const [mode, setMode] = useState<Mode>(prefillCode ? "join" : "create");

  const utils = trpc.useUtils();
  const done = () => {
    // Everything loaded so far belongs to a Member without a household.
    void utils.invalidate();
    router.refresh();
    router.push("/today");
  };
  const create = trpc.household.create.useMutation({ onSuccess: done });
  const join = trpc.household.join.useMutation({ onSuccess: done });

  const pending = create.isPending || join.isPending;
  const error = create.error?.message ?? join.error?.message;

  return (
    <div className="w-full">
      <AuthHeader
        eyebrow="Household setup"
        title="Set up your household"
        description="Every account belongs to a household — create a new one, or join one you've been invited to."
      />

      <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="mb-5">
        <TabsList className="h-12 w-full">
          <TabsTrigger value="create" className="h-full">
            Create household
          </TabsTrigger>
          <TabsTrigger value="join" className="h-full">
            Join with code
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {error && <AuthNotice tone="error">{error}</AuthNotice>}

      {mode === "create" ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            create.mutate({ name: String(form.get("name")) });
          }}
        >
          <Input
            name="name"
            aria-label="Household name"
            required
            placeholder="e.g. The Mooren Household"
            className="h-12 rounded-xl"
          />
          <Button type="submit" size="lg" disabled={pending} className="w-full rounded-xl font-semibold">
            {create.isPending ? "Creating…" : "Create household"}
          </Button>
        </form>
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            join.mutate({ code: String(form.get("code")) });
          }}
        >
          <Input
            name="code"
            aria-label="Invite code"
            required
            defaultValue={prefillCode}
            placeholder="Invite code"
            autoCapitalize="characters"
            autoComplete="off"
            className="h-12 rounded-xl tracking-[0.08em] uppercase placeholder:tracking-normal placeholder:normal-case"
          />
          <Button type="submit" size="lg" disabled={pending} className="w-full rounded-xl font-semibold">
            {join.isPending ? "Joining…" : "Join household"}
          </Button>
        </form>
      )}
    </div>
  );
}
