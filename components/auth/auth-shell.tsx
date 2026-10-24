"use client"

import Image from "next/image"

interface AuthShellProps {
  /** Unsplash URL for the panel beside the form. */
  image: string
  imageAlt: string
  /** Side the image panel takes from md up; mobile always stacks it on top. */
  imageSide?: "left" | "right"
  panelTitle: string
  panelBody: string
  title: string
  subtitle?: React.ReactNode
  children: React.ReactNode
}

export function AuthShell({
  image,
  imageAlt,
  imageSide = "left",
  panelTitle,
  panelBody,
  title,
  subtitle,
  children,
}: AuthShellProps) {
  const imageFirst = imageSide === "left"

  return (
    <div className="flex min-h-dvh flex-col gap-3 bg-surface p-3 md:h-dvh md:flex-row md:gap-6 md:p-6">
      <div
        className={`relative h-44 shrink-0 overflow-hidden rounded-lg border border-border bg-card shadow-soft md:h-auto md:min-h-0 md:flex-1 ${
          imageFirst ? "md:order-1" : "md:order-2"
        }`}
      >
        <Image
          src={image}
          alt={imageAlt}
          fill
          priority
          className="object-cover"
          sizes="(max-width: 767px) 100vw, 50vw"
        />
        {/* bg-foreground keeps the scrim theme-aware: dark in light mode, light in dark mode. */}
        <div aria-hidden="true" className="absolute inset-0 bg-foreground/55" />
        <div className="absolute inset-x-0 bottom-0 p-5 text-background md:p-8">
          <h2 className="font-display text-xl font-medium tracking-tight md:text-3xl">{panelTitle}</h2>
          <p className="mt-2 max-w-md text-sm text-background/85 md:text-base">{panelBody}</p>
        </div>
      </div>

      <div
        className={`flex min-h-0 flex-1 flex-col overflow-y-auto rounded-lg border border-border bg-card shadow-soft ${
          imageFirst ? "md:order-2" : "md:order-1"
        }`}
      >
        {/* my-auto (not justify-center) so tall forms scroll instead of clipping at the top. */}
        <div className="mx-auto my-auto w-full max-w-sm p-6 md:p-10">
          <h1 className="font-display text-2xl font-medium tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  )
}
