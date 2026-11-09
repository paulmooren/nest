"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TextField } from "@/components/ui/text-field";
import { Textarea } from "@/components/ui/textarea";
import { RecipePhoto } from "@/components/recipes/recipes-ui";
import {
  parseRecipeText,
  RECIPE_INGREDIENTS_MAX,
  RECIPE_MINUTES_MAX,
  RECIPE_NAME_MAX,
  RECIPE_SERVINGS_MAX,
  RECIPE_STEPS_MAX,
} from "@/lib/recipes";

export type RecipeValues = {
  name: string;
  cookbookId: string;
  ingredients: string;
  steps: string;
  servings: number | null;
  sourceUrl: string | null;
  totalMinutes: number | null;
  imageUrl: string | null;
};

/** What an import fills in. */
export type RecipeDraft = Pick<RecipeValues, "name" | "servings" | "ingredients" | "steps" | "totalMinutes" | "imageUrl">;

const wholeNumber = (text: string, max: number): { value: number | null; ok: boolean } => {
  if (text.trim() === "") return { value: null, ok: true };
  const n = Number(text);
  return { value: n, ok: Number.isInteger(n) && n >= 1 && n <= max };
};

/**
 * Write or edit a Recipe. `cookbooks` are the ones the Member may put it in. `error` is shown above the buttons —
 * for a save refused because someone else changed the Recipe, with `onReload` to fetch their version. `note` is a
 * line under the Source link, for what an import done before the editor opened had to say.
 */
