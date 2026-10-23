"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ContactForm } from "@/components/forms/contact-form"
import { DemoForm } from "@/components/forms/demo-form"
import { QuoteForm } from "@/components/forms/quote-form"

const tabs = [
  {
    value: "message",
    label: "Send a message",
    form: <ContactForm />,
  },
  {
    value: "demo",
    label: "Book a demo",
    form: <DemoForm />,
  },
  {
    value: "quote",
    label: "Get a quote",
    form: <QuoteForm />,
  },
]

export function ContactFormTabs() {
  return (
    <Tabs defaultValue="message">
      <TabsList className="grid w-full grid-cols-3">
        {tabs.map((t) => (
          <TabsTrigger key={t.value} value={t.value} className="text-xs sm:text-sm">
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((t) => (
        <TabsContent key={t.value} value={t.value} className="mt-6">
          {t.form}
        </TabsContent>
      ))}
    </Tabs>
  )
}
