"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Section, SectionHeading } from "@/components/sections/section"
import { FaqMoreLink } from "@/components/sections/home-misc"
import { faqTeaser } from "@/content/home"

export function FaqTeaser() {
  return (
    <Section bg="hatch" className="border-t bg-surface">
      <SectionHeading eyebrow="FAQ" title={faqTeaser.title} />
      <Accordion type="single" collapsible className="max-w-3xl divide-y divide-border border-y">
        {faqTeaser.items.map((item, i) => (
          <AccordionItem key={item.q} value={`faq-${i}`} className="border-0">
            <AccordionTrigger className="text-left text-sm font-medium hover:no-underline md:text-base">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="text-sm leading-relaxed text-muted-foreground">{item.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <FaqMoreLink />
    </Section>
  )
}
