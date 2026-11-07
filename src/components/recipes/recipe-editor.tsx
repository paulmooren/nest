"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TextField } from "@/components/ui/text-field";
import { Textarea } from "@/components/ui/textarea";
import { RECIPE_INGREDIENTS_MAX, RECIPE_NAME_MAX, RECIPE_SERVINGS_MAX, RECIPE_STEPS_MAX } from "@/lib/recipes";

export type RecipeValues = {
  name: string;
  cookbookId: string;
  ingredients: string;
  steps: string;
  servings: number | null;
  sourceUrl: string | null;
};

/**
 * Write or edit a Recipe. `cookbooks` are the ones the Member may put it in. `error` is shown above the buttons —
 * for a save refused because someone else changed the Recipe, with `onReload` to fetch their version.
 */
export function RecipeEditor({
  initial,
  cookbooks,
  pending,
  error,
  submitLabel = "Save",
  onSubmit,
  onCancel,
  onReload,
}: {
  initial: RecipeValues;
  cookbooks: { id: string; name: string }[];
  pending?: boolean;
  error?: string | null;
  submitLabel?: string;
  onSubmit: (values: RecipeValues) => void;
  onCancel: () => void;
  onReload?: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [cookbookId, setCookbookId] = useState(initial.cookbookId);
  const [ingredients, setIngredients] = useState(initial.ingredients);
  const [steps, setSteps] = useState(initial.steps);
  const [servings, setServings] = useState(initial.servings === null ? "" : String(initial.servings));
  const [sourceUrl, setSourceUrl] = useState(initial.sourceUrl ?? "");
  const items = cookbooks.map((c) => ({ value: c.id, label: c.name }));
  const servingsNumber = servings.trim() === "" ? null : Number(servings);
  const servingsOk = servingsNumber === null || (Number.isInteger(servingsNumber) && servingsNumber >= 1 && servingsNumber <= RECIPE_SERVINGS_MAX);
  const url = sourceUrl.trim();
  const urlOk = url === "" || /^https?:\/\//i.test(url);

  return (
    <form
      className="flex max-w-3xl flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim() || !servingsOk || !urlOk) return;
        onSubmit({ name: name.trim(), cookbookId, ingredients, steps, servings: servingsNumber, sourceUrl: url || null });
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_220px]">
        <TextField
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={RECIPE_NAME_MAX}
          placeholder="e.g. Tomato soup"
          autoFocus
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[140px_1fr]">
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
          label="Source link"
          type="url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          maxLength={500}
          placeholder="https://"
        />
      </div>

      <Field id="recipe-ingredients" label="Ingredients" hint="One per line, e.g. 200 g flour.">
        <Textarea
          id="recipe-ingredients"
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
          maxLength={RECIPE_INGREDIENTS_MAX}
          className="min-h-40"
        />
      </Field>

      <Field id="recipe-steps" label="Steps" hint="One step per line.">
        <Textarea
          id="recipe-steps"
          value={steps}
          onChange={(e) => setSteps(e.target.value)}
          maxLength={RECIPE_STEPS_MAX}
          className="min-h-48"
        />
      </Field>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="lg" disabled={pending || !name.trim() || !servingsOk || !urlOk}>
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
  );
}