export function RecipeEditor({
  initial,
  cookbooks,
  pending,
  error,
  note,
  submitLabel = "Save",
  onSubmit,
  onCancel,
  onReload,
  onImport,
}: {
  initial: RecipeValues;
  cookbooks: { id: string; name: string }[];
  pending?: boolean;
  error?: string | null;
  note?: { ok: boolean; text: string } | null;
  submitLabel?: string;
  onSubmit: (values: RecipeValues) => void;
  onCancel: () => void;
  onReload?: () => void;
  /** When given, "Import from link" reads the Source link into the fields below. Nothing is saved. */
  onImport?: (url: string) => Promise<RecipeDraft>;
}) {
  const [name, setName] = useState(initial.name);
  const [cookbookId, setCookbookId] = useState(initial.cookbookId);
  const [ingredients, setIngredients] = useState(initial.ingredients);
  const [steps, setSteps] = useState(initial.steps);
  const [servings, setServings] = useState(initial.servings === null ? "" : String(initial.servings));
  const [minutes, setMinutes] = useState(initial.totalMinutes === null ? "" : String(initial.totalMinutes));
  const [sourceUrl, setSourceUrl] = useState(initial.sourceUrl ?? "");
  const [imageUrl, setImageUrl] = useState(initial.imageUrl);
  const [importing, setImporting] = useState(false);
  const [importNote, setImportNote] = useState(note ?? null);
  const [pasting, setPasting] = useState(false);

  const items = cookbooks.map((c) => ({ value: c.id, label: c.name }));
  const servingsField = wholeNumber(servings, RECIPE_SERVINGS_MAX);
  const minutesField = wholeNumber(minutes, RECIPE_MINUTES_MAX);
  const url = sourceUrl.trim();
  const urlOk = url === "" || /^https?:\/\//i.test(url);
  const valid = !!name.trim() && servingsField.ok && minutesField.ok && urlOk;

  function fill(draft: Partial<RecipeDraft>) {
    if (draft.name) setName(draft.name.slice(0, RECIPE_NAME_MAX));
    if (draft.servings !== undefined) setServings(draft.servings === null ? "" : String(draft.servings));
    if (draft.totalMinutes !== undefined) setMinutes(draft.totalMinutes === null ? "" : String(draft.totalMinutes));
    if (draft.ingredients !== undefined) setIngredients(draft.ingredients);
    if (draft.steps !== undefined) setSteps(draft.steps);
    if (draft.imageUrl !== undefined) setImageUrl(draft.imageUrl);
  }

  async function runImport() {
    if (!onImport || !url || !urlOk) return;
    setImporting(true);
    setImportNote(null);
    try {
      fill(await onImport(url));
      setImportNote({ ok: true, text: "Filled in from the link. Check it, then save." });
    } catch (e) {
      setImportNote({ ok: false, text: e instanceof Error && e.message ? e.message : "Couldn't import that link." });
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <form
        className="flex max-w-3xl flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          onSubmit({
            name: name.trim(),
            cookbookId,
            ingredients,
            steps,
            servings: servingsField.value,
            totalMinutes: minutesField.value,
            sourceUrl: url || null,
            imageUrl,
          });
        }}
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-end gap-2">
            <TextField
              label="Source link"
              type="url"
              value={sourceUrl}
              onChange={(e) => {
                setSourceUrl(e.target.value);
                setImportNote(null);
              }}
              maxLength={500}
              placeholder="https://"
              fieldClassName="flex-1"
            />
            {onImport && (
              <Button type="button" variant="outline" size="lg" disabled={!url || !urlOk || importing} onClick={runImport}>
                {importing ? "Importing…" : "Import"}
              </Button>
            )}
          </div>
          {importNote ? (
            <p role={importNote.ok ? "status" : "alert"} className={importNote.ok ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>
              {importNote.text}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Paste a link and import it, or{" "}
              <button type="button" className="font-medium text-foreground underline underline-offset-4" onClick={() => setPasting(true)}>
                paste the recipe as text
              </button>
              .
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_220px]">
          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={RECIPE_NAME_MAX}
            placeholder="e.g. Tomato soup"
          />
          <Field id="recipe-cookbook" label="Cookbook">
            <Select items={items} value={cookbookId} onValueChange={(v) => v && setCookbookId(v)}>
              <SelectTrigger id="recipe-cookbook" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {items.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:max-w-sm">
          <TextField
            label="Servings"
            type="number"
            inputMode="numeric"
            min={1}
            max={RECIPE_SERVINGS_MAX}
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            placeholder="e.g. 4"
          />
          <TextField
            label="Time (minutes)"
            type="number"
            inputMode="numeric"
            min={1}
            max={RECIPE_MINUTES_MAX}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            placeholder="e.g. 45"
          />
        </div>

        {imageUrl && (
          <div className="flex items-center gap-3">
            <RecipePhoto src={imageUrl} className="size-20 rounded-xl" />
            <div className="flex flex-col items-start gap-1">
              <span className="text-sm text-muted-foreground">Photo from the link</span>
              <Button type="button" variant="outline" size="sm" onClick={() => setImageUrl(null)}>
                Remove photo
              </Button>
            </div>
          </div>
        )}

        <Field id="recipe-ingredients" label="Ingredients" hint="One per line, e.g. 200 g flour. Start with the amount so it can follow the servings.">
          <Textarea
            id="recipe-ingredients"
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            maxLength={RECIPE_INGREDIENTS_MAX}
            className="min-h-40"
          />
        </Field>

        <Field id="recipe-steps" label="Steps" hint="One step per line. Times such as “simmer for 20 minutes” become timers when you cook.">
          <Textarea id="recipe-steps" value={steps} onChange={(e) => setSteps(e.target.value)} maxLength={RECIPE_STEPS_MAX} className="min-h-48" />
        </Field>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="lg" disabled={pending || !valid}>
            {pending ? "Saving…" : submitLabel}
          </Button>
          {error && onReload && (
            <Button type="button" variant="outline" size="lg" onClick={onReload}>
              Discard mine and reload
            </Button>
          )}
          <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>

      {pasting && (
        <PasteTextSheet
          onClose={() => setPasting(false)}
          onUse={(text) => {
            const draft = parseRecipeText(text);
            fill({
              name: draft.name,
              ...(draft.servings !== null ? { servings: draft.servings } : {}),
              ingredients: draft.ingredients.join("\n").slice(0, RECIPE_INGREDIENTS_MAX),
              steps: draft.steps.join("\n").slice(0, RECIPE_STEPS_MAX),
            });
            setImportNote({ ok: true, text: "Split into ingredients and steps. Check it, then save." });
          }}
        />
      )}
    </>
  );
}

/** Paste a whole recipe — from a message, a note, a PDF — and have it split into name, Ingredients and steps. */
function PasteTextSheet({ onUse, onClose }: { onUse: (text: string) => void; onClose: () => void }) {
  const [text, setText] = useState("");
  return (
    <ResponsiveSheet
      open
      onOpenChange={(open) => !open && onClose()}
      title="Paste a recipe"
      description="The first line becomes the name. Headings such as “Ingredients” and “Method” are followed when they are there."
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          onUse(text);
          onClose();
        }}
      >
        <Textarea value={text} onChange={(e) => setText(e.target.value)} aria-label="Recipe text" className="min-h-64" maxLength={30_000} autoFocus />
        <Button type="submit" size="lg" disabled={!text.trim()}>
          Fill in the recipe
        </Button>
      </form>
    </ResponsiveSheet>
  );
}
