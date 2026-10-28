"use client"

import Link from "next/link"
import { useEffect, useState, useSyncExternalStore } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  OPEN_CONSENT_EVENT,
  getConsentServerSnapshot,
  getConsentSnapshot,
  setConsent,
  subscribeConsent,
} from "@/lib/consent"
import { syncAnalyticsScript, track } from "@/lib/analytics"

// Hydration-safe "is client" flag: false on the server, true after mount.
const subscribeNoop = () => () => {}
const mountedSnapshot = () => true
const mountedServerSnapshot = () => false

export function CookieConsent() {
  const mounted = useSyncExternalStore(subscribeNoop, mountedSnapshot, mountedServerSnapshot)
  const consent = useSyncExternalStore(subscribeConsent, getConsentSnapshot, getConsentServerSnapshot)
  const [panelOpen, setPanelOpen] = useState(false)
  const [analytics, setAnalytics] = useState(false)
  const [marketing, setMarketing] = useState(false)

  useEffect(() => {
    if (consent?.analytics) syncAnalyticsScript()
  }, [consent])

  useEffect(() => {
    const open = () => {
      const current = getConsentSnapshot()
      setAnalytics(current?.analytics ?? false)
      setMarketing(current?.marketing ?? false)
      setPanelOpen(true)
    }
    window.addEventListener(OPEN_CONSENT_EVENT, open)
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, open)
  }, [])

  const save = (next: { analytics: boolean; marketing: boolean }) => {
    setConsent(next)
    syncAnalyticsScript()
    track("cookie_consent", { analytics: next.analytics, marketing: next.marketing })
    setPanelOpen(false)
  }

  return (
    <>
      {mounted && !consent && !panelOpen && (
        <div
          role="region"
          aria-label="Cookie consent"
          // Rests on top of the right-edge stack (accessibility launcher, then the
          // assistant pill), so the bar never covers a control and no control has to
          // watch for the bar. 12.25rem clears the stack below lg, 9.25rem from lg up.
          className="fixed inset-x-4 bottom-[calc(12.25rem+env(safe-area-inset-bottom))] z-50 rounded-lg border bg-card p-4 shadow-soft-md sm:left-auto sm:right-6 sm:w-[26rem] lg:bottom-[calc(9.25rem+env(safe-area-inset-bottom))]"
        >
          <p className="text-sm leading-relaxed">
            We use only essential cookies by default. Analytics cookies help us improve the product and load only after
            you accept. See our{" "}
            <Link href="/cookies" className="font-medium text-primary hover:underline">
              cookie policy
            </Link>
            .
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => save({ analytics: true, marketing: true })}>
              Accept all
            </Button>
            <Button size="sm" variant="outline" onClick={() => save({ analytics: false, marketing: false })}>
              Reject optional
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                // The bar only renders when no decision exists yet, so the draft starts empty.
                setAnalytics(false)
                setMarketing(false)
                setPanelOpen(true)
              }}
            >
              Preferences
            </Button>
          </div>
        </div>
      )}

      <Dialog open={panelOpen} onOpenChange={setPanelOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Cookie preferences</DialogTitle>
            <DialogDescription>
              Choose which categories of cookies you allow. You can change this at any time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label className="text-sm font-medium">Strictly necessary</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Required for the site to work (security, your choices here). Always on.
                </p>
              </div>
              <Switch checked aria-label="Strictly necessary cookies (always enabled)" disabled />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label htmlFor="consent-analytics" className="text-sm font-medium">
                  Analytics
                </Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Privacy-friendly, aggregated page statistics. Nothing loads before you opt in.
                </p>
              </div>
              <Switch
                id="consent-analytics"
                checked={analytics}
                onCheckedChange={setAnalytics}
                aria-label="Allow analytics cookies"
              />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label htmlFor="consent-marketing" className="text-sm font-medium">
                  Marketing
                </Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Not used today. Reserved so future campaigns respect this choice from day one.
                </p>
              </div>
              <Switch
                id="consent-marketing"
                checked={marketing}
                onCheckedChange={setMarketing}
                aria-label="Allow marketing cookies"
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <Link href="/cookies" className="text-xs text-muted-foreground underline-offset-2 hover:underline">
              Read the cookie policy
            </Link>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => save({ analytics: false, marketing: false })}>
                Reject optional
              </Button>
              <Button size="sm" onClick={() => save({ analytics, marketing })}>
                Save preferences
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
