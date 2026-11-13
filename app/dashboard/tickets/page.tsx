"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Plus, RefreshCw, Send, Ticket } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

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
  const [loading, setLoading] = useState(false)

  const selected = useMemo(() => tickets.find((ticket) => ticket.id === selectedId) ?? null, [tickets, selectedId])

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
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Internal service desk</p>
          <h1 className="text-2xl font-semibold tracking-tight">Tickets</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => void load()} disabled={loading} aria-label="Refresh tickets">
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          </Button>
          <Button onClick={() => setShowCreate((value) => !value)}><Plus className="mr-2 h-4 w-4" />Raise ticket</Button>
        </div>
      </div>

      {showCreate ? (
        <Card>
          <CardHeader><CardTitle>Raise a ticket</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2"><Label htmlFor="ticket-subject">Subject</Label><Input id="ticket-subject" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="What do you need help with?" /></div>
            <div className="space-y-1.5 md:col-span-2"><Label htmlFor="ticket-description">Description</Label><Textarea id="ticket-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder="Include the context and desired outcome." /></div>
            <div className="space-y-1.5"><Label>Priority</Label><Select value={priority} onValueChange={setPriority}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["low", "medium", "high", "urgent"].map((value) => <SelectItem key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Department</Label><Select value={departmentId} onValueChange={setDepartmentId}><SelectTrigger><SelectValue placeholder="Choose a queue" /></SelectTrigger><SelectContent>{departments.map((department) => <SelectItem key={department.id} value={String(department.id)}>{department.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="flex justify-end gap-2 md:col-span-2"><Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button><Button onClick={() => void createTicket()} disabled={!subject.trim() || !description.trim()}>Submit ticket</Button></div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.8fr)]">
        <Card>
          <CardHeader><CardTitle>Organization queue</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {tickets.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No tickets yet.</p> : tickets.map((ticket) => (
              <button key={ticket.id} type="button" onClick={() => setSelectedId(ticket.id)} className={`w-full rounded-lg border p-3 text-left transition-colors ${selectedId === ticket.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
                <div className="flex items-start justify-between gap-3"><span className="font-medium">{ticket.subject}</span><Badge variant={priorityTone[ticket.priority] ?? "outline"}>{ticket.priority}</Badge></div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground"><span>{statusLabels[ticket.status] ?? ticket.status}</span><span>·</span><span>{ticket.departmentName ?? "Unrouted"}</span><span>·</span><span>{ticket.requesterName ?? "Requester"}</span></div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Ticket className="h-4 w-4" />{selected ? selected.subject : "Ticket details"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {!selected ? <p className="text-sm text-muted-foreground">Select a ticket to view its workflow.</p> : (
              <>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{selected.description}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><Label>Status</Label><Select value={selected.status} onValueChange={(value) => void updateTicket({ status: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label>Assignee</Label><Select value={selected.assigneeId ? String(selected.assigneeId) : "unassigned"} onValueChange={(value) => void updateTicket({ assigneeId: value === "unassigned" ? null : Number(value) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unassigned">Unassigned</SelectItem>{members.map((member) => <SelectItem key={member.id} value={String(member.id)}>{member.name}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <div className="border-t pt-4"><p className="mb-2 text-sm font-medium">Conversation</p><div className="max-h-48 space-y-3 overflow-y-auto">{comments.length === 0 ? <p className="text-xs text-muted-foreground">No comments yet.</p> : comments.map((item) => <div key={item.id} className="rounded-md bg-muted/50 p-2 text-sm"><p>{item.body}</p><p className="mt-1 text-[11px] text-muted-foreground">{item.authorName ?? "Member"} · {new Date(item.createdAt).toLocaleString()}</p></div>)}</div><div className="mt-3 flex gap-2"><Textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={2} placeholder="Add an update..." /><Button size="icon" onClick={() => void addComment()} disabled={!comment.trim()} aria-label="Send comment"><Send className="h-4 w-4" /></Button></div></div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
