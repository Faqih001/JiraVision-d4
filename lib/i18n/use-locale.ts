"use client"

import { useSyncExternalStore } from "react"
import { getLocaleServerSnapshot, getLocaleSnapshot, subscribeLocale } from "@/lib/i18n/config"
import { translate } from "@/content/i18n"

export function useLocale() {
  const locale = useSyncExternalStore(subscribeLocale, getLocaleSnapshot, getLocaleServerSnapshot)
  return { locale, t: (key: string) => translate(locale, key) }
}
