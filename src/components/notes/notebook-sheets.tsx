"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Field } from "@/components/ui/field";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { Switch } from "@/components/ui/switch";
import { TextField } from "@/components/ui/text-field";

/** Make a new Notebook: a name, and whether the household shares it or it stays yours. */
export function NewNotebookSheet({ onCreate, onClose }: { onCreate: (name: string, shared: boolean) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [shared, setShared] = useState(false);

  return (
    <ResponsiveSheet open onOpenChange={(open) => !open && onClose()} title="New notebook">
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          onCreate(name.trim(), shared);
          onClose();
        }}
      >
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="e.g. Review 2026" autoFocus />
        <Field id="notebook-owner" label="Who edits it">
          <ChoiceChips
            label="Who edits it"
            value={shared ? "shared" : "personal"}
            onChange={(v) => setShared(v === "shared")}
            options={[
              { value: "personal", label: "Only me" },
              { value: "shared", label: "Everyone in the household" },
            ]}
          />
        </Field>
        <Button type="submit" size="lg" disabled={!name.trim()}>
          Create notebook
        </Button>
      </form>
    </ResponsiveSheet>
  );
}

/** Rename, show to the household, or delete the Notebook on screen. */
export function NotebookSettingsSheet({
  notebook,
  mine,
  multiMember,
  onRename,
  onVisibility,
  onDelete,
  onClose,
}: {
  notebook: { id: string; name: string; ownerId: string | null; visibleToHousehold: boolean; isStarter: boolean; noteCount: number };
  /** Shared, or yours — only then can it be changed. */
  mine: boolean;
  multiMember: boolean;
  onRename: (name: string) => void;
  onVisibility: (visible: boolean) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(notebook.name);
  const [visible, setVisible] = useState(notebook.visibleToHousehold);
  const close = () => {
    const next = name.trim();
    if (mine && next && next !== notebook.name) onRename(next);
    onClose();
  };

  return (
    <ResponsiveSheet
      open
      onOpenChange={(open) => !open && close()}
      title="Notebook settings"
      description={notebook.ownerId === null ? "Shared — everyone in your household can edit it." : "Personal — only its owner can edit it."}
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          close();
        }}
      >
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} disabled={!mine} />
        {mine && notebook.ownerId !== null && multiMember && (
          <label className="flex min-h-11 items-center gap-3 text-base md:text-sm">
            <Switch
              checked={visible}
              onCheckedChange={(v) => {
                setVisible(v);
                onVisibility(v);
              }}
              aria-label="Visible to household"
            />
            Visible to household (read-only)
          </label>
        )}
        <div className="flex gap-2">
          <Button type="submit" size="lg" className="flex-1">
            Done
          </Button>
          {mine && !notebook.isStarter && (
            <Button type="button" variant="outline" size="lg" className="text-destructive" onClick={onDelete}>
              Delete notebook
            </Button>
          )}
        </div>
      </form>
    </ResponsiveSheet>
  );
}
