"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowRight, ArrowUp, ChevronDown, Github, Linkedin, Twitter } from "lucide-react"
import { Button } from "@/components/ui/button"
import NewsletterForm from "@/components/newsletter-form"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { OPEN_CONSENT_EVENT } from "@/lib/consent"
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

function FooterColumnNav({ column }: { column: FooterColumn }) {
  const label = column.title
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
              <NewsletterForm source="footer" />
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

        {/* Outlined wordmark flourish. The gleam lives in globals.css: it clips a
            gradient to the glyphs, so text-transparent and the hairline stroke stay as
            they were and only the paint inside the letters moves. */}
        <div aria-hidden="true" className="select-none overflow-hidden pt-6">
          <span className="jv-wordmark block whitespace-nowrap text-center font-display text-[clamp(4rem,15vw,11rem)] font-bold leading-[1.1] tracking-tight text-transparent [-webkit-text-stroke:1px_hsl(var(--border))]">
            JiraVision
          </span>
        </div>

        {/* Compliance row. Below xl the three groups stack; from xl they share one line,
            so no control wraps under another and the legal list stays readable. */}
        <div className="mt-6 flex flex-col gap-4 border-t border-border py-6 text-sm text-muted-foreground xl:flex-row xl:items-center xl:justify-between xl:gap-6">
          <p className="whitespace-nowrap">&copy; {new Date().getFullYear()} JiraVision. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 xl:flex-nowrap">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))}
              className="whitespace-nowrap text-xs transition-colors duration-150 hover:text-foreground"
            >
              Cookie preferences
            </button>
            <nav aria-label="Legal links">
              <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs xl:flex-nowrap">
                {footerColumns
                  .find((c) => c.title === "Legal")!
                  .links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="whitespace-nowrap transition-colors duration-150 hover:text-foreground"
                      >
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
            className="inline-flex min-h-[40px] items-center gap-1.5 self-start whitespace-nowrap text-sm font-medium transition-colors duration-150 hover:text-foreground xl:self-auto xl:mr-16"
          >
            <ArrowUp className="h-4 w-4" />
            Back to top
          </button>
        </div>
      </div>
    </footer>
  )
}
