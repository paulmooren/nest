/**
 * An amount is "<number> <unit>": "2" → 2, "500 g" → 500 g, "1,5 kg" → 1.5 kg.
 * No number means one of it: nothing at all is 1, "a bit" is 1 "a bit".
 */
export function parseAmount(value: string | null): { num: number; unit: string; comma: boolean } {
  const m = (value ?? "").trim().match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (!m) return { num: 1, unit: (value ?? "").trim(), comma: false };
  return { num: parseFloat(m[1].replace(",", ".")), unit: m[2], comma: m[1].includes(",") };
}

function formatAmount(num: number, unit: string, comma: boolean): string | null {
  if (num === 1 && !unit) return null;
  let text = String(num);
  if (comma) text = text.replace(".", ",");
  return unit ? `${text} ${unit}` : text;
}

/** One step up or down; grams and millilitres move in 50s. Returns "remove" when it would reach zero. */
export function stepAmount(value: string | null, direction: 1 | -1): string | null | "remove" {
  const { num, unit, comma } = parseAmount(value);
  const step = /^(g|gr|gram|ml)$/i.test(unit) ? 50 : 1;
  const next = Math.round((num + direction * step) * 100) / 100;
  if (next <= 0) return "remove";
  return formatAmount(next, unit, comma);
}
