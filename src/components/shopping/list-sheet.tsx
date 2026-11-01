"use client";

import { useState } from "react";

import { Button } from "@/components/ds/button";
import { ChoiceChips } from "@/components/ds/choice-chips";
import { Field } from "@/components/ds/field";
import { ResponsiveSheet } from "@/components/ds/responsive-sheet";
import { TextField } from "@/components/ds/text-field";

/** Make a new list: a name, and whether the household shares it or it stays private to you. */
export function NewListSheet({ onCreate, onClose }: { onCreate: (name: string, shared: boolean) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [shared, setShared] = useState(true);

  return (
    <ResponsiveSheet open onOpenChange={(open) => !open && onClose()} title="New list">
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          onCreate(name.trim(), shared);
          onClose();
        }}
      >
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="e.g. Pharmacy" autoFocus />
        <Field id="list-visibility" label="Who sees it">
          <ChoiceChips
            label="Who sees it"
            value={shared ? "shared" : "private"}
            onChange={(v) => setShared(v === "shared")}
            options={[
              { value: "shared", label: "Everyone in the household" },
              { value: "private", label: "Only me" },
            ]}
          />
        </Field>
        <Button type="submit" size="lg" disabled={!name.trim()}>
          Create list
        </Button>
      </form>
    </ResponsiveSheet>
  );
}

/** Rename or delete the list on screen. */
export function ListSettingsSheet({
  list,
  onRename,
  onDelete,
  onClose,
}: {
  list: { id: string; name: string; ownerId: string | null };
  onRename: (name: string) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(list.name);
  const close = () => {
    const next = name.trim();
    if (next && next !== list.name) onRename(next);
    onClose();
  };

  return (
    <ResponsiveSheet
      open
      onOpenChange={(open) => !open && close()}
      title="List settings"
      description={list.ownerId === null ? "Shared — everyone in your household." : "Private — only you."}
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          close();
        }}
      >
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        <div className="flex gap-2">
          <Button type="submit" size="lg" className="flex-1">
            Done
          </Button>
          <Button type="button" variant="outline" size="lg" className="text-destructive" onClick={onDelete}>
            Delete list
          </Button>
        </div>
      </form>
    </ResponsiveSheet>
  );
}
