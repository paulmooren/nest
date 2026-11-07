export const RECIPE_NAME_MAX = 120;
export const RECIPE_INGREDIENTS_MAX = 5_000;
export const RECIPE_STEPS_MAX = 20_000;
export const RECIPE_SERVINGS_MAX = 999;
export const STARTER_COOKBOOK = "Recipes";

/** The Ingredients of a Recipe: one per non-empty line, trimmed. */
export function parseIngredients(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/** A short one-line preview of a Recipe's Ingredients for the list. */
export function ingredientsExcerpt(text: string, max = 120): string {
  const plain = parseIngredients(text).join(" · ");
  return plain.length > max ? `${plain.slice(0, max).trimEnd()}…` : plain;
}
