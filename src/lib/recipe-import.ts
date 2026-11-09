/** What importing a web page can fill in on a new Recipe. Ingredients and steps are one line each. */
export type ImportedRecipe = {
  name: string;
  servings: number | null;
  ingredients: string[];
  steps: string[];
  /** Prep and cooking together, when the page says. */
  totalMinutes: number | null;
  /** The page's own photo of the dish. */
  imageUrl: string | null;
};

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", deg: "°", frac12: "½", frac14: "¼", frac34: "¾" };

/** Plain text from a string that may hold HTML tags and entities. */
function clean(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);/gi, (match, code: string) => {
      if (code[0] === "#") {
        const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
        return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : match;
      }
      return ENTITIES[code.toLowerCase()] ?? match;
    })
    .replace(/\s+/g, " ")
    .trim();
}

type Json = unknown;

const asArray = (v: Json): Json[] => (Array.isArray(v) ? v : v === undefined || v === null ? [] : [v]);
const isObject = (v: Json): v is Record<string, Json> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Finds the first schema.org Recipe in parsed JSON-LD, looking in arrays and `@graph`. */
function findRecipe(node: Json): Record<string, Json> | null {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipe(item);
      if (found) return found;
    }
    return null;
  }
  if (!isObject(node)) return null;
  const types = asArray(node["@type"]).map((t) => String(t).replace(/^.*[/#]/, ""));
  if (types.includes("Recipe")) return node;
  return findRecipe(node["@graph"]);
}

/** HowToStep, HowToSection and plain strings, flattened to one text per step. */
function readSteps(value: Json): string[] {
  const steps: string[] = [];
  for (const item of asArray(value)) {
    if (typeof item === "string") {
      // A single string may hold several steps, one per line.
      for (const line of item.split(/\r?\n/)) {
        const text = clean(line);
        if (text) steps.push(text);
      }
    } else if (isObject(item)) {
      if (item.itemListElement !== undefined) steps.push(...readSteps(item.itemListElement));
      else {
        const text = clean(item.text) || clean(item.name);
        if (text) steps.push(text);
      }
    }
  }
  return steps;
}

/** The first whole number in a yield such as 4, "4 servings" or ["4", "4 servings"]. */
function readServings(value: Json): number | null {
  for (const item of asArray(value)) {
    const match = /\d+/.exec(String(item));
    if (match) {
      const n = Number(match[0]);
      if (n >= 1 && n <= 999) return n;
    }
  }
  return null;
}

/** Minutes in an ISO 8601 duration such as "PT1H30M" or "P0DT45M". */
function readMinutes(value: Json): number | null {
  if (typeof value !== "string") return null;
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:\d+(?:\.\d+)?S)?)?$/i.exec(value.trim());
  if (!m) return null;
  const minutes = Math.round(Number(m[1] ?? 0) * 1440 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0));
  return minutes >= 1 && minutes <= 6000 ? minutes : null;
}

/** The first https image in a string, a list, or an ImageObject. */
function readImage(value: Json): string | null {
  for (const item of asArray(value)) {
    const url = typeof item === "string" ? item : isObject(item) ? item.url ?? item.contentUrl : null;
    if (typeof url === "string" && /^https:\/\//i.test(url.trim()) && url.length <= 1000) return url.trim();
  }
  return null;
}

/** Reads the schema.org Recipe in a page's JSON-LD, or null when the page has none. */
export function parseRecipeHtml(html: string): ImportedRecipe | null {
  const scripts = html.matchAll(/<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi);
  for (const [, raw] of scripts) {
    let data: Json;
    try {
      data = JSON.parse(raw.trim());
    } catch {
      continue;
    }
    const recipe = findRecipe(data);
    if (!recipe) continue;
    const name = clean(recipe.name);
    const ingredients = asArray(recipe.recipeIngredient ?? recipe.ingredients).map(clean).filter(Boolean);
    const steps = readSteps(recipe.recipeInstructions);
    if (!name && ingredients.length === 0 && steps.length === 0) continue;
    const prepAndCook = (readMinutes(recipe.prepTime) ?? 0) + (readMinutes(recipe.cookTime) ?? 0);
    return {
      name,
      servings: readServings(recipe.recipeYield),
      ingredients,
      steps,
      totalMinutes: readMinutes(recipe.totalTime) ?? (prepAndCook > 0 ? prepAndCook : null),
      imageUrl: readImage(recipe.image),
    };
  }
  return null;
}
