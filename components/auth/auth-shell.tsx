"use client"

import Image from "next/image"

interface AuthShellProps {
  /** Unsplash URL for the side panel; omit for a narrow centered card. */
  image?: string
  imageAlt?: string
  panelTitle?: string
  panelBody?: string
  title: string
  subtitle?: React.ReactNode
  children: React.ReactNode
}

export function AuthShell({ image, imageAlt, panelTitle, panelBody, title, subtitle, children }: AuthShellProps) {
  if (!image) {
    return (
      <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center bg-surface px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-soft md:p-8">
          <h1 className="font-display text-2xl font-medium tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center bg-surface px-4 py-12">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-background shadow-soft md:grid-cols-2">
        <div className="relative hidden md:block">
          <Image src={image} alt={imageAlt ?? ""} fill priority className="object-cover" sizes="50vw" />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent"
          />
          <div className="absolute inset-x-0 bottom-0 flex flex-col justify-end p-8 text-white">
            <h2 className="font-display text-2xl font-medium tracking-tight">{panelTitle}</h2>
            <p className="mt-2 text-sm text-white/85">{panelBody}</p>
          </div>
        </div>
        <div className="p-6 md:p-10">
          <div className="mx-auto flex h-full w-full max-w-sm flex-col justify-center">
            <h1 className="font-display text-2xl font-medium tracking-tight">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
            <div className="mt-6">{children}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
