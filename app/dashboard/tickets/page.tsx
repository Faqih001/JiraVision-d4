"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertCircle, BarChart3, CheckCircle2, Clock3, Filter, Inbox, Plus, RefreshCw, Send, Ticket, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { DASHBOARD_KPI_GRID, DASHBOARD_SECTION_GRID } from "@/components/dashboard-kit"

type Department = { id: number; name: string; code: string }
type TicketRow = {
  id: number
  subject: string
  description: string
  status: string
  priority: string
  category: string | null
  requesterId: number
  requesterName: string | null
  assigneeId: number | null
  departmentId: number | null
  departmentName: string | null
  createdAt: string
  updatedAt: string
}
type Member = { id: number; name: string }
type Comment = { id: number; body: string; authorName: string | null; createdAt: string }

const statusLabels: Record<string, string> = {
  new: "New",
  triaged: "Triaged",
  assigned: "Assigned",
  in_progress: "In progress",
  waiting: "Waiting",
  resolved: "Resolved",
  closed: "Closed",
}

const priorityTone: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  low: "secondary",
  medium: "outline",
  high: "default",
  urgent: "destructive",
}

export default function TicketsPage() {
  const { toast } = useToast()
  const [tickets, setTickets] = useState<TicketRow[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [comment, setComment] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [subject, setSubject] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState("medium")
  const [departmentId, setDepartmentId] = useState("")
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [loading, setLoading] = useState(false)

  const selected = useMemo(() => tickets.find((ticket) => ticket.id === selectedId) ?? null, [tickets, selectedId])
  const visibleTickets = useMemo(() => tickets.filter((ticket) => {
    const text = `${ticket.subject} ${ticket.description} ${ticket.requesterName ?? ""}`.toLowerCase()
    return (!query.trim() || text.includes(query.trim().toLowerCase()))
      && (statusFilter === "all" || ticket.status === statusFilter)
      && (priorityFilter === "all" || ticket.priority === priorityFilter)
      && (departmentFilter === "all" || String(ticket.departmentId) === departmentFilter)
  }), [tickets, query, statusFilter, priorityFilter, departmentFilter])
  const metrics = useMemo(() => ({
    total: tickets.length,
    open: tickets.filter((ticket) => !["resolved", "closed"].includes(ticket.status)).length,
    unassigned: tickets.filter((ticket) => !ticket.assigneeId).length,
    urgent: tickets.filter((ticket) => ticket.priority === "urgent" && !["resolved", "closed"].includes(ticket.status)).length,
  }), [tickets])
  const countBy = (key: "status" | "priority" | "departmentId") => {
    const counts = new Map<string, number>()
    for (const ticket of tickets) {
      const value = String(ticket[key] ?? "unrouted")
      counts.set(value, (counts.get(value) ?? 0) + 1)
    }
    return [counts.entries()].sort((a, b) => b[1] - a[1])
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ticketResponse, memberResponse] = await Promise.all([
        fetch("/api/tickets", { cache: "no-store" }),
        fetch("/api/team/members", { cache: "no-store" }),
      ])
      const ticketPayload = await ticketResponse.json()
      const memberPayload = await memberResponse.json()
      if (!ticketResponse.ok) throw new Error(ticketPayload.error ?? "Could not load tickets.")
      setTickets(ticketPayload.tickets ?? [])
      setDepartments(ticketPayload.departments ?? [])
      setMembers((memberPayload.teamMembers ?? []).map((member: Member) => ({ id: member.id, name: member.name })))
      setSelectedId((current) => current && (ticketPayload.tickets ?? []).some((ticket: TicketRow) => ticket.id === current) ? current : ticketPayload.tickets?.[0]?.id ?? null)
    } catch (error) {
      toast({ title: "Unable to load tickets", description: error instanceof Error ? error.message : "Try again." , variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!selectedId) {
      setComments([])
      return
    }
    void fetch(`/api/tickets/${selectedId}/comments`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error ?? "Could not load comments.")
        setComments(payload.comments ?? [])
      })
      .catch((error) => toast({ title: "Unable to load comments", description: error.message, variant: "destructive" }))
  }, [selectedId, toast])

  async function createTicket() {
    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subject, description, priority, departmentId: departmentId || null }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? "Could not create ticket.")
      setSubject("")
      setDescription("")
      setPriority("medium")
      setDepartmentId("")
      setShowCreate(false)
      await load()
      setSelectedId(payload.ticket.id)
      toast({ title: "Ticket created" })
    } catch (error) {
      toast({ title: "Unable to create ticket", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" })
    }
  }

  async function updateTicket(patch: Record<string, unknown>) {
    if (!selected) return
    const response = await fetch(`/api/tickets/${selected.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    })
    const payload = await response.json()
    if (!response.ok) {
      toast({ title: "Update failed", description: payload.error ?? "Try again.", variant: "destructive" })
      return
    }
    await load()
  }

  async function addComment() {
    if (!selected || !comment.trim()) return
    const response = await fetch(`/api/tickets/${selected.id}/comments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: comment }),
    })
    const payload = await response.json()
    if (!response.ok) {
      toast({ title: "Comment failed", description: payload.error ?? "Try again.", variant: "destructive" })
      return
    }
    setComments((current) => [...current, payload.comment])
    setComment("")
  }

  return (
    <div className="w-full space-y-5">
      {/* 1. Page header */}
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-sm text-muted-foreground">Internal service desk</p><h1 className="text-2xl font-semibold tracking-tight">Tickets</h1><p className="mt-1 text-sm text-muted-foreground">Route requests, manage ownership, and keep every handoff visible.</p></div>
        <div className="flex gap-2"><Button variant="outline" size="icon" className="h-8 w-8" onClick={() => void load()} disabled={loading} aria-label="Refresh tickets"><RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} /></Button><Button size="sm" className="h-8 text-xs" onClick={() => setShowCreate((value) => !value)}><Plus className="mr-2 h-4 w-4" />Raise ticket</Button></div>
      </section>

      {/* 2. KPI summary */}
      <section className={`${DASHBOARD_KPI_GRID} xl:grid-cols-4`}>
        {[
          { label: "Total tickets", value: metrics.total, icon: Ticket },
          { label: "Open workload", value: metrics.open, icon: Inbox },
          { label: "Unassigned", value: metrics.unassigned, icon: Users },
          { label: "Urgent open", value: metrics.urgent, icon: AlertCircle },
        ].map(({ label, value, icon: Icon }) => <Card key={label}><CardContent className="flex items-center justify-between pt-4"><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p></div><Icon className="h-5 w-5 text-muted-foreground" /></CardContent></Card>)}
      </section>

      {/* 3. Queue filters */}
      <Card><CardContent className="flex w-full min-w-0 flex-col items-stretch gap-2 py-3 sm:flex-row sm:flex-wrap sm:items-end"><div className="w-full min-w-0 flex-1 space-y-1.5 sm:basis-52"><Label className="text-xs" htmlFor="ticket-search">Search queue</Label><Input className="h-8 text-xs" id="ticket-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Subject, requester, or description" /></div><div className="w-full sm:w-40"><Label className="text-xs">Status</Label><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div><div className="w-full sm:w-36"><Label className="text-xs">Priority</Label><Select value={priorityFilter} onValueChange={setPriorityFilter}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All priorities</SelectItem>{["low", "medium", "high", "urgent"].map((value) => <SelectItem key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</SelectItem>)}</SelectContent></Select></div><div className="w-full sm:w-44"><Label className="text-xs">Department</Label><Select value={departmentFilter} onValueChange={setDepartmentFilter}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All departments</SelectItem>{departments.map((department) => <SelectItem key={department.id} value={String(department.id)}>{department.name}</SelectItem>)}</SelectContent></Select></div><Button size="sm" className="h-8 text-xs" variant="ghost" onClick={() => { setQuery(""); setStatusFilter("all"); setPriorityFilter("all"); setDepartmentFilter("all") }}><Filter className="mr-2 h-4 w-4" />Reset</Button></CardContent></Card>

      {/* 4. Create ticket */}
      {showCreate ? <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Raise a ticket</CardTitle></CardHeader><CardContent className="grid gap-3 pt-0 md:grid-cols-2"><div className="space-y-1.5 md:col-span-2"><Label className="text-xs" htmlFor="ticket-subject">Subject</Label><Input className="h-8 text-xs" id="ticket-subject" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="What do you need help with?" /></div><div className="space-y-1.5 md:col-span-2"><Label className="text-xs" htmlFor="ticket-description">Description</Label><Textarea className="text-xs" id="ticket-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder="Include the context and desired outcome." /></div><div className="space-y-1.5"><Label className="text-xs">Priority</Label><Select value={priority} onValueChange={setPriority}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{["low", "medium", "high", "urgent"].map((value) => <SelectItem key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1.5"><Label className="text-xs">Department</Label><Select value={departmentId} onValueChange={setDepartmentId}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Choose a queue" /></SelectTrigger><SelectContent>{departments.map((department) => <SelectItem key={department.id} value={String(department.id)}>{department.name}</SelectItem>)}</SelectContent></Select></div><div className="flex justify-end gap-2 md:col-span-2"><Button size="sm" className="h-8 text-xs" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button><Button size="sm" className="h-8 text-xs" onClick={() => void createTicket()} disabled={!subject.trim() || !description.trim()}>Submit ticket</Button></div></CardContent></Card> : null}

      {/* 5-7. Operational distribution */}
      <div className={`${DASHBOARD_SECTION_GRID} lg:grid-cols-3`}>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><BarChart3 className="h-4 w-4" />By status</CardTitle></CardHeader><CardContent className="space-y-3 pt-0">{countBy("status").length === 0 ? <p className="text-xs text-muted-foreground">No status data yet.</p> : countBy("status").map(([value, count]) => <div key={value}><div className="flex justify-between text-xs"><span>{statusLabels[value] ?? value}</span><span>{count}</span></div><div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(8, (count / Math.max(1, metrics.total)) * 100)}%` }} /></div></div>)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><AlertCircle className="h-4 w-4" />By priority</CardTitle></CardHeader><CardContent className="space-y-3 pt-0">{countBy("priority").length === 0 ? <p className="text-xs text-muted-foreground">No priority data yet.</p> : countBy("priority").map(([value, count]) => <div key={value} className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs"><Badge variant={priorityTone[value] ?? "outline"}>{value}</Badge></span><span className="text-xs font-medium">{count}</span></div>)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Users className="h-4 w-4" />By department</CardTitle></CardHeader><CardContent className="space-y-3 pt-0">{countBy("departmentId").length === 0 ? <p className="text-xs text-muted-foreground">No department data yet.</p> : countBy("departmentId").map(([value, count]) => <div key={value} className="flex justify-between text-xs"><span>{departments.find((department) => String(department.id) === value)?.name ?? "Unrouted"}</span><span className="font-medium">{count}</span></div>)}</CardContent></Card>
      </div>

      {/* 8. Service-level attention */}
      <Card><CardContent className="flex flex-wrap items-center gap-3 py-3"><div className="flex items-center gap-2 text-sm font-medium"><Clock3 className="h-4 w-4 text-muted-foreground" />Service-level attention</div><span className="text-xs text-muted-foreground">{metrics.urgent > 0 ? `${metrics.urgent} urgent ticket${metrics.urgent === 1 ? "" : "s"} need attention.` : "No urgent open tickets."}</span><Badge className="text-[11px]" variant={metrics.urgent > 0 ? "destructive" : "secondary"}>{metrics.urgent > 0 ? "Review now" : "On track"}</Badge></CardContent></Card>

      {/* 9-11. Work queues */}
      <div className={`${DASHBOARD_SECTION_GRID} md:grid-cols-3`}>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Open queue</CardTitle></CardHeader><CardContent className="pt-0"><p className="text-2xl font-semibold tabular-nums">{metrics.open}</p><p className="mt-1 text-xs text-muted-foreground">Tickets awaiting completion</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Needs assignment</CardTitle></CardHeader><CardContent className="pt-0"><p className="text-2xl font-semibold tabular-nums">{metrics.unassigned}</p><p className="mt-1 text-xs text-muted-foreground">Tickets without an owner</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Recently resolved</CardTitle></CardHeader><CardContent className="pt-0"><p className="text-2xl font-semibold tabular-nums">{tickets.filter((ticket) => ticket.status === "resolved").length}</p><p className="mt-1 text-xs text-muted-foreground">Ready for closure review</p></CardContent></Card>
      </div>

      {/* 12. Organization queue */}
      <Card><CardHeader className="pb-2"><CardTitle className="flex items-center justify-between text-sm"><span className="flex items-center gap-2"><Inbox className="h-4 w-4" />Organization queue</span><span className="text-xs font-normal text-muted-foreground">{visibleTickets.length} shown</span></CardTitle></CardHeader><CardContent className="space-y-2 pt-0">{visibleTickets.length === 0 ? <p className="py-6 text-center text-xs text-muted-foreground">No tickets match the current filters.</p> : visibleTickets.map((ticket) => <button key={ticket.id} type="button" onClick={() => setSelectedId(ticket.id)} className={`w-full rounded-lg border p-3 text-left transition-colors ${selectedId === ticket.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}><div className="flex items-start justify-between gap-3"><span className="text-sm font-medium">{ticket.subject}</span><Badge className="text-[11px]" variant={priorityTone[ticket.priority] ?? "outline"}>{ticket.priority}</Badge></div><div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground"><span>{statusLabels[ticket.status] ?? ticket.status}</span><span>·</span><span>{ticket.departmentName ?? "Unrouted"}</span><span>·</span><span>{ticket.requesterName ?? "Requester"}</span></div></button>)}</CardContent></Card>

      {/* 13. Ticket detail */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Ticket className="h-4 w-4" />
            {selected ? selected.subject : "Ticket details"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {!selected ? (
            <p className="text-xs text-muted-foreground">Select a ticket to view its workflow.</p>
          ) : (
            <>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{selected.description}</p>
              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={selected.status} onValueChange={(value) => void updateTicket({ status: value })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Assignee</Label>
                  <Select
                    value={selected.assigneeId ? String(selected.assigneeId) : "unassigned"}
                    onValueChange={(value) => void updateTicket({ assigneeId: value === "unassigned" ? null : Number(value) })}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {members.map((member) => <SelectItem key={member.id} value={String(member.id)}>{member.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-3 rounded-lg bg-muted/40 p-3 text-sm sm:grid-cols-3">
                <div><p className="text-xs text-muted-foreground">Requester</p><p className="font-medium">{selected.requesterName ?? "Unknown"}</p></div>
                <div><p className="text-xs text-muted-foreground">Department</p><p className="font-medium">{selected.departmentName ?? "Unrouted"}</p></div>
                <div><p className="text-xs text-muted-foreground">Last updated</p><p className="font-medium">{new Date(selected.updatedAt).toLocaleDateString()}</p></div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 14. Conversation */}
      {selected ? <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Conversation and handoffs</CardTitle></CardHeader><CardContent className="pt-0"><div className="max-h-56 space-y-3 overflow-y-auto">{comments.length === 0 ? <p className="text-xs text-muted-foreground">No comments yet.</p> : comments.map((item) => <div key={item.id} className="rounded-md bg-muted/50 p-3 text-sm"><p>{item.body}</p><p className="mt-1 text-[11px] text-muted-foreground">{item.authorName ?? "Member"} · {new Date(item.createdAt).toLocaleString()}</p></div>)}</div><div className="mt-3 flex gap-2"><Textarea className="text-xs" value={comment} onChange={(event) => setComment(event.target.value)} rows={2} placeholder="Add an update..." /><Button size="icon" className="h-8 w-8" onClick={() => void addComment()} disabled={!comment.trim()} aria-label="Send comment"><Send className="h-4 w-4" /></Button></div></CardContent></Card> : null}

      {/* 15. Empty-state guidance */}
      {tickets.length === 0 ? <Card><CardContent className="flex flex-col items-center gap-2 p-6 text-center"><CheckCircle2 className="h-8 w-8 text-muted-foreground" /><p className="text-sm font-medium">Your service desk is ready</p><p className="max-w-md text-xs text-muted-foreground">Raise the first ticket to start routing requests between people and departments in this organization.</p><Button size="sm" className="h-8 text-xs" onClick={() => setShowCreate(true)}><Plus className="mr-2 h-4 w-4" />Raise the first ticket</Button></CardContent></Card> : null}
    </div>
  )
}
