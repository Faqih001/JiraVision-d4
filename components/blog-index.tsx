"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  Bot,
  ChevronRight,
  Clock,
  HeartPulse,
  Newspaper,
  Search,
  ShieldCheck,
  TriangleAlert,
  Trophy,
} from "lucide-react"

import NewsletterForm from "@/components/newsletter-form"
import { SectionBg } from "@/components/sections/section-bg"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  blogCategories,
  blogList,
  formatDate,
  postsByCategory,
  readingMinutes,
  searchPosts,
  type BlogCategoryId,
  type BlogFilter,
  type BlogPost,
} from "@/content/blog"

const CATEGORY_ICONS: Record<BlogCategoryId, typeof Bot> = {
  "ai-scrum-master": Bot,
  "team-wellbeing": HeartPulse,
  gamification: Trophy,
  "ethical-ai": ShieldCheck,
}

function PostMeta({ post }: { post: BlogPost }) {
  return (
    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs tracking-wide text-muted-foreground uppercase">
      <span className="inline-flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        {readingMinutes(post)} min read
      </span>
      <span>{formatDate(post.publishedOn)}</span>
      <span>JiraVision team</span>
    </p>
  )
}

export default function BlogIndex() {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<BlogFilter>("all")

  const results = useMemo(() => searchPosts(query, category), [query, category])
  const filtering = query.trim().length > 0 || category !== "all"
  const featured = blogList.find((post) => post.featured) ?? blogList[0]
  const rest = results.filter((post) => post.slug !== featured?.slug)

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-surface py-16 md:py-24">
        <SectionBg variant="grid" />
        <div className="container relative">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 font-mono text-xs tracking-[0.18em] text-primary uppercase">
              <Newspaper className="h-4 w-4" aria-hidden="true" />
              <span>Blog</span>
            </p>
            <h1 className="font-display text-4xl font-medium tracking-tight md:text-5xl">
              Notes from building JiraVision
            </h1>
            <p className="prose-body mx-auto mt-4 text-lg text-muted-foreground">
              {blogList.length} articles on AI-assisted delivery, team wellbeing, gamification and
              the ethics of measuring people. Written by the team building the product, and pointing
              at the pages where you can check what we say.
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-md">
            <label htmlFor="blog-search" className="sr-only">
              Search articles
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="blog-search"
                type="search"
                placeholder="Search articles..."
                className="rounded-full bg-card pl-10"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>

          <div
            role="group"
            aria-label="Filter articles by category"
            className="mt-6 flex flex-wrap justify-center gap-3"
          >
            {(["all", ...blogCategories.map((item) => item.id)] as BlogFilter[]).map((option) => (
              <Button
                key={option}
                variant={category === option ? "default" : "outline"}
                className="rounded-full"
                size="sm"
                onClick={() => setCategory(option)}
                aria-pressed={category === option}
              >
                {option === "all"
                  ? "All categories"
                  : blogCategories.find((item) => item.id === option)?.title}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured */}
      {!filtering && featured ? (
        <section className="py-16 md:py-20">
          <div className="container">
            <article className="grid grid-cols-1 overflow-hidden rounded-lg border bg-card shadow-soft md:grid-cols-2">
              <div className="relative min-h-[260px] md:min-h-[420px]">
                <Image
                  src={featured.image}
                  alt={featured.imageAlt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
                <div className="absolute inset-0 bg-foreground/25" aria-hidden="true" />
              </div>
              <div className="flex flex-col justify-center gap-4 p-8 md:p-12">
                <p className="inline-flex w-fit items-center gap-2 rounded-full bg-clay/10 px-3 py-1 font-mono text-xs tracking-[0.18em] text-clay uppercase">
                  <span>Start here</span>
                </p>
                <h2 className="font-display text-3xl font-medium tracking-tight md:text-4xl">
                  <Link
                    href={`/resources/blog/${featured.slug}`}
                    className="transition-colors hover:text-primary"
                  >
                    {featured.title}
                  </Link>
                </h2>
                <p className="text-muted-foreground">{featured.excerpt}</p>
                <PostMeta post={featured} />
                <div className="mt-2">
                  <Button size="lg" asChild>
                    <Link href={`/resources/blog/${featured.slug}`}>
                      Read the guide
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </div>
            </article>
          </div>
        </section>
      ) : null}

      {/* Articles */}
      <section className="bg-surface py-16 md:py-24" id="articles">
        <div className="container">
          <div className="mb-10 md:mb-14">
            <h2 className="font-display text-3xl font-medium tracking-tight md:text-4xl">
              {filtering
                ? `${results.length} matching ${results.length === 1 ? "article" : "articles"}`
                : "All articles"}
            </h2>
            <p className="mt-3 text-muted-foreground">
              Every article links to the documentation or the live dashboard page it describes.
            </p>
          </div>

          {results.length === 0 ? (
            <div className="mx-auto max-w-lg rounded-lg border bg-card p-8 text-center shadow-soft">
              <p className="mb-4">No article matches that search.</p>
              <Button
                variant="outline"
                onClick={() => {
                  setQuery("")
                  setCategory("all")
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {(filtering ? results : rest).map((post) => {
                const Icon = CATEGORY_ICONS[post.category]
                return (
                  <article
                    key={post.slug}
                    className="group flex flex-col overflow-hidden rounded-lg border bg-card shadow-soft transition-shadow hover:shadow-soft-md"
                  >
                    <div className="relative h-44">
                      <Image
                        src={post.image}
                        alt={post.imageAlt}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                      <div className="absolute inset-0 bg-foreground/20" aria-hidden="true" />
                    </div>
                    <div className="flex flex-1 flex-col p-6">
                      <p className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        {blogCategories.find((item) => item.id === post.category)?.title}
                      </p>
                      <h3 className="font-display text-xl font-medium transition-colors group-hover:text-primary">
                        <Link href={`/resources/blog/${post.slug}`}>{post.title}</Link>
                      </h3>
                      <p className="mt-2 mb-5 text-sm leading-relaxed text-muted-foreground">
                        {post.excerpt}
                      </p>
                      <div className="mt-auto">
                        <PostMeta post={post} />
                        <Link
                          href={`/resources/blog/${post.slug}`}
                          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                        >
                          Read article
                          <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 md:py-24" id="categories">
        <div className="container">
          <div className="mb-10 md:mb-14">
            <h2 className="font-display text-3xl font-medium tracking-tight md:text-4xl">
              Browse by category
            </h2>
            <p className="mt-3 text-muted-foreground">
              Counts are the real number of published articles, not a rounded-up promise.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {blogCategories.map((item) => {
              const Icon = CATEGORY_ICONS[item.id]
              const count = postsByCategory(item.id).length
              const active = category === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setCategory(active ? "all" : item.id)
                    document.getElementById("articles")?.scrollIntoView({ behavior: "smooth" })
                  }}
                  aria-pressed={active}
                  className="rounded-lg border bg-card p-6 text-left shadow-soft transition-shadow hover:shadow-soft-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  </span>
                  <span className="font-display block text-lg font-medium">{item.title}</span>
                  <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </span>
                  <span className="mt-4 block font-mono text-xs tracking-wide text-primary uppercase">
                    {count} {count === 1 ? "article" : "articles"}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* How we write these */}
      <section className="bg-surface py-16 md:py-24" id="honesty">
        <div className="container">
          <div className="mb-10 md:mb-14">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-clay/10 px-3 py-1 font-mono text-xs tracking-[0.18em] text-clay uppercase">
              <TriangleAlert className="h-4 w-4" aria-hidden="true" />
              <span>How we write these</span>
            </p>
            <h2 className="font-display text-3xl font-medium tracking-tight md:text-4xl">
              What you will not find in a JiraVision article
            </h2>
            <p className="prose-body mt-3 text-muted-foreground">
              These pages used to carry invented bylines, stock portraits and a list of
              percentages nothing in the product measures. They do not any more.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                title: "No invented bylines",
                body: "Articles are credited to the JiraVision team. When the owner confirms a named author, the byline and their role appear on the article — until then there is no name to get wrong.",
              },
              {
                title: "No result percentages",
                body: "No '40% less admin time'. Where a number matters, the article names the metric and the page you can compute it on, so you measure your own workspace rather than trusting ours.",
              },
              {
                title: "No engagement theatre",
                body: "No comment counts, view counts, likes or share tallies. This page has no comment system and does not pretend to; sharing copies the link instead of posting on your behalf.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-lg border bg-card p-6 shadow-soft">
                <h3 className="font-display text-lg font-medium">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Elsewhere in resources */}
      <section className="py-16 md:py-24" id="resources">
        <div className="container">
          <div className="mb-10 md:mb-14">
            <h2 className="font-display text-3xl font-medium tracking-tight md:text-4xl">
              Elsewhere in resources
            </h2>
            <p className="mt-3 text-muted-foreground">
              The blog explains the thinking. These pages explain the product.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Documentation",
                body: "Setup, API reference, metric formulas and troubleshooting.",
                href: "/resources/documentation",
                cta: "Open the docs",
              },
              {
                title: "Session outlines",
                body: "Three guided walkthroughs you can follow yourself in the dashboard.",
                href: "/resources/webinars",
                cta: "See the sessions",
              },
              {
                title: "Deployment scenarios",
                body: "Worked examples of which settings to turn on, in order.",
                href: "/resources/case-studies",
                cta: "Read the scenarios",
              },
              {
                title: "Changelog",
                body: "What shipped, newest first, with the routes it touched.",
                href: "/changelog",
                cta: "Read the changelog",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex flex-col rounded-lg border bg-card p-6 shadow-soft"
              >
                <h3 className="font-display text-lg font-medium">{item.title}</h3>
                <p className="mt-2 mb-5 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
                <Button variant="outline" size="sm" asChild className="w-fit">
                  <Link href={item.href}>
                    {item.cta}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary text-primary-foreground">
        <div className="container flex flex-col items-center gap-6 py-16 text-center md:py-20">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-medium tracking-tight md:text-4xl">
              Get these in your inbox instead
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-primary-foreground/80 md:text-base">
              Double opt-in, no tracking pixels, and an unsubscribe link in every message.
            </p>
          </div>
          <div className="w-full max-w-md">
            <NewsletterForm source="blog" inverse showHeading={false} />
          </div>
          <div className="flex flex-wrap justify-center gap-3">
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
            <Button
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              asChild
            >
              <Link href="/fit-quiz">Take the fit quiz</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
