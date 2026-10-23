"use client"

import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { ArrowRight, Github, Linkedin, Twitter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { footerColumns, newsletter, socialLinks } from "@/content/site"

const socialIcons = {
  twitter: Twitter,
  linkedin: Linkedin,
  github: Github,
}

function NewsletterForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{newsletter.title}</h3>
      <p className="mb-3 text-sm text-muted-foreground">{newsletter.description}</p>
      {status === "success" ? (
        <p className="text-sm text-success" role="status">
          Thanks — you&apos;re on the list.
        </p>
      ) : (
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault()
            const email = new FormData(e.currentTarget).get("email")
            setStatus("loading")
            try {
              const res = await fetch(newsletter.endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
              })
              setStatus(res.ok ? "success" : "error")
            } catch {
              setStatus("error")
            }
          }}
        >
          <Input
            type="email"
            name="email"
            required
            placeholder="you@company.com"
            aria-label="Email address"
            className="min-w-0 flex-1"
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

export function Footer() {
  return (
    <footer className="border-t bg-surface">
      <div className="container py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <Link href="/" className="mb-4 flex items-center gap-2.5" aria-label="JiraVision home">
              <Image src="/jiravision_logo.png" alt="" width={30} height={30} className="object-contain" />
              <span className="font-display text-lg font-semibold tracking-tight">JiraVision</span>
            </Link>
            <p className="text-sm leading-relaxed text-muted-foreground">
              AI-native project management that puts team wellbeing and ethical metrics first.
            </p>
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
            {newsletter.enabled && (
              <div className="mt-6">
                <NewsletterForm />
              </div>
            )}
          </div>

          {footerColumns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h3 className="mb-3 text-sm font-semibold">{column.title}</h3>
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
          ))}

          {newsletter.enabled && (
            <div>
              <NewsletterForm />
            </div>
          )}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center">
          <p>&copy; {new Date().getFullYear()} JiraVision. All rights reserved.</p>
          <p>
            <Link href="/legal-notice" className="transition-colors duration-150 hover:text-foreground">
              Legal Notice
            </Link>
          </p>
        </div>
      </div>
    </footer>
  )
}
