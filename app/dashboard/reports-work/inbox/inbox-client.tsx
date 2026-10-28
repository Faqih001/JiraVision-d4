"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, MessageSquare } from "lucide-react"
import { LIVE_REFRESH_MS, useLiveRefresh } from "@/hooks/use-live-refresh"

type InboxReport = {
  report: {
    id: number
    userId: number
    title: string
    template: string
    periodType: string
    periodStart: string
    periodEnd: string
    status: string
    submittedAt: string | null
    revisionOf: number | null
    createdAt: string
    authorName: string
  }
  myRecipientState: {
    notifiedAt: string
    readAt: string | null
    ackAt: string | null
    note: string | null
  }
}

export default function InboxClient() {
  const [reports, setReports] = useState<InboxReport[]>([])
  const [loading, setLoading] = useState(true)
  const [admin, setAdmin] = useState(false)
  const [actionInProgress, setActionInProgress] = useState<number | null>(null)
  const [returnNote, setReturnNote] = useState("")
  const [returningId, setReturningId] = useState<number | null>(null)

  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    try {
      const res = await fetch("/api/reports/inbox")
      const json = await res.json().catch(() => null)
      if (json?.success) {
        setReports(json.data.reports)
        setAdmin(json.data.admin)
      }
    } finally {
      if (!quiet) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useLiveRefresh(() => refresh(true), { intervalMs: LIVE_REFRESH_MS })

  const handleAck = async (id: number) => {
    setActionInProgress(id)
    try {
      await fetch(`/api/reports/inbox/${id}/ack`, { method: "POST" })
      await refresh()
    } finally {
      setActionInProgress(null)
    }
  }

  const handleReturn = async (id: number) => {
    if (!returnNote.trim()) return
    setActionInProgress(id)
    try {
      await fetch(`/api/reports/inbox/${id}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: returnNote.trim() }),
      })
      setReturnNote("")
      setReturningId(null)
      await refresh()
    } finally {
      setActionInProgress(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded border bg-muted" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Report inbox</h1>
        <p className="text-sm text-muted-foreground">
          {admin ? "All submitted reports (admin view)" : "Reports submitted to you for review"}
        </p>
      </div>

      {reports.length === 0 ? (
        <div className="rounded border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">No reports in your inbox.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(({ report, myRecipientState }) => (
            <div key={report.id} className="rounded border p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-medium">{report.title}</p>
                  <p className="text-sm text-muted-foreground">
                    by {report.authorName} · {report.periodType} · {report.periodStart} to {report.periodEnd}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Submitted {report.submittedAt ? new Date(report.submittedAt).toLocaleDateString() : "—"}
                    {report.revisionOf ? ` · revision of #${report.revisionOf}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {myRecipientState.ackAt ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
                      <Check className="h-3 w-3" /> Acknowledged
                    </span>
                  ) : myRecipientState.note ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                      <MessageSquare className="h-3 w-3" /> Returned
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                      Pending review
                    </span>
                  )}
                </div>
              </div>

              {!myRecipientState.ackAt && !myRecipientState.note && report.status === "submitted" && (
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={actionInProgress === report.id}
                    onClick={() => handleAck(report.id)}
                    className="rounded bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-50"
                  >
                    Acknowledge
                  </button>
                  <button
                    type="button"
                    disabled={actionInProgress === report.id}
                    onClick={() => setReturningId(report.id)}
                    className="rounded border px-3 py-1.5 text-xs disabled:opacity-50"
                  >
                    Return with note
                  </button>
                </div>
              )}

              {returningId === report.id && (
                <div className="mt-3 space-y-2">
                  <textarea
                    value={returnNote}
                    onChange={(e) => setReturnNote(e.target.value)}
                    placeholder="What needs correcting?"
                    rows={3}
                    className="w-full rounded border p-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={actionInProgress === report.id || !returnNote.trim()}
                      onClick={() => handleReturn(report.id)}
                      className="rounded bg-destructive px-3 py-1.5 text-xs text-destructive-foreground disabled:opacity-50"
                    >
                      Return report
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReturningId(null)
                        setReturnNote("")
                      }}
                      className="rounded border px-3 py-1.5 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {myRecipientState.note && (
                <div className="mt-3 rounded bg-muted p-3 text-sm">
                  <p className="font-medium">Return note:</p>
                  <p className="text-muted-foreground">{myRecipientState.note}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
