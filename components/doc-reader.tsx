"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Check, ChevronRight, Copy, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { slugifyHeading, type DocEntry, type DocSection } from "@/content/documentation"

type Line =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "code"; lines: string[] }
  | { kind: "para"; text: string }

const HEADING = /^(#{1,3})\s+(.*)$/
const BULLET = /^-\s+(.*)$/
const STEP = /^\d+\.\s+(.*)$/

/** markdown-lite parser: headings, bullet runs, numbered runs, indented code, paragraphs. */
function parse(markdown: string): Line[] {
  const lines = markdown.split("\n")
  const out: Line[] = []
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

    if (/^\s{4}\S/.test(line)) {
      const code: string[] = []
      while (index < lines.length && (/^\s{4}\S/.test(lines[index]) || lines[index].trim() === "")) {
        code.push(lines[index].replace(/^ {4}/, ""))
        index += 1
      }
      while (code.length && code[code.length - 1].trim() === "") code.pop()
      out.push({ kind: "code", lines: code })
      continue
    }

    const bullet = BULLET.exec(line)
    if (bullet) {
      const items: string[] = []
      while (index < lines.length) {
        const match = BULLET.exec(lines[index])
        if (!match) break
        items.push(match[1])
        index += 1
      }
      out.push({ kind: "ul", items })
      continue
    }

    const step = STEP.exec(line)
    if (step) {
      const items: string[] = []
      while (index < lines.length) {
        const match = STEP.exec(lines[index])
        if (!match) break
        items.push(match[1])
        index += 1
      }
      out.push({ kind: "ol", items })
      continue
    }

    const paragraph: string[] = []
    while (
      index < lines.length &&
      lines[index].trim() !== "" &&
      !HEADING.test(lines[index]) &&
      !BULLET.test(lines[index]) &&
      !STEP.test(lines[index]) &&
      !/^\s{4}\S/.test(lines[index])
    ) {
      paragraph.push(lines[index].trim())
      index += 1
    }
    out.push({ kind: "para", text: paragraph.join(" ") })
  }

  return out
}

function matchesQuery(line: Line, needle: string) {
  if (!needle) return true
  const text =
    line.kind === "heading" || line.kind === "para"
      ? line.text
      : line.kind === "code"
        ? line.lines.join(" ")
        : line.items.join(" ")
  return text.toLowerCase().includes(needle)
}

