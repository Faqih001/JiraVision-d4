"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Section, SectionHeading } from "@/components/sections/section"
import { faqTeaser as defaultFaqTeaser } from "@/content/home"

export function FaqTeaser({ content = defaultFaqTeaser }: { content?: typeof defaultFaqTeaser }) {
  return (
    <Section bg="hatch" className="border-t bg-surface">
      <SectionHeading eyebrow="FAQ" title={content.title} />
      <Accordion type="single" collapsible className="max-w-3xl divide-y divide-border border-y">
        {content.items.map((item, i) => (
          <AccordionItem key={item.q} value={`faq-${i}`} className="border-0">
            <AccordionTrigger className="text-left text-sm font-medium hover:no-underline md:text-base">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="text-sm leading-relaxed text-muted-foreground">{item.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <Link
        href={content.moreLink.href}
        className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        {content.moreLink.label}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </Section>
  )
}
