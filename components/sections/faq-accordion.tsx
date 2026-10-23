"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export function FaqAccordion({ items }: { items: { q: string; a: string }[] }) {
  return (
    <Accordion type="single" collapsible className="max-w-3xl divide-y divide-border rounded-lg border bg-card px-5">
      {items.map((item, i) => (
        <AccordionItem key={item.q} value={`item-${i}`} className="border-0">
          <AccordionTrigger className="py-4 text-left text-sm font-medium hover:no-underline">
            {item.q}
          </AccordionTrigger>
          <AccordionContent className="pb-4 text-sm leading-relaxed text-muted-foreground">
            {item.a}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
