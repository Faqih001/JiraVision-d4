import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SprintBoardMock } from "@/components/mockups/product-mockups"
import { builtOn, hero } from "@/content/home"

export function Hero() {
  return (
    <section className="border-b bg-surface">
      <div className="container grid items-center gap-12 py-16 md:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-clay">{hero.eyebrow}</p>
          <h1 className="max-w-xl font-display text-4xl font-medium leading-[1.1] tracking-tight md:text-5xl lg:text-[3.25rem]">
            {hero.title}
          </h1>
          <p className="prose-body mt-5 max-w-lg text-base md:text-lg">{hero.subtitle}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href={hero.primaryCta.href}>{hero.primaryCta.label}</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href={hero.secondaryCta.href}>
                {hero.secondaryCta.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
        <div className="lg:pl-4">
          <SprintBoardMock />
        </div>
      </div>

      {/* "Built on / works with" strip — the honest alternative to a trusted-by bar. */}
      <div className="border-t">
        <div className="container flex flex-col gap-4 py-6 md:flex-row md:items-center md:gap-10">
          <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {builtOn.statement}
          </span>
          <ul className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
            {builtOn.items.map((item) => (
              <li key={item.name} className="text-muted-foreground">
                <span className="font-medium text-foreground">{item.name}</span>
                <span className="ml-1.5 text-xs">· {item.note}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
