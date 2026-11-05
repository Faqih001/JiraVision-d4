import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

/**
 * Dashboard control-height guard.
 *
 * Height is what makes two controls in one row look broken: a 32px filter
 * dropdown beside a 28px chip beside a 36px button reads as three widgets
 * wearing one label. The dashboard ladder is four rungs —
 *
 *   h-7  (28px) chip rows: buttons only, no dropdowns or fields
 *   h-8  (32px) bars: filter bars, bulk-action bars, toolbars, pagination
 *   h-9  (36px) card/page action rows that hold no fields
 *   h-10 (40px) form fields and their buttons — the shadcn default size
 *
 * and the rule that matters is one rung per horizontal row. components/ui/*
 * still defaults to h-10 (the marketing pages depend on that), so the rung is
 * declared at the dashboard call sites, not in the primitives.
 *
 * Exempt: range sliders (they draw their own track), any control with a
 * bespoke h-[…] height, and Textarea (a growing field, not a row control).
 * Out of scope: marketing chrome (navbar, footer, landing, gantt) and the
 * primitives themselves.
 */

const ROOT = path.resolve(__dirname, "..", "..");
const SCOPES = ["app/dashboard", "components/dashboard-layout.tsx"];
const LADDER = [7, 8, 9, 10];

const CONTROL_DEFAULTS: Record<string, number> = { Button: 10, Input: 10, SelectTrigger: 10 };
const SIZE_HEIGHTS: Record<string, number> = { sm: 9, lg: 11, default: 10, icon: 10 };

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

/** `const NAME = "…"` in the file, plus the shared kit's, so `className={FILTER_BAR}` resolves. */
function stringConsts(text: string): Record<string, string> {
  const map: Record<string, string> = {};
  const re = /(?:^|\n)(?:export )?const (\w+) = "([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) map[m[1]] = m[2];
  return map;
}
const KIT_CONSTS = stringConsts(readFileSync(path.join(ROOT, "components/dashboard-kit.tsx"), "utf8"));

function attributes(node: ts.JsxOpeningElement | ts.JsxSelfClosingElement) {
  return node.attributes.properties.filter(ts.isJsxAttribute);
}
function attrText(node: ts.JsxOpeningElement | ts.JsxSelfClosingElement, name: string): string | null {
  const found = attributes(node).find((a) => a.name.getText() === name);
  return found?.initializer ? found.initializer.getText() : null;
}
function classText(node: ts.JsxOpeningElement | ts.JsxSelfClosingElement, consts: Record<string, string>): string {
  const init = attributes(node).find((a) => a.name.getText() === "className")?.initializer;
  if (!init) return "";
  if (ts.isStringLiteral(init)) return init.text;
  if (ts.isJsxExpression(init) && init.expression) {
    const expr = init.expression;
    if (ts.isIdentifier(expr) && consts[expr.text]) return consts[expr.text];
    // a cn(…) / template-literal class: the whole expression text still carries every rung
    return expr.getText();
  }
  return "";
}

