"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { SectionBg, type BgVariant } from "@/components/sections/section-bg"

export function Section({
  id,
  className,
  bg,
  watermark,
  children,
}: {
  id?: string
  className?: string
  /** Decorative background treatment from the v2 library. */
  bg?: BgVariant
  watermark?: string
  children: React.ReactNode
}) {
  const invert = bg === "inverse"
  return (
    <section id={id} className={cn("relative py-16 md:py-24", invert && "jv-invert", className)}>
      {bg && <SectionBg variant={bg} watermark={watermark} />}
      <div className="container relative">{children}</div>
    </section>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  intro,
  className,
}: {
  eyebrow?: string
  title: string
  intro?: string
  className?: string
}) {
  return (
    <div className={cn("mb-10 max-w-2xl md:mb-14", className)}>
      {eyebrow && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-clay">{eyebrow}</p>
      )}
      <h2 className="font-display text-3xl font-medium tracking-tight md:text-4xl">{title}</h2>
      {intro && <p className="prose-body mt-3">{intro}</p>}
    </div>
  )
}

// Subtle fade/slide on first scroll into view; inert under prefers-reduced-motion (global CSS kill-switch).
export function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShown(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={cn(
        "transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none",
        shown ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100",
        className,
      )}
    >
      {children}
    </div>
  )
}
