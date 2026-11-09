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

export const RECIPE_MINUTES_MAX = 6_000;

/** "45 min", "1 h", "1 h 30 min". */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

// ── Scaling ────────────────────────────────────────────────────────────────

const FRACTIONS: Record<string, number> = { "½": 1 / 2, "⅓": 1 / 3, "⅔": 2 / 3, "¼": 1 / 4, "¾": 3 / 4, "⅛": 1 / 8, "⅜": 3 / 8, "⅝": 5 / 8, "⅞": 7 / 8 };
const FRACTION_CHARS = Object.keys(FRACTIONS).join("");
const NICE: [number, string][] = [
  [1 / 4, "¼"],
  [1 / 3, "⅓"],
  [1 / 2, "½"],
  [2 / 3, "⅔"],
  [3 / 4, "¾"],
];

const QUANTITY = new RegExp(
  `^(?:(\\d+)\\s+(\\d+)\\/(\\d+)|(\\d+)\\s?([${FRACTION_CHARS}])|(\\d+)\\/(\\d+)|([${FRACTION_CHARS}])|(\\d+(?:[.,]\\d+)?))`,
);

/** The amount a text starts with ("1 1/2", "1½", "3/4", "½", "2,5", "400"), and how many characters it takes. */
function readQuantity(text: string): { value: number; length: number } | null {
  const m = QUANTITY.exec(text);
  if (!m) return null;
  let value: number;
  if (m[1]) value = Number(m[1]) + Number(m[2]) / Number(m[3]);
  else if (m[4]) value = Number(m[4]) + FRACTIONS[m[5]];
  else if (m[6]) value = Number(m[6]) / Number(m[7]);
  else if (m[8]) value = FRACTIONS[m[8]];
  else value = Number(m[9].replace(",", "."));
  return Number.isFinite(value) ? { value, length: m[0].length } : null;
}

/** An amount as a cook would write it: "1½", "⅓", "2.5", "600". */
export function formatQuantity(value: number): string {
  if (value >= 10) return String(Math.round(value));
  const whole = Math.floor(value + 1e-9);
  const rest = value - whole;
  if (rest < 0.04) return String(whole || (value > 0 ? Math.round(value * 100) / 100 : 0));
  if (rest > 0.96) return String(whole + 1);
  for (const [n, glyph] of NICE) if (Math.abs(rest - n) < 0.04) return `${whole || ""}${glyph}`;
  return String(Math.round(value * 10) / 10);
}

/**
 * One Ingredient line for a different number of servings: the amount it starts with (and the end of a range such as
 * "1–2 tbsp") is multiplied, the rest is left alone. A line with no leading amount ("salt") is returned as it is.
 */
export function scaleIngredient(line: string, factor: number): string {
  if (factor === 1) return line;
  const first = readQuantity(line);
  if (!first) return line;
  let out = formatQuantity(first.value * factor);
  let rest = line.slice(first.length);
  const range = /^(\s*[-–]\s*)/.exec(rest);
  if (range) {
    const second = readQuantity(rest.slice(range[1].length));
    if (second) {
      out += `${range[1]}${formatQuantity(second.value * factor)}`;
      rest = rest.slice(range[1].length + second.length);
    }
  }
  return out + rest;
}

// ── Following a Recipe ─────────────────────────────────────────────────────

export type StepTimer = { label: string; seconds: number };

const DURATION = /(\d+(?:[.,]\d+)?)(?:\s*(?:-|–|to)\s*(\d+(?:[.,]\d+)?))?\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?)\b/gi;

/** The waits a step mentions ("simmer for 20 minutes"), as timers. A range ("8–10 minutes") uses its lower end. */
export function findTimers(step: string): StepTimer[] {
  const timers: StepTimer[] = [];
  for (const m of step.matchAll(DURATION)) {
    const amount = Number(m[1].replace(",", "."));
    const unit = m[3].toLowerCase();
    const per = unit.startsWith("h") ? 3600 : unit.startsWith("m") ? 60 : 1;
    const seconds = Math.round(amount * per);
    if (seconds < 5 || seconds > 24 * 3600) continue;
    const label = unit.startsWith("h") ? `${m[1]} h` : unit.startsWith("m") ? `${m[1]} min` : `${m[1]} sec`;
    if (!timers.some((t) => t.seconds === seconds)) timers.push({ label, seconds });
  }
  return timers;
}

