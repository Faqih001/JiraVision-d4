// The markdown-lite parser behind the documentation reader and the blog reader.
//
// Supported: `#`/`##`/`###` headings, `- ` bullet runs, `1.` numbered runs,
// four-space indented code blocks, and paragraphs. Inline emphasis, links and
// images are deliberately not supported — content is authored as plain prose,
// so nothing needs escaping and no HTML is ever injected into the page.

export type MdBlock =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "code"; lines: string[] }
  | { kind: "para"; text: string }

export type MdSection = { id: string; title: string; depth: 2 | 3 }

const HEADING = /^(#{1,3})\s+(.*)$/
const BULLET = /^-\s+(.*)$/
const STEP = /^\d+\.\s+(.*)$/
const CODE = /^\s{4}\S/
/** A wrapped list item continues on the next line, indented by one to three spaces. */
const CONTINUATION = /^\s{1,3}\S/

/** Anchor id for a heading — matches the id readers put on the element. */
export function slugifyHeading(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
}

/** Consumes a `- ` or `1.` run, folding continuation lines into the item above them. */
function consumeRun(lines: string[], start: number, marker: RegExp) {
  const items: string[] = []
  let index = start
  while (index < lines.length) {
    const match = marker.exec(lines[index])
    if (match) {
      items.push(match[1])
      index += 1
      continue
    }
    if (items.length > 0 && CONTINUATION.test(lines[index])) {
      items[items.length - 1] += ` ${lines[index].trim()}`
      index += 1
      continue
    }
    break
  }
  return { items, index }
}

export function parseMarkdown(markdown: string): MdBlock[] {
  const lines = markdown.split("\n")
  const out: MdBlock[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]

    if (line.trim() === "") {
      index += 1
      continue
    }

    const heading = HEADING.exec(line)
    if (heading) {
      out.push({ kind: "heading", level: heading[1].length as 1 | 2 | 3, text: heading[2].trim() })
      index += 1
      continue
    }

    if (CODE.test(line)) {
      const code: string[] = []
      while (index < lines.length && (CODE.test(lines[index]) || lines[index].trim() === "")) {
        code.push(lines[index].replace(/^ {4}/, ""))
        index += 1
      }
      while (code.length && code[code.length - 1].trim() === "") code.pop()
      out.push({ kind: "code", lines: code })
      continue
    }

    if (BULLET.test(line)) {
      const run = consumeRun(lines, index, BULLET)
      out.push({ kind: "ul", items: run.items })
      index = run.index
      continue
    }

    if (STEP.test(line)) {
      const run = consumeRun(lines, index, STEP)
      out.push({ kind: "ol", items: run.items })
      index = run.index
      continue
    }

    const paragraph: string[] = []
    while (
      index < lines.length &&
      lines[index].trim() !== "" &&
      !HEADING.test(lines[index]) &&
      !BULLET.test(lines[index]) &&
      !STEP.test(lines[index]) &&
      !CODE.test(lines[index])
    ) {
      paragraph.push(lines[index].trim())
      index += 1
    }
    out.push({ kind: "para", text: paragraph.join(" ") })
  }

  return out
}

export function blockText(block: MdBlock) {
  if (block.kind === "heading" || block.kind === "para") return block.text
  if (block.kind === "code") return block.lines.join(" ")
  return block.items.join(" ")
}

export function blockMatches(block: MdBlock, needle: string) {
  if (!needle) return true
  return blockText(block).toLowerCase().includes(needle)
}

/** Level-2 and level-3 headings, for an on-page contents list. */
export function sectionsOf(markdown: string): MdSection[] {
  return parseMarkdown(markdown)
    .filter(
      (block): block is Extract<MdBlock, { kind: "heading" }> =>
        block.kind === "heading" && block.level > 1,
    )
    .map((block) => ({
      id: slugifyHeading(block.text),
      title: block.text,
      depth: block.level as 2 | 3,
    }))
}

/** Words in the rendered prose, headings and list items included. */
export function wordCount(markdown: string) {
  return parseMarkdown(markdown)
    .map(blockText)
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length
}
