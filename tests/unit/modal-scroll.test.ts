import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Modal scroll guard.
 *
 * A dialog taller than the viewport used to be unscrollable: the primitives
 * carried no height cap, and a dozen call sites patched it locally with their
 * own max-h/overflow values, so "all modals" never actually meant all. The
 * cap now lives in the DialogContent/AlertDialogContent base classes
 * (max-h-[calc(100dvh-2rem)] overflow-y-auto scrollbar-thin) and call sites
 * must not re-declare it.
 *
 * Exempt: overflow-hidden layouts (command palette, flex-col panels) which
 * own their inner scrolling deliberately.
 */

const ROOT = path.resolve(__dirname, "..", "..");
const CAP = "max-h-[calc(100dvh-2rem)]";

function sourceFiles(abs: string): string[] {
  const st = statSync(abs);
  if (st.isFile()) return [abs];
  const out: string[] = [];
  for (const entry of readdirSync(abs)) {
    const p = path.join(abs, entry);
    if (statSync(p).isDirectory()) out.push(...sourceFiles(p));
    else if (p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

function baseClass(file: string): string {
  const text = readFileSync(path.join(ROOT, file), "utf8");
  const m = text.match(/cn\(\s*"(fixed left-\[50\%][^"]*)"/);
  if (!m) throw new Error(`${file}: Content base class not found`);
  return m[1];
}

describe("modals scroll from the primitive, not from call sites", () => {
  for (const file of ["components/ui/dialog.tsx", "components/ui/alert-dialog.tsx"]) {
    it(`${file} caps its height and scrolls with the thin scrollbar`, () => {
      const base = baseClass(file);
      expect(base).toContain(CAP);
      expect(base).toContain("overflow-y-auto");
      expect(base).toContain("scrollbar-thin");
    });
  }

  it("globals.css defines the thin vertical scrollbar utility", () => {
    const css = readFileSync(path.join(ROOT, "app/globals.css"), "utf8");
    expect(css).toContain(".scrollbar-thin");
    expect(css).toMatch(/\.scrollbar-thin\s*\{[^}]*scrollbar-width:\s*thin/);
    expect(css).toMatch(/\.scrollbar-thin::-webkit-scrollbar\s*\{[^}]*width:\s*6px/);
  });

  it("no call site re-declares a height cap or vertical scroll on a dialog", () => {
    const offenders: string[] = [];
    for (const scope of ["app", "components"]) {
      for (const f of sourceFiles(path.join(ROOT, scope))) {
        const rel = path.relative(ROOT, f);
        const lines = readFileSync(f, "utf8").split("\n");
        lines.forEach((line, i) => {
          const m = line.match(/<(DialogContent|AlertDialogContent)\s+className="([^"]*)"/);
          if (!m) return;
          if (/max-h-\[\d+vh\]|overflow-y-auto/.test(m[2])) {
            offenders.push(`${rel}:${i + 1} :: ${m[2]}`);
          }
        });
      }
    }
    expect(offenders).toEqual([]);
  });
});
