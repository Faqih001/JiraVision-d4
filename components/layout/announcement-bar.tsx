"use client"

import Link from "next/link"
import { useSyncExternalStore } from "react"
import { ArrowUpRight, X } from "lucide-react"
import { announcement } from "@/content/site"
import { overallStatus } from "@/content/status"

const DISMISS_KEY = "jv-announcement-dismissed"
const DISMISS_EVENT = "jv-announcement-dismiss"

function subscribe(onChange: () => void) {
  window.addEventListener(DISMISS_EVENT, onChange)
  return () => window.removeEventListener(DISMISS_EVENT, onChange)
}

const getSnapshot = () => localStorage.getItem(DISMISS_KEY) === "1"
// Hidden during SSR/hydration so markup matches the server; shown right after if not dismissed.
const getServerSnapshot = () => true

export function AnnouncementBar() {
  const dismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  if (dismissed) return null

  return (
    <div className="border-b border-primary-foreground/10 bg-primary text-primary-foreground">
      <div className="container flex h-9 items-center justify-between gap-3 text-xs md:text-sm">
        <Link href={announcement.href} className="group flex min-w-0 items-center gap-2 font-medium hover:underline">
          <span className="shrink-0 rounded-full bg-primary-foreground/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
            {announcement.label}
          </span>
          <span className="truncate">{announcement.text}</span>
          <span aria-hidden="true" className="transition-transform duration-150 group-hover:translate-x-0.5">
            &rarr;
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-4">
          <Link
            href="/status"
            className="hidden items-center gap-1.5 text-primary-foreground/85 transition-colors duration-150 hover:text-primary-foreground sm:flex"
          >
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[hsl(148_40%_60%)]" />
            {overallStatus}
          </Link>
          <Link
            href="/resources/documentation"
            className="hidden items-center gap-1 text-primary-foreground/85 transition-colors duration-150 hover:text-primary-foreground md:flex"
          >
            Docs
            <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
          </Link>
          <button
            type="button"
            aria-label="Dismiss announcement"
            className="rounded p-1 transition-colors duration-150 hover:bg-primary-foreground/15"
            onClick={() => {
              localStorage.setItem(DISMISS_KEY, "1")
              window.dispatchEvent(new Event(DISMISS_EVENT))
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