export default function DocReader({ doc, related }: { doc: DocEntry; related: DocEntry[] }) {
  const [query, setQuery] = useState("")
  const [copied, setCopied] = useState(false)

  const needle = query.trim().toLowerCase()
  const blocks = parse(doc.content).filter((block) => matchesQuery(block, needle))
  const sections: DocSection[] = parse(doc.content)
    .filter((block): block is Extract<Line, { kind: "heading" }> => block.kind === "heading" && block.level > 1)
    .map((block) => ({ id: slugifyHeading(block.text), title: block.text, depth: block.level as 2 | 3 }))

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(doc.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="mb-8">
        <Button variant="outline" asChild>
          <Link href="/resources/documentation">
            <ArrowLeft className="mr-2 h-4 w-4" />
            All Documentation
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-1">
          <div className="sticky top-24">
            <div className="mb-6">
              <label htmlFor="doc-search" className="sr-only">
                Search in this document
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="doc-search"
                  type="search"
                  placeholder="Search in this document..."
                  className="pl-8"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              {needle ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {blocks.length} matching {blocks.length === 1 ? "block" : "blocks"}
                  <button
                    type="button"
                    className="ml-2 text-primary hover:underline"
                    onClick={() => setQuery("")}
                  >
                    Clear
                  </button>
                </p>
              ) : null}
            </div>

            <div className="mb-6">
              <h2 className="font-medium mb-3 text-sm">On This Page</h2>
              <ul className="space-y-2 text-sm">
                {sections.map((section) => (
                  <li key={section.id} className={section.depth === 3 ? "pl-3" : undefined}>
                    <a
                      href={`#${section.id}`}
                      className="text-muted-foreground hover:text-foreground flex items-center"
                    >
                      <ChevronRight className="h-3 w-3 mr-1 shrink-0" />
                      {section.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {related.length > 0 ? (
              <div>
                <h2 className="font-medium mb-3 text-sm">Related Documentation</h2>
                <ul className="space-y-2 text-sm">
                  {related.map((entry) => (
                    <li key={entry.slug}>
                      <Link
                        href={`/resources/documentation/${entry.slug}`}
                        className="text-primary hover:underline"
                      >
                        {entry.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>

        <div className="md:col-span-3">
          <div className="bg-muted/30 p-6 rounded-lg mb-6 flex justify-between items-start gap-4">
            <div>
              <h1 className="text-2xl font-bold">{doc.title}</h1>
              <p className="text-muted-foreground">{doc.description}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => void copy()} title="Copy this document as markdown">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span className="sr-only">Copy this document as markdown</span>
            </Button>
          </div>

          <Tabs defaultValue="content">
            <TabsList className="mb-4">
              <TabsTrigger value="content">Content</TabsTrigger>
              {doc.examples?.length ? <TabsTrigger value="examples">Examples</TabsTrigger> : null}
              {doc.endpoints?.length ? <TabsTrigger value="endpoints">Endpoints</TabsTrigger> : null}
            </TabsList>

            <TabsContent value="content" className="max-w-none">
              {blocks.length === 0 ? (
                <p className="text-muted-foreground">No part of this document matches “{query}”.</p>
              ) : null}
              {blocks.map((block, index) => {
                if (block.kind === "heading") {
                  const id = slugifyHeading(block.text)
                  if (block.level === 1) {
                    return (
                      <h1 key={index} className="text-3xl font-bold my-6">
                        {block.text}
                      </h1>
                    )
                  }
                  if (block.level === 2) {
                    return (
                      <h2 key={index} id={id} className="text-2xl font-bold mt-8 mb-4 scroll-mt-24">
                        {block.text}
                      </h2>
                    )
                  }
                  return (
                    <h3 key={index} id={id} className="text-xl font-bold mt-6 mb-3 scroll-mt-24">
                      {block.text}
                    </h3>
                  )
                }
                if (block.kind === "ul") {
                  return (
                    <ul key={index} className="list-disc pl-6 mb-4 space-y-1.5">
                      {block.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )
                }
                if (block.kind === "ol") {
                  return (
                    <ol key={index} className="list-decimal pl-6 mb-4 space-y-1.5">
                      {block.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ol>
                  )
                }
                if (block.kind === "code") {
                  return (
                    <pre key={index} className="bg-muted p-4 rounded-md overflow-x-auto mb-4 text-sm">
                      <code>{block.lines.join("\n")}</code>
                    </pre>
                  )
                }
                return (
                  <p key={index} className="mb-4 leading-relaxed">
                    {block.text}
                  </p>
                )
              })}
            </TabsContent>

            {doc.examples?.length ? (
              <TabsContent value="examples">
                <div className="space-y-6">
                  {doc.examples.map((example) => (
                    <div key={example.title}>
                      <h2 className="font-medium mb-2">{example.title}</h2>
                      <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
                        <code>{example.code}</code>
                      </pre>
                    </div>
                  ))}
                </div>
              </TabsContent>
            ) : null}

            {doc.endpoints?.length ? (
              <TabsContent value="endpoints">
                <div className="divide-y divide-border rounded-lg border">
                  {doc.endpoints.map((endpoint) => (
                    <div key={`${endpoint.method} ${endpoint.path}`} className="p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <span className="font-mono text-xs rounded bg-muted px-2 py-1 shrink-0">{endpoint.method}</span>
                      <code className="text-sm break-all">{endpoint.path}</code>
                      <span className="text-sm text-muted-foreground sm:ml-auto sm:text-right">
                        {endpoint.description}
                      </span>
                    </div>
                  ))}
                </div>
              </TabsContent>
            ) : null}
          </Tabs>
        </div>
      </div>
    </div>
  )
}