const UNIT_WORDS = new Set([
  "tbsp", "tsp", "tablespoon", "tablespoons", "teaspoon", "teaspoons", "cup", "cups", "gram", "grams", "litre", "litres", "liter", "liters",
  "pinch", "handful", "bunch", "clove", "cloves", "slice", "slices", "piece", "pieces", "sprig", "sprigs", "rashers", "rasher",
  "tin", "tins", "can", "cans", "jar", "pack", "packet", "large", "small", "medium", "fresh", "freshly", "dried", "ground", "good",
  "quality", "finely", "thinly", "roughly", "chopped", "sliced", "crushed", "grated", "peeled", "drained", "rinsed", "optional",
  "serve", "taste", "plus", "extra", "about", "into", "with", "from", "such", "each", "more", "little", "whole", "mixed", "ripe",
  "rindless", "active", "and", "the", "for", "hot", "red", "oz", "black", "white", "dark", "light", "smoked", "lengths", "tinned",
]);

/** The words that name what an Ingredient line is, for matching it to a step: "400g tin chopped tomatoes" → tomatoes. */
function ingredientWords(line: string): string[] {
  return line
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .split(",")[0]
    .split(/[^a-zà-ÿ]+/)
    .filter((w) => w.length >= 3 && !UNIT_WORDS.has(w));
}

/** The Ingredient lines a step uses, found by the words they share. Good enough to save scrolling, not exact. */
export function ingredientsForStep(ingredients: string[], step: string): string[] {
  const words = new Set(step.toLowerCase().split(/[^a-zà-ÿ]+/));
  // Whole words only ("sauce" is not in "saucepan"), singular or plural on either side.
  const said = (w: string) =>
    words.has(w) || words.has(`${w}s`) || words.has(`${w}es`) || (w.endsWith("es") && words.has(w.slice(0, -2))) || (w.endsWith("s") && words.has(w.slice(0, -1)));
  return ingredients.filter((line) => ingredientWords(line).some(said));
}

// ── Pasted text ────────────────────────────────────────────────────────────

const INGREDIENTS_HEADING = /^(ingredients?|what you need|you will need)\s*:?$/i;
const STEPS_HEADING = /^(method|instructions?|directions?|steps?|preparation|how to make( it)?)\s*:?$/i;
const BULLET = /^\s*(?:[-•*·▢☐]|\[\s?\])\s*/;
const NUMBERED = /^\s*(?:step\s*)?\d+\s*[.):]\s+/i;

/**
 * Splits a recipe pasted as plain text into a draft. With "Ingredients" and "Method"-style headings it follows them;
 * without, short lines that start with an amount or a bullet are Ingredients and the rest are steps.
 */
export function parseRecipeText(text: string): { name: string; servings: number | null; ingredients: string[]; steps: string[] } {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const servingsMatch = /(?:serves|servings?|makes|yield)\s*:?\s*(\d{1,3})|(\d{1,3})\s*(?:servings|portions|people)/i.exec(text);
  const servings = servingsMatch ? Number(servingsMatch[1] ?? servingsMatch[2]) || null : null;
  const iAt = lines.findIndex((l) => INGREDIENTS_HEADING.test(l));
  const sAt = lines.findIndex((l) => STEPS_HEADING.test(l));
  const stripBoth = (l: string) => l.replace(BULLET, "");
  const stripStep = (l: string) => l.replace(BULLET, "").replace(NUMBERED, "");

  if (iAt !== -1 && sAt !== -1) {
    const first = Math.min(iAt, sAt);
    const ingredients = iAt < sAt ? lines.slice(iAt + 1, sAt) : lines.slice(iAt + 1);
    const steps = iAt < sAt ? lines.slice(sAt + 1) : lines.slice(sAt + 1, iAt);
    return { name: lines.slice(0, first)[0] ?? "", servings, ingredients: ingredients.map(stripBoth), steps: steps.map(stripStep) };
  }

  const [name = "", ...body] = lines;
  const ingredients: string[] = [];
  const steps: string[] = [];
  for (const line of body) {
    if (INGREDIENTS_HEADING.test(line) || STEPS_HEADING.test(line)) continue;
    const looksLikeIngredient = line.length <= 70 && !NUMBERED.test(line) && (BULLET.test(line) || readQuantity(line) !== null || (line.length <= 40 && !/[.!?:]$/.test(line)));
    if (looksLikeIngredient && steps.length === 0) ingredients.push(stripBoth(line));
    else steps.push(stripStep(line));
  }
  return { name, servings, ingredients, steps };
}

// ── Days of the Meal plan ──────────────────────────────────────────────────

/** A calendar day as "2026-11-09", in the clock of whoever is looking. */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** The next `count` days starting from `from` (a day key), as day keys. */
export function upcomingDays(from: string, count: number): string[] {
  const [y, m, d] = from.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => dayKey(new Date(y, m - 1, d + i)));
}

/** "Today", "Tomorrow", or "Wed 11 Nov". */
export function dayLabel(day: string, today: string): string {
  const [next] = upcomingDays(today, 2).slice(1);
  if (day === today) return "Today";
  if (day === next) return "Tomorrow";
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}
