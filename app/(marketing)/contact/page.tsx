import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Clock, Mail, MapPin, MessageSquare, Phone } from "lucide-react"

import { Section, SectionHeading, Reveal } from "@/components/sections/section"
import { ContactFormTabs } from "@/components/forms/contact-form-tabs"
import { WhatsAppButton } from "@/components/whatsapp-button"
import { GoogleMap } from "@/components/google-map"
import { Button } from "@/components/ui/button"
import { contactDetails, contactDepartments } from "@/content/site"
import { overallStatus } from "@/content/status"

export const metadata: Metadata = {
  title: "Contact — JiraVision",
  description:
    "Talk to the JiraVision team: send a message, book a live demo, or request a tailored quote. We reply within one business day.",
  openGraph: {
    title: "Contact JiraVision",
    description: "Send a message, book a demo, or request a quote — we reply within one business day.",
    url: "https://jiravision.vercel.app/contact",
  },
}

const center = { lat: -0.1673, lng: 36.1091 }

export default function ContactPage() {
  // The previous v0 build shipped a live Google Maps key in source; it must be
  // revoked in Google Cloud Console and provided via env (see .env.example).
  const hasMapKey = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)
  const mapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contactDetails.mapQuery)}`

  return (
    <>
      <Section bg="grain" className="pt-20 md:pt-28">
        <div className="max-w-3xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-clay">Contact</p>
          <h1 className="font-display text-4xl font-medium tracking-tight md:text-5xl">
            Talk to a human at JiraVision
          </h1>
          <p className="prose-body mt-4 max-w-2xl">
            Questions about the product, pricing or a pilot? Pick the fastest route below — every message
            lands with the team, and we reply within one business day.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full bg-success"
              />
              {overallStatus}
            </span>
            <a href={contactDetails.phoneHref} className="underline-offset-4 hover:underline">
              {contactDetails.phone}
            </a>
            <a href={`mailto:${contactDetails.email}`} className="underline-offset-4 hover:underline">
              {contactDetails.email}
            </a>
          </div>
        </div>
      </Section>

      <Section bg="grid">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14">
          <Reveal>
            <div className="rounded-2xl border border-border bg-background p-6 shadow-soft md:p-8">
              <h2 className="font-display text-2xl font-medium tracking-tight">How can we help?</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Choose a tab — each goes straight to the right queue.
              </p>
              <div className="mt-6">
                <ContactFormTabs />
              </div>
            </div>
          </Reveal>

          <div className="space-y-6">
            <Reveal>
              <div className="rounded-2xl border border-border bg-surface p-6">
                <h2 className="font-display text-xl font-medium">Direct lines</h2>
                <ul className="mt-4 space-y-4 text-sm">
                  <li className="flex items-start gap-3">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <div>
                      <a href={contactDetails.phoneHref} className="font-medium hover:underline">
                        {contactDetails.phone}
                      </a>
                      <p className="text-muted-foreground">Voice &amp; WhatsApp during business hours.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <div>
                      <a href={`mailto:${contactDetails.email}`} className="block font-medium hover:underline">
                        {contactDetails.email}
                      </a>
                      <a
                        href={`mailto:${contactDetails.supportEmail}`}
                        className="block text-muted-foreground hover:underline"
                      >
                        {contactDetails.supportEmail}
                      </a>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <div>
                      <p className="font-medium">{contactDetails.address.line1}</p>
                      <p className="text-muted-foreground">{contactDetails.address.line2}</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <div>
                      <p className="font-medium">{contactDetails.hours.days}</p>
                      <p className="text-muted-foreground">{contactDetails.hours.time}</p>
                    </div>
                  </li>
                </ul>
                <div className="mt-5 border-t border-border pt-4">
                  <WhatsAppButton phoneNumber={contactDetails.whatsapp} />
                </div>
              </div>
            </Reveal>

            <Reveal>
              <div className="overflow-hidden rounded-2xl border border-border">
                {hasMapKey ? (
                  <div className="h-64">
                    <GoogleMap center={center} />
                  </div>
                ) : (
                  <div className="flex h-64 flex-col items-center justify-center gap-3 bg-surface p-6 text-center">
                    <MapPin className="h-6 w-6 text-primary" aria-hidden="true" />
                    <p className="text-sm font-medium">
                      {contactDetails.address.line1}, {contactDetails.address.line2}
                    </p>
                    <p className="max-w-xs text-xs text-muted-foreground">
                      Interactive map hidden until a Google Maps key is configured — the address below works
                      in any maps app.
                    </p>
                    <Button asChild variant="outline" size="sm">
                      <a href={mapsSearchUrl} target="_blank" rel="noopener noreferrer">
                        Open in Google Maps
                        <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            </Reveal>
          </div>
        </div>
      </Section>

      <Section bg="band-clay">
        <SectionHeading
          eyebrow="Departments"
          title="Reach the right team first time"
          intro="Prefer email? Route your note directly — the same addresses are behind the topic dropdown in the form."
        />
        <div className="grid gap-6 md:grid-cols-3">
          {contactDepartments.map((dept) => (
            <Reveal key={dept.title}>
              <div className="flex h-full flex-col rounded-2xl border border-border bg-background p-6">
                <h3 className="font-display text-lg font-medium">{dept.title}</h3>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{dept.body}</p>
                <a
                  href={`mailto:${dept.email}`}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  {dept.email}
                </a>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section bg="contour">
        <div className="mx-auto max-w-3xl">
          <SectionHeading eyebrow="What happens next" title="From your message to a real answer" className="mx-auto text-center" />
          <ol className="mt-2 grid gap-6 text-left sm:grid-cols-3">
            {[
              {
                step: "1",
                title: "Stored & acknowledged",
                body: "Your note lands in our inbox with a copy of every detail you entered.",
              },
              {
                step: "2",
                title: "Routed to the team",
                body: "Sales questions, support tickets and pilots each reach the right person.",
              },
              {
                step: "3",
                title: "Reply in 1 business day",
                body: "A real teammate answers — demos get scheduled, quotes get priced.",
              },
            ].map((s) => (
              <li key={s.step} className="rounded-2xl border border-border bg-background p-5">
                <span className="font-display text-2xl text-clay" aria-hidden="true">
                  {s.step}
                </span>
                <h3 className="mt-2 font-medium">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      <Section bg="inverse" watermark="C" className="text-center">
        <MessageSquare className="mx-auto h-6 w-6" aria-hidden="true" />
        <h2 className="mx-auto mt-4 max-w-xl font-display text-3xl font-medium tracking-tight">
          Looking for a quick answer instead?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Most questions about plans, data handling and setup are already answered — and live platform
          status is one click away.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild variant="secondary" size="lg">
            <Link href="/faq">Browse the FAQ</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
            <Link href="/status">Check live status</Link>
          </Button>
        </div>
      </Section>
    </>
  )
}
