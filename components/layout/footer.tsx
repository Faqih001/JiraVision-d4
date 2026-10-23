"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { ArrowRight, ArrowUp, ChevronDown, Github, Linkedin, Twitter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LanguageSelector } from "@/components/layout/language-selector"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { OPEN_CONSENT_EVENT } from "@/lib/consent"
import { useLocale } from "@/lib/i18n/use-locale"
import { overallStatus, services } from "@/content/status"
import {
  footerClosing,
  footerColumns,
  newsletter,
  socialLinks,
  type FooterColumn,
} from "@/content/site"
import { cn } from "@/lib/utils"

const socialIcons = {
  twitter: Twitter,
  linkedin: Linkedin,
  github: Github,
}

function StatusChip() {
  const allOk = services.every((s) => s.status === "operational")
  return (
    <Link
      href="/status"
      className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
    >
      <span className={cn("h-2 w-2 rounded-full", allOk ? "bg-success" : "bg-warning")} aria-hidden="true" />
      {overallStatus}
    </Link>
  )
}

function NewsletterForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{newsletter.title}</h3>
      <p className="mb-4 text-sm text-muted-foreground">{newsletter.description}</p>
      {status === "success" ? (
        <p className="text-sm text-success" role="status">
          {newsletter.successNotice}
        </p>
      ) : (
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault()
            const data = new FormData(e.currentTarget)
            setStatus("loading")
            try {
              const res = await fetch(newsletter.endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: data.get("email"),
                  source: "footer",
                  // Honeypot: real users never fill this; bots do.
                  company: data.get("company") ?? "",
                }),
              })
              setStatus(res.ok ? "success" : "error")
            } catch {
              setStatus("error")
            }
          }}
        >
          <input
            type="text"
            name="company"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute left-[-9999px] h-0 w-0 opacity-0"
          />
          <Input
            type="email"
            name="email"
            required
            placeholder="you@company.com"
            aria-label="Email address"
            className="min-w-0 flex-1 bg-background"
            disabled={status === "loading"}
          />
          <Button type="submit" size="icon" aria-label="Subscribe" disabled={status === "loading"}>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
      )}
      {status === "error" && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          Something went wrong. Please try again.
        </p>
      )}
    </div>
  )
}

function FooterColumnNav({ column }: { column: FooterColumn }) {
  const { t } = useLocale()
  const label = t(`footer.${column.title.toLowerCase()}`)
  return (
    <>
      <details className="group border-b border-border/60 lg:hidden">
        <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between py-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">
          {label}
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none group-open:rotate-180" />
        </summary>
        <ul className="space-y-2 pb-4">
          {column.links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="block py-1 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </details>
      <nav aria-label={column.title} className="hidden lg:block">
        <h3 className="mb-3 text-sm font-semibold">{label}</h3>
        <ul className="space-y-2">
          {column.links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  )
}

export function Footer() {
  const { t } = useLocale()
  const backToTop = () => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" })
  }

  return (
    <footer className="border-t bg-surface">
      <div className="container pt-14 md:pt-16">
        {/* Closing statement + email capture */}
        <div className="grid gap-10 border-b border-border pb-12 lg:grid-cols-[1.2fr_1fr] lg:items-start">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl font-medium tracking-tight md:text-4xl">
              {footerClosing.title}
            </h2>
            <p className="prose-body mt-3">{footerClosing.body}</p>
            <Button asChild className="mt-6">
              <Link href={footerClosing.cta.href}>
                {footerClosing.cta.label}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          {newsletter.enabled && (
            <div className="rounded-lg border border-border bg-background p-6">
              <NewsletterForm />
            </div>
          )}
        </div>

        {/* Brand + link grid */}
        <div className="grid gap-8 py-12 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] lg:gap-10">
          <div className="max-w-sm">
            <Link href="/" className="mb-4 flex items-center gap-2.5" aria-label="JiraVision home">
              <Image src="/jiravision_logo.png" alt="" width={30} height={30} className="object-contain" />
              <span className="font-display text-lg font-semibold tracking-tight">JiraVision</span>
            </Link>
            <p className="text-sm leading-relaxed text-muted-foreground">
              AI-native project management that puts team wellbeing and ethical metrics first.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <StatusChip />
              <ThemeToggle className="h-8 w-8" />
              <LanguageSelector className="rounded-full border border-border bg-background px-3 py-1.5 text-xs" />
            </div>
            {socialLinks.length > 0 && (
              <ul className="mt-5 flex gap-2">
                {socialLinks.map((link) => {
                  const Icon = socialIcons[link.icon]
                  return (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        aria-label={link.label}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors duration-150 hover:text-foreground"
                      >
                        <Icon className="h-4 w-4" />
                      </a>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {footerColumns.map((column) => (
            <FooterColumnNav key={column.title} column={column} />
          ))}
        </div>

        {/* Outlined wordmark flourish */}
        <div aria-hidden="true" className="select-none overflow-hidden pt-6">
          <span className="block whitespace-nowrap text-center font-display text-[clamp(4rem,15vw,11rem)] font-bold leading-[1.1] tracking-tight text-transparent [-webkit-text-stroke:1px_hsl(var(--border))]">
            JiraVision
          </span>
        </div>

        {/* Compliance row */}
        <div className="mt-6 flex flex-col gap-4 border-t border-border py-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>&copy; {new Date().getFullYear()} JiraVision. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))}
              className="text-xs transition-colors duration-150 hover:text-foreground"
            >
              Cookie preferences
            </button>
            <nav aria-label="Legal links">
              <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
                {footerColumns
                  .find((c) => c.title === "Legal")!
                  .links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="transition-colors duration-150 hover:text-foreground">
                        {link.label}
                      </Link>
                    </li>
                  ))}
              </ul>
            </nav>
          </div>
          <button
            type="button"
            onClick={backToTop}
            className="inline-flex min-h-[40px] items-center gap-1.5 self-start text-sm font-medium transition-colors duration-150 hover:text-foreground md:self-auto lg:mr-16"
          >
            <ArrowUp className="h-4 w-4" />
            {t("footer.backToTop")}
          </button>
        </div>
      </div>
    </footer>
  )
}