/** The rung a control sits at, or null when it is exempt from the rule. */
function resolvedHeight(tag: string, node: ts.JsxOpeningElement | ts.JsxSelfClosingElement, consts: Record<string, string>): number | null {
  const cls = classText(node, consts);
  if (attrText(node, "type")?.includes("range") || /appearance-none/.test(cls) || /h-\[/.test(cls)) return null;
  const explicit = cls.match(/(?:^|[\s"`])h-(\d+)(?![\w-])/);
  if (explicit) return Number(explicit[1]);
  const size = attrText(node, "size");
  const sizeMatch = size?.match(/["'](sm|lg|default|icon)["']/);
  if (sizeMatch) return SIZE_HEIGHTS[sizeMatch[1]];
  return CONTROL_DEFAULTS[tag] ?? null;
}

function isRowContainer(cls: string): boolean {
  if (!/\bflex\b|inline-flex/.test(cls)) return false;
  const flipsToRow = /(sm|md|lg):flex-row/.test(cls);
  if (/flex-col/.test(cls) && !flipsToRow) return false;
  return /items-(center|start|end|baseline)/.test(cls) || /\bgap-/.test(cls);
}

interface Row {
  file: string;
  line: number;
  cls: string;
  heights: Record<string, number[]>;
}
interface Control {
  file: string;
  line: number;
  tag: string;
  cls: string;
  h: number | null;
  explicit: number | null;
}

function scan(file: string, text: string, label = ""): { mixed: Row[]; controls: Control[] } {
  const rel = label || path.relative(ROOT, file);
  const consts = { ...KIT_CONSTS, ...stringConsts(text) };
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const lineOf = (pos: number) => text.slice(0, pos).split("\n").length;
  const mixed: Row[] = [];
  const controls: Control[] = [];

  function gather(node: ts.Node, depth: number, acc: { h: number; line: number }[]) {
    if (depth > 4) return;
    const own = ts.isJsxSelfClosingElement(node) ? node : ts.isJsxElement(node) ? node.openingElement : null;
    if (own) {
      const ownTag = own.tagName.getText();
      if (CONTROL_DEFAULTS[ownTag]) {
        const h = resolvedHeight(ownTag, own, consts);
        if (h) acc.push({ h, line: lineOf(own.getStart()) });
        return;
      }
      if (ts.isJsxElement(node) && /flex-col/.test(classText(own, consts)) && !/(sm|md|lg):flex-row/.test(classText(own, consts))) return;
    }
    ts.forEachChild(node, (child) => gather(child, depth + 1, acc));
  }

  (function visit(node: ts.Node) {
    const open = ts.isJsxSelfClosingElement(node) ? node : ts.isJsxElement(node) ? node.openingElement : null;
    if (open) {
      const tag = open.tagName.getText();
      if (CONTROL_DEFAULTS[tag]) {
        const cls = classText(open, consts);
        const h = resolvedHeight(tag, open, consts);
        controls.push({
          file: rel,
          line: lineOf(open.getStart()),
          tag,
          cls,
          h,
          // explicit rung only for non-exempt controls (a range slider or h-[…] field is off the ladder by design)
          explicit: h === null ? null : (cls.match(/(?:^|[\s"`])h-(\d+)(?![\w-])/)?.[1] ? Number(cls.match(/(?:^|[\s"`])h-(\d+)(?![\w-])/)![1]) : null),
        });
      }
      const cls = classText(open, consts);
      if (isRowContainer(cls)) {
        const acc: { h: number; line: number }[] = [];
        const children = ts.isJsxElement(node) ? node.children : [];
        for (const child of children) gather(child, 1, acc);
        const heights: Record<string, number[]> = {};
        for (const k of acc) (heights[k.h] ??= []).push(k.line);
        if (acc.length >= 2 && Object.keys(heights).length > 1) {
          mixed.push({ file: rel, line: lineOf(open.getStart()), cls, heights });
        }
      }
    }
    ts.forEachChild(node, visit);
  })(sf);
  return { mixed, controls };
}

function scanRepo() {
  const mixed: Row[] = [];
  const controls: Control[] = [];
  for (const scope of SCOPES) {
    for (const f of sourceFiles(path.join(ROOT, scope))) {
      const r = scan(f, readFileSync(f, "utf8"));
      mixed.push(...r.mixed);
      controls.push(...r.controls);
    }
  }
  return { mixed, controls };
}

const FIXTURE = `
const FILTER_TRIGGER = "h-8 w-auto text-xs"
export const Demo = () => (
  <div>
    <CardContent className="flex flex-wrap items-center gap-1.5 py-3">
      <SelectTrigger className={FILTER_TRIGGER}><SelectValue /></SelectTrigger>
      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">My tasks</Button>
    </CardContent>
    <div className="flex items-center gap-2">
      <Input className="h-10" />
      <Button size="sm">Save</Button>
    </div>
    <div className="flex flex-col gap-2">
      <Input className="h-10" />
      <Button size="sm" className="h-8">Stacked, so no row</Button>
    </div>
  </div>
)
`;

describe("dashboard control heights follow one ladder, one rung per row", () => {
  const { mixed, controls } = scanRepo();

  it("the scanner sees a mixed bar, a mixed field row, and ignores a stacked column", () => {
    const fixture = scan("fixture.tsx", FIXTURE, "fixture");
    const lines = fixture.mixed.map((r) => `${r.line}:${Object.keys(r.heights).sort((a, b) => Number(a) - Number(b)).join("/")}`);
    // bar at line 5 mixes h-8 + h-7; the field row at line 9 mixes h-10 + h-9 (size="sm")
    expect(lines).toEqual(["5:7/8", "9:9/10"]);
    expect(controls.length).toBeGreaterThan(50);
  });

  it("resolves one rung for every control in every horizontal row", () => {
    const offenders = mixed.map((r) => {
      const detail = Object.entries(r.heights)
        .map(([h, lines]) => `h-${h} at ${lines.join(",")}`)
        .join("; ");
      return `${r.file}:${r.line} (${r.cls.replace(/\s+/g, " ").slice(0, 50)}) -> ${detail}`;
    });
    expect(offenders).toEqual([]);
  });

  it("keeps every explicit control height on the ladder rungs", () => {
    const offLadder = controls
      .filter((c) => c.explicit !== null && !LADDER.includes(c.explicit))
      .map((c) => `${c.file}:${c.line} ${c.tag} h-${c.explicit} :: ${c.cls.replace(/\s+/g, " ").slice(0, 60)}`);
    expect(offLadder).toEqual([]);
  });

  it("does not let the dropdown trigger class land on a text field", () => {
    // FILTER_TRIGGER carries the w-auto/max-w rules that make a dropdown hug its
    // label; an <Input> wearing it inherits a width it was never meant to have.
    const offenders = controls
      .filter((c) => c.tag !== "SelectTrigger" && /FILTER_TRIGGER/.test(c.cls))
      .map((c) => `${c.file}:${c.line} ${c.tag} :: ${c.cls.slice(0, 60)}`);
    expect(offenders).toEqual([]);
  });
});
