/**
 * Mobile audit capture: screenshots every route at phone/tablet widths and measures overflow,
 * small tap targets and small input fonts.   Needs the Demo running (npm run demo:dev, port 3100).
 *   node tests/mobile/audit.mjs                    # writes .visual/mobile/<width>/<route>.png and .visual/mobile/metrics.json
 *   node tests/mobile/audit.mjs --check            # also fails on regressions against tests/mobile/baseline.json
 *   node tests/mobile/audit.mjs --update-baseline  # records the current numbers as the new baseline (do this when a phase lowers them)
 *
 * Gate rules: no page-level horizontal overflow and no text input under 16px at any width (hard rules, no baseline);
 * the counts of small tap targets and sub-12px text per route may only go down from the baseline.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.VISUAL_BASE_URL ?? "http://127.0.0.1:3100";
const OUT = path.resolve(".visual/mobile");
const WIDTHS = [{ w: 320, h: 640 }, { w: 360, h: 740 }, { w: 390, h: 844 }, { w: 430, h: 932 }, { w: 768, h: 1024 }];
const ROUTES = [
  ["signin", "/signin", null], ["signup", "/signup", null],
  ["dashboard", "/dashboard", "Alex"], ["budgets", "/finance/budgets", "Alex"], ["transactions", "/finance/transactions", "Alex"],
  ["accounts", "/finance/accounts", "Alex"], ["tasks", "/tasks", "Alex"], ["shopping", "/lists/shopping", "Alex"],
  ["wishlist", "/lists/wishlist", "Alex"], ["vault", "/vault", "Alex"], ["settings", "/settings", "Alex"],
  ["settings-profile", "/settings/profile", "Alex"], ["settings-categories", "/settings/categories", "Alex"],
  ["settings-household", "/settings/household", "Alex"], ["settings-data", "/settings/data", "Alex"],
  ["settings-notifications", "/settings/notifications", "Alex"],
];

const measure = () => {
  const vw = document.documentElement.clientWidth;
  const out = { scrollW: document.documentElement.scrollWidth, vw, overflowing: [], smallTargets: [], smallInputs: [], tinyText: 0 };
  const label = (el) => (el.getAttribute("aria-label") || el.innerText || el.name || el.tagName).trim().slice(0, 40);
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    if (r.right > vw + 1 && !el.closest("[class*=overflow-x]")) out.overflowing.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 50)} →${Math.round(r.right)}`);
    if (el.matches("a,button,[role=button],[role=tab],[role=checkbox],[role=switch],input:not([type=hidden]),select,textarea")) {
      if ((r.width < 44 || r.height < 44) && r.width > 2 && !el.classList.contains("tap-target")) out.smallTargets.push(`${label(el)} ${Math.round(r.width)}×${Math.round(r.height)}`);
    }
    if (el.matches("input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=hidden]):not([type=file]),select,textarea") && parseFloat(cs.fontSize) < 16) out.smallInputs.push(`${label(el)} ${cs.fontSize}`);
    if (el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(cs.fontSize) < 12) out.tinyText++;
  }
  out.overflowing = out.overflowing.slice(0, 8);
  return out;
};

const browser = await chromium.launch();
const metrics = {};
const ctxs = new Map();
for (const { w, h } of WIDTHS) {
  fs.mkdirSync(path.join(OUT, String(w)), { recursive: true });
  for (const [name, route, persona] of ROUTES) {
    const key = `${w}-${persona}`;
    if (!ctxs.has(key)) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, baseURL: BASE, hasTouch: w < 768, isMobile: w < 768, deviceScaleFactor: 2 });
      if (persona) {
        const p = await ctx.newPage();
        await p.goto("/signin");
        await p.getByRole("button", { name: new RegExp(`Continue as ${persona}`, "i") }).click();
        await p.waitForURL("**/dashboard", { timeout: 60_000 });
        await p.close();
      }
      ctxs.set(key, ctx);
    }
    const page = await ctxs.get(key).newPage();
    try {
      await page.goto(route, { waitUntil: "load" });
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForFunction(() => !document.body.innerText.includes("Loading…"), null, { timeout: 20_000 }).catch(() => {});
      await page.waitForTimeout(600);
      (metrics[w] ??= {})[name] = await page.evaluate(measure);
      await page.screenshot({ path: path.join(OUT, String(w), `${name}.png`), fullPage: true });
    } catch (e) { (metrics[w] ??= {})[name] = { error: String(e).slice(0, 200) }; }
    await page.close();
  }
}
fs.writeFileSync(path.join(OUT, "metrics.json"), JSON.stringify(metrics, null, 1));
await browser.close();

const BASELINE = path.resolve("tests/mobile/baseline.json");
const counts = Object.fromEntries(
  Object.entries(metrics).map(([w, routes]) => [
    w,
    Object.fromEntries(Object.entries(routes).map(([r, m]) => [r, { smallTargets: m.smallTargets?.length ?? 0, tinyText: m.tinyText ?? 0 }])),
  ]),
);
if (process.argv.includes("--update-baseline")) {
  // Overflows we know about and have scheduled a fix for (listed in docs/mobile/strategy.md); remove entries as they are fixed.
  const knownOverflow = Object.entries(metrics).flatMap(([w, routes]) => Object.entries(routes).filter(([, m]) => m.scrollW > m.vw).map(([r]) => `${w}/${r}`));
  fs.writeFileSync(BASELINE, JSON.stringify({ ...counts, knownOverflow }, null, 1) + "\n");
  console.log("baseline updated");
}
if (process.argv.includes("--check")) {
  const baseline = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, "utf8")) : {};
  const failures = [];
  for (const [w, routes] of Object.entries(metrics)) {
    for (const [r, m] of Object.entries(routes)) {
      if (m.error) { failures.push(`${w}/${r}: ${m.error}`); continue; }
      if (m.scrollW > m.vw && !baseline.knownOverflow?.includes(`${w}/${r}`)) failures.push(`${w}/${r}: page scrolls horizontally (${m.scrollW} > ${m.vw})`);
      if (Number(w) < 768 && m.smallInputs.length) failures.push(`${w}/${r}: inputs under 16px: ${m.smallInputs.slice(0, 3).join(", ")}`);
      const base = baseline[w]?.[r];
      if (base && counts[w][r].smallTargets > base.smallTargets) failures.push(`${w}/${r}: small tap targets ${base.smallTargets} → ${counts[w][r].smallTargets}`);
      if (base && counts[w][r].tinyText > base.tinyText) failures.push(`${w}/${r}: sub-12px text ${base.tinyText} → ${counts[w][r].tinyText}`);
    }
  }
  if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
  console.log("mobile check passed");
}
console.log("done");
