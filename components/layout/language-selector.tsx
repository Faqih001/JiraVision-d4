"use client"

import { Globe } from "lucide-react"
import { locales, setLocale, type LocaleCode } from "@/lib/i18n/config"
import { useLocale } from "@/lib/i18n/use-locale"
import { cn } from "@/lib/utils"

export function LanguageSelector({ className }: { className?: string }) {
  const { locale, t } = useLocale()
  return (
    <label className={cn("inline-flex items-center gap-1.5 text-muted-foreground", className)}>
      <Globe className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="sr-only">{t("footer.language")}</span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as LocaleCode)}
        className="cursor-pointer appearance-none bg-transparent text-xs font-medium text-inherit outline-none focus-visible:underline"
      >
        {locales.map((l) => (
          <option key={l.code} value={l.code} className="text-foreground">
            {l.label}
          </option>
        ))}
      </select>
    </label>
  )
}
