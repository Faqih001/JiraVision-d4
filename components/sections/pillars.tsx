import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"
import { mockups } from "@/components/mockups/product-mockups"
import { Section, SectionHeading, Reveal } from "@/components/sections/section"
import { getPageContent } from "@/lib/cms"

export async function Pillars() {
  const { pillars } = await getPageContent("home")
  return (
    <Section bg="grain">
      <SectionHeading
        eyebrow="The four pillars"
        title="One system for planning, people and fairness"
        intro="Each pillar works alone; together they keep delivery commitments and team health in the same conversation."
      />
      <div className="space-y-16 md:space-y-24">
        {pillars.map((pillar, i) => {
          const Mock = mockups[pillar.mockup]
          const flipped = i % 2 === 1
          return (
            <Reveal key={pillar.title}>
              <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
                <div className={flipped ? "lg:order-2" : undefined}>
                  <h3 className="font-display text-2xl font-medium tracking-tight md:text-3xl">{pillar.title}</h3>
                  <p className="prose-body mt-3">{pillar.summary}</p>
                  <ul className="mt-5 space-y-2">
                    {pillar.points.map((p) => (
                      <li key={p} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                        {p}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={pillar.href}
                    className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    Explore {pillar.title}
                    <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />
                  </Link>
                </div>
                <div className={flipped ? "lg:order-1" : undefined}>
                  <Mock />
                </div>
              </div>
            </Reveal>
          )
        })}
      </div>
    </Section>
  )
}
