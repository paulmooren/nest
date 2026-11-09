"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Field } from "@/components/ui/field";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TextField } from "@/components/ui/text-field";

/** The words for the two kinds of collection these sheets serve: a Cookbook of Recipes, a Watchlist of Titles. */
const WORDS = {
  cookbook: { one: "cookbook", example: "e.g. Baking", item: "recipe", items: "recipes" },
  watchlist: { one: "watchlist", example: "e.g. Christmas films", item: "title", items: "titles" },
} as const;
export type CollectionKind = keyof typeof WORDS;

/** Make a new Cookbook: a name, and whether the household shares it (the default) or it stays yours. */
export function NewCookbookSheet({
  kind = "cookbook",
  onCreate,
  onClose,
}: {
  kind?: CollectionKind;
  onCreate: (name: string, shared: boolean) => void;
  onClose: () => void;
}) {
  const w = WORDS[kind];
  const [name, setName] = useState("");
  const [shared, setShared] = useState(true);

  return (
    <ResponsiveSheet open onOpenChange={(open) => !open && onClose()} title={`New ${w.one}`}>
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          onCreate(name.trim(), shared);
          onClose();
        }}
      >
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder={w.example} autoFocus />
        <Field id="cookbook-owner" label="Who edits it">
          <ChoiceChips
            label="Who edits it"
            value={shared ? "shared" : "personal"}
            onChange={(v) => setShared(v === "shared")}
            options={[
              { value: "shared", label: "Everyone in the household" },
              { value: "personal", label: "Only me" },
            ]}
          />
        </Field>
        <Button type="submit" size="lg" disabled={!name.trim()}>
          Create {w.one}
        </Button>
      </form>
    </ResponsiveSheet>
  );
}

type SettingsCookbook = {
  id: string;
  name: string;
  ownerId: string | null;
  visibleToHousehold: boolean;
  isStarter: boolean;
  recipeCount: number;
};

/** Rename, show to the household, or delete the Cookbook on screen. */
export function CookbookSettingsSheet({
  kind = "cookbook",
  cookbook,
  mine,
  multiMember,
  onRename,
  onVisibility,
  onDelete,
  onClose,
}: {
  kind?: CollectionKind;
  cookbook: SettingsCookbook;
  /** Shared, or yours — only then can it be changed. */
  mine: boolean;
  multiMember: boolean;
  onRename: (name: string) => void;
  onVisibility: (visible: boolean) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const w = WORDS[kind];
  const [name, setName] = useState(cookbook.name);
  const [visible, setVisible] = useState(cookbook.visibleToHousehold);
  const canRename = mine && !cookbook.isStarter;
  const close = () => {
    const next = name.trim();
    if (canRename && next && next !== cookbook.name) onRename(next);
    onClose();
  };

  return (
    <ResponsiveSheet
      open
      onOpenChange={(open) => !open && close()}
      title={`${w.one.charAt(0).toUpperCase()}${w.one.slice(1)} settings`}
      description={cookbook.ownerId === null ? "Shared — everyone in your household can edit it." : "Personal — only its owner can edit it."}
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          close();
        }}
      >
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} disabled={!canRename} />
        {mine && cookbook.ownerId !== null && multiMember && (
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
          {mine && !cookbook.isStarter && (
            <Button type="button" variant="outline" size="lg" className="text-destructive" onClick={onDelete}>
              Delete {w.one}
            </Button>
          )}
        </div>
      </form>
    </ResponsiveSheet>
  );
}

/**
 * Asks what happens to a Cookbook's Recipes when it is deleted: move them to another Cookbook the Member can edit
 * (the starter by default) or delete them. Moving Personal Recipes into a Shared Cookbook is called out.
 */
export function DeleteCookbookSheet({
  kind = "cookbook",
  cookbook,
  destinations,
  onConfirm,
  onClose,
}: {
  kind?: CollectionKind;
  cookbook: SettingsCookbook;
  /** Cookbooks the Member can edit, other than this one. */
  destinations: { id: string; name: string; ownerId: string | null; isStarter: boolean }[];
  onConfirm: (moveTo: string | null) => Promise<unknown> | void;
  onClose: () => void;
}) {
  const w = WORDS[kind];
  const fallback = destinations.find((d) => d.isStarter) ?? destinations[0];
  const [choice, setChoice] = useState<string>(cookbook.recipeCount === 0 ? "delete" : (fallback?.id ?? "delete"));
  const [busy, setBusy] = useState(false);
  const target = destinations.find((d) => d.id === choice);
  const items = [
    ...destinations.map((d) => ({ value: d.id, label: `Move them to ${d.name}` })),
    { value: "delete", label: "Delete them too" },
  ];
  const exposes = !!target && cookbook.ownerId !== null && target.ownerId === null && cookbook.recipeCount > 0;

  return (
    <ResponsiveSheet open onOpenChange={(open) => !open && onClose()} title={`Delete "${cookbook.name}"?`}>
      <form
        className="flex flex-col gap-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await onConfirm(choice === "delete" ? null : choice);
            onClose();
          } finally {
            setBusy(false);
          }
        }}
      >
        {cookbook.recipeCount === 0 ? (
          <p className="text-sm text-muted-foreground">It has no {w.items}.</p>
        ) : (
          <>
            <Field
              id="delete-cookbook-choice"
              label={`What happens to its ${cookbook.recipeCount} ${cookbook.recipeCount === 1 ? w.item : w.items}?`}
            >
              <Select items={items} value={choice} onValueChange={(v) => v && setChoice(v)}>
                <SelectTrigger id="delete-cookbook-choice" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {items.map((i) => (
                    <SelectItem key={i.value} value={i.value}>
                      {i.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {exposes && (
              <p role="alert" className="text-sm text-destructive">
                {target?.name} is Shared. These Personal {w.items} would become visible to, and editable by, everyone in your household.
              </p>
            )}
            {choice === "delete" && <p className="text-sm text-destructive">The {w.items} are deleted. This can&apos;t be undone.</p>}
          </>
        )}
        <Button type="submit" size="lg" variant="destructive" disabled={busy}>
          {busy ? "Deleting…" : `Delete ${w.one}`}
        </Button>
      </form>
    </ResponsiveSheet>
  );
}
