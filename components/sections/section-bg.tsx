import { cn } from "@/lib/utils"

export type BgVariant =
  | "grain"
  | "dots"
  | "grid"
  | "contour"
  | "hatch"
  | "shapes"
  | "inverse"
  | "band-clay"
  | "band-sage"
  | "stacked"

const variantClass: Record<BgVariant, string> = {
  grain: "jv-bg-grain",
  dots: "jv-bg-dots",
  grid: "jv-bg-grid",
  contour: "jv-bg-contour",
  hatch: "jv-bg-hatch",
  shapes: "jv-bg-shapes",
  inverse: "jv-bg-inverse",
  "band-clay": "jv-bg-band-clay",
  "band-sage": "jv-bg-band-sage",
  stacked: "jv-bg-stacked",
}

/**
 * Decorative section background layer. The parent must be `relative` (Section does this).
 * `inverse` is a dark band on both themes — pair it with inverted text (Section handles it).
 */
export function SectionBg({ variant, watermark }: { variant: BgVariant; watermark?: string }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className={cn("absolute inset-0", variantClass[variant])} />
      {watermark && <span className="jv-watermark">{watermark}</span>}
    </div>
  )
}
