"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Link2,
  Search,
} from "lucide-react"

import NewsletterForm from "@/components/newsletter-form"
import { SectionBg } from "@/components/sections/section-bg"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  blogCategories,
  formatDate,
  postNeighbours,
  readingMinutes,
  relatedPosts,
  type BlogPost,
} from "@/content/blog"
import { getDoc } from "@/content/documentation"
import {
  blockMatches,
  parseMarkdown,
  sectionsOf,
  slugifyHeading,
} from "@/lib/markdown-lite"

export default function BlogReader({ post }: { post: BlogPost }) {
  const [query, setQuery] = useState("")
  const [copied, setCopied] = useState(false)

  const needle = query.trim().toLowerCase()
  const blocks = parseMarkdown(post.content).filter((block) => blockMatches(block, needle))
  const sections = sectionsOf(post.content)
  const category = blogCategories.find((item) => item.id === post.category)
  const related = relatedPosts(post.slug, 3)
  const docs = post.relatedDocs
    .map((slug) => getDoc(slug))
    .filter((doc): doc is NonNullable<typeof doc> => Boolean(doc))
  const { previous, next } = postNeighbours(post.slug)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <>
      {/* Article header */}
      <section className="relative overflow-hidden bg-surface py-12 md:py-16">
        <SectionBg variant="contour" />
        <div className="container relative">
          <div className="mx-auto max-w-3xl">
            <Button variant="outline" size="sm" asChild className="mb-8">
              <Link href="/resources/blog">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                All articles
              </Link>
            </Button>

            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 font-mono text-xs tracking-[0.18em] text-primary uppercase">
              <span>{category?.title ?? post.category}</span>
            </p>

            <h1 className="font-display text-3xl font-medium tracking-tight md:text-5xl">
              {post.title}
            </h1>
            <p className="prose-body mt-4 text-lg text-muted-foreground">{post.excerpt}</p>

            <p className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs tracking-wide text-muted-foreground uppercase">
              <span className="inline-flex items-center gap-1.5">
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                {readingMinutes(post)} min read
              </span>
              <span>{formatDate(post.publishedOn)}</span>
              <span>{post.author ? `${post.author.name} — ${post.author.role}` : "JiraVision team"}</span>
            </p>
          </div>
        </div>
      </section>

      {/* Cover image */}
      <section className="pb-12 md:pb-16">
        <div className="container">
          <div className="relative mx-auto h-[240px] max-w-5xl overflow-hidden rounded-lg border md:h-[420px]">
            <Image
              src={post.image}
              alt={post.imageAlt}
              fill
              className="object-cover"
              sizes="(max-width: 1279px) 100vw, 1000px"
              priority
            />
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="py-8 md:py-12">
        <div className="container">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            <aside className="lg:col-span-4 xl:col-span-3">
              <div className="sticky top-24 space-y-8">
                <div>
                  <label htmlFor="post-search" className="sr-only">
                    Search in this article
                  </label>
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      id="post-search"
                      type="search"
                      placeholder="Search in this article..."
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

                {sections.length > 0 ? (
                  <nav aria-labelledby="post-contents">
                    <h2
                      id="post-contents"
                      className="mb-3 text-sm font-medium tracking-wide uppercase"
                    >
                      On this page
                    </h2>
                    <ul className="space-y-2 text-sm">
                      {sections.map((section) => (
                        <li key={section.id} className={section.depth === 3 ? "pl-3" : undefined}>
                          <a
                            href={`#${section.id}`}
                            className="flex items-start gap-1 text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <ChevronRight
                              className="mt-1 h-3 w-3 shrink-0"
                              aria-hidden="true"
                            />
                            <span>{section.title}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </nav>
                ) : null}

                {docs.length > 0 ? (
                  <div>
                    <h2 className="mb-3 text-sm font-medium tracking-wide uppercase">
                      Related documentation
                    </h2>
                    <ul className="space-y-2 text-sm">
                      {docs.map((doc) => (
                        <li key={doc.slug}>
                          <Link
                            href={`/resources/documentation/${doc.slug}`}
                            className="text-primary hover:underline"
                          >
                            {doc.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="space-y-3">
                  {post.relatedProduct ? (
                    <Button variant="outline" size="sm" asChild className="w-full justify-start">
                      <Link href={post.relatedProduct}>
                        Product page
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </Button>
                  ) : null}
                  {post.demoRoute ? (
                    <Button size="sm" asChild className="w-full justify-start">
                      <Link href={post.demoRoute}>
                        Open in the dashboard
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            </aside>

            <div className="lg:col-span-8 xl:col-span-9">
              <div className="max-w-[70ch]">
                {blocks.length === 0 ? (
                  <p className="text-muted-foreground">
                    No part of this article matches “{query}”.
                  </p>
                ) : null}

                {blocks.map((block, index) => {
                  if (block.kind === "heading") {
                    // The article header above is the page's only h1.
                    if (block.level === 1) return null
                    const id = slugifyHeading(block.text)
                    if (block.level === 2) {
                      return (
                        <h2
                          key={index}
                          id={id}
                          className="font-display mt-10 mb-4 scroll-mt-24 text-2xl font-medium tracking-tight"
                        >
                          {block.text}
                        </h2>
                      )
                    }
                    return (
                      <h3
                        key={index}
                        id={id}
                        className="font-display mt-8 mb-3 scroll-mt-24 text-xl font-medium tracking-tight"
                      >
                        {block.text}
                      </h3>
                    )
                  }
                  if (block.kind === "ul") {
                    return (
                      <ul key={index} className="mb-5 list-disc space-y-2 pl-6">
                        {block.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    )
                  }
                  if (block.kind === "ol") {
                    return (
                      <ol key={index} className="mb-5 list-decimal space-y-2 pl-6">
                        {block.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ol>
                    )
                  }
                  if (block.kind === "code") {
                    return (
                      <pre
                        key={index}
                        className="mb-5 overflow-x-auto rounded-md bg-muted p-4 text-sm"
                      >
                        <code>{block.lines.join("\n")}</code>
                      </pre>
                    )
                  }
                  return (
                    <p key={index} className="mb-5 leading-relaxed">
                      {block.text}
                    </p>
                  )
                })}
              </div>

              {/* Share */}
              <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-y py-6">
                <p className="text-sm text-muted-foreground">
                  Written by the {post.author ? post.author.name : "JiraVision"} team. Corrections
                  and disagreements welcome via the contact page.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => void copyLink()}>
                    {copied ? (
                      <Check className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Link2 className="h-4 w-4" aria-hidden="true" />
                    )}
                    {copied ? "Link copied" : "Copy link"}
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/contact">Send feedback</Link>
                  </Button>
                </div>
              </div>

              {/* Previous / next */}
              <nav
                aria-label="Article navigation"
                className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2"
              >
                {previous ? (
                  <Link
                    href={`/resources/blog/${previous.slug}`}
                    className="group rounded-lg border bg-card p-5 shadow-soft transition-shadow hover:shadow-soft-md"
                  >
                    <span className="mb-2 flex items-center gap-1 font-mono text-xs tracking-wide text-muted-foreground uppercase">
                      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                      Previous
                    </span>
                    <span className="font-display block font-medium group-hover:text-primary">
                      {previous.title}
                    </span>
                  </Link>
                ) : (
                  <span aria-hidden="true" />
                )}
                {next ? (
                  <Link
                    href={`/resources/blog/${next.slug}`}
                    className="group rounded-lg border bg-card p-5 text-right shadow-soft transition-shadow hover:shadow-soft-md"
                  >
                    <span className="mb-2 flex items-center justify-end gap-1 font-mono text-xs tracking-wide text-muted-foreground uppercase">
                      Next
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span className="font-display block font-medium group-hover:text-primary">
                      {next.title}
                    </span>
                  </Link>
                ) : null}
              </nav>
            </div>
          </div>
        </div>
      </section>

      {/* Related */}
      {related.length > 0 ? (
        <section className="bg-surface py-16 md:py-20">
          <div className="container">
            <h2 className="font-display mb-8 text-3xl font-medium tracking-tight md:text-4xl">
              Keep reading
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {related.map((item) => (
                <article
                  key={item.slug}
                  className="group flex flex-col rounded-lg border bg-card p-6 shadow-soft transition-shadow hover:shadow-soft-md"
                >
                  <p className="mb-3 font-mono text-xs tracking-wide text-primary uppercase">
                    {blogCategories.find((entry) => entry.id === item.category)?.title}
                  </p>
                  <h3 className="font-display text-lg font-medium transition-colors group-hover:text-primary">
                    <Link href={`/resources/blog/${item.slug}`}>{item.title}</Link>
                  </h3>
                  <p className="mt-2 mb-5 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {item.excerpt}
                  </p>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Read article
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* CTA */}
      <section className="bg-primary text-primary-foreground">
        <div className="container flex flex-col items-center gap-6 py-16 text-center md:py-20">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-medium tracking-tight md:text-4xl">
              Read the next one in your inbox
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-primary-foreground/80 md:text-base">
              Double opt-in, no tracking pixels, and an unsubscribe link in every message.
            </p>
          </div>
          <div className="w-full max-w-md">
            <NewsletterForm source={`blog-${post.slug}`} inverse showHeading={false} />
          </div>
          <Button
            size="lg"
            className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
            asChild
          >
            <Link href="/signup">
              Create an account
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  )
}
