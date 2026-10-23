"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { mockups } from "@/components/mockups/product-mockups"
import { Section, SectionHeading } from "@/components/sections/section"
import { tour, useCases } from "@/content/home"

export function ProductTour() {
  return (
    <Section className="border-y bg-surface">
      <SectionHeading eyebrow="Product tour" title="See the working views" className="mx-auto text-center" />
      <Tabs defaultValue={tour[0].id}>
        <TabsList className="mx-auto flex w-full max-w-xl flex-wrap justify-center">
          {tour.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="text-xs md:text-sm">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tour.map((tab) => {
          const Mock = mockups[tab.mockup]
          return (
            <TabsContent key={tab.id} value={tab.id} className="mt-8">
              <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
                <div className="max-w-md">
                  <h3 className="font-display text-2xl font-medium tracking-tight">{tab.title}</h3>
                  <p className="prose-body mt-3">{tab.body}</p>
                </div>
                <Mock />
              </div>
            </TabsContent>
          )
        })}
      </Tabs>
    </Section>
  )
}

export function UseCases() {
  return (
    <Section>
      <SectionHeading eyebrow="Use cases" title={useCases.title} className="mx-auto text-center" />
      <Tabs defaultValue={useCases.tabs[0].id} className="mx-auto max-w-3xl">
        <TabsList className="mx-auto flex w-full max-w-xl flex-wrap justify-center">
          {useCases.tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="text-xs md:text-sm">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {useCases.tabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="mt-8 rounded-lg border bg-card p-8 shadow-soft">
            <h3 className="font-display text-xl font-medium tracking-tight md:text-2xl">{tab.headline}</h3>
            <p className="prose-body mt-3">{tab.body}</p>
            <ul className="mt-5 grid gap-2 sm:grid-cols-3">
              {tab.bullets.map((b) => (
                <li key={b} className="rounded-md bg-muted/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                  {b}
                </li>
              ))}
            </ul>
          </TabsContent>
        ))}
      </Tabs>
    </Section>
  )
}
