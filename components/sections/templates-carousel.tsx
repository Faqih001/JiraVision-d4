"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowRight, FileStack } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel"
import { Section, SectionHeading } from "@/components/sections/section"
import { templateCategories, templates, type TemplateCategory } from "@/content/templates"
import { cn } from "@/lib/utils"
import { useSyncExternalStore } from "react"

const subscribeNoop = () => () => {}
const getTrue = () => true
const getServerFalse = () => false

export function TemplatesCarousel() {
  const mounted = useSyncExternalStore(subscribeNoop, getTrue, getServerFalse)
  const [filter, setFilter] = useState<TemplateCategory | "All">("All")
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)

  const visible = useMemo(
    () => (filter === "All" ? templates : templates.filter((t) => t.category === filter)),
    [filter],
  )

  return (
    <Section id="templates" bg="stacked">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          className="mb-0"
          eyebrow="Steal our playbooks"
          title="Starter templates for calmer delivery"
          intro="Twelve routines we hand new workspaces on day one. Browse a few — the full library ships inside the product."
        />
        <div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex">
          <FileStack className="h-4 w-4" aria-hidden />
          {visible.length} of {templates.length} shown
        </div>
      </div>

      <div className="mb-8 flex flex-wrap gap-2" role="group" aria-label="Filter templates by category">
        {(["All", ...templateCategories] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilter(cat)}
            aria-pressed={filter === cat}
            className={cn(
              "min-h-[40px] rounded-full border px-4 text-sm transition-colors",
              filter === cat
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:border-foreground/30",
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      <Carousel
        key={filter}
        setApi={setApi}
        opts={{ align: "start", skipSnaps: true }}
        className="pb-12"
      >
        <CarouselContent>
          {visible.map((tpl) => (
            <CarouselItem key={tpl.id} className="md:basis-1/2 lg:basis-1/3">
              <article className="flex h-full flex-col rounded-lg border border-border bg-card p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <Badge variant="outline" className="text-xs">{tpl.category}</Badge>
                  <span className="font-mono text-[11px] text-muted-foreground">{tpl.id}</span>
                </div>
                <h3 className="font-display text-lg font-medium tracking-tight">{tpl.title}</h3>
                <p className="prose-body mt-2 text-sm">{tpl.summary}</p>
                <ul className="mt-4 space-y-1 border-t border-border pt-4 text-xs text-muted-foreground">
                  {tpl.includes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p className="mt-auto pt-4 text-xs text-muted-foreground">
                  For: <span className="text-foreground">{tpl.forStage}</span>
                </p>
              </article>
            </CarouselItem>
          ))}
        </CarouselContent>
        <div className="flex items-center gap-3">
          <CarouselPrevious className="static translate-y-0" />
          <CarouselNext className="static translate-y-0" />
          {mounted && api && (
            <span className="ml-2 font-mono text-xs text-muted-foreground" aria-live="polite">
              {current + 1} / {api.scrollSnapList().length}
            </span>
          )}
        </div>
      </Carousel>

      <p className="mt-2 text-sm text-muted-foreground">
        Want one adapted to your workflow?{" "}
        <Link
          href="/contact"
          className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
        >
          Ask us
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </p>
    </Section>
  )
}
