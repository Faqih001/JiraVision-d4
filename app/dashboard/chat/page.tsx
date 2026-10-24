"use client"

/**
 * Team chat workspace (V3 rewrite).
 *
 * Everything persists to the real Neon tables (chats / chat_participants /
 * messages). Pin, mute and block are per-viewer flags stored inside
 * chat_participants.settings (jsonb); reactions live in messages.reactions
 * (jsonb map emoji -> userIds). Delivery model: HTTP polling every 12s with an
 * `after` timestamp delta — Neon Realtime only covers notifications, so we do
 * NOT claim realtime chat. @-mentions are parsed client-side (autocomplete +
 * highlight) and authoritatively server-side on POST, which fires exactly one
 * "mention" notification per participant per message.
 *
 * Sections:
 *  1  Page header / sync bar (unread total excludes muted chats + mark-all-read)
 *  2  Chat list sidebar (search, unread, pin/mute, groups + DMs)
 *  3  Conversation header (participants, admin group-info edit, toggles)
 *  4  Message stream (day dividers, replies, edit/delete/restore, reactions,
 *     permanent delete behind a confirm)
 *  5  Composer (Enter send, Shift+Enter newline, emoji picks, @autocomplete,
 *     reply quoting, edit-in-place; attachments honestly disabled — the only
 *     verified upload API in this app is the avatar route)
 *  6  Right rail · Members (admin markers, DM mute/block, presence demo label)
 *  7  Right rail · Chat stats (messages/day, top-reacted, most active)
 *  8  Right rail · @me highlights (+ mention cross-feed from
 *     /api/chat/notifications, mark-read and dismiss)
 *  9  Right rail · Archives (restore/unarchive)
 *  10 Create-group dialog
 *  11 Start-DM dialog (open-or-create via /api/chat/dm)
 *  12 Polling engine + honest sync status
 *  13 Read receipts + mute semantics: opening a chat — and every poll that
 *     brings someone else's message into an open chat — POSTs
 *     /api/chat/{id}/read, which advances chat_participants.last_read and is
 *     what actually clears unreadCount. Mute writes through
 *     /api/chat/{id}/mute, drops the chat from the header total and suppresses
 *     its mention notifications server-side; the row badge stays so nothing is
 *     silently hidden.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  Archive,
  ArchiveRestore,
  AtSign,
  BarChart3,
  BellOff,
  Bell,
  CheckCheck,
  Crown,
  Lock,
  MessageCircle,
  MessagesSquare,
  Paperclip,
  Pencil,
  PinOff,
  Pin,
  Plus,
  RefreshCw,
  Reply,
  Send,
  Smile,
  Trash2,
  Users,
  X,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import {
  AXIS,
  AvatarCircle,
  EmptyNote,
  SectionCard,
  TOOLTIP_STYLE,
  relativeTime,
} from "@/components/dashboard-kit"

/* ------------------------------------------------------------------ types */

interface ParticipantSettings {
  isMuted: boolean
  isPinned: boolean
  isBlocked: boolean
  isAdmin: boolean
  notificationLevel: "all" | "mentions" | "none"
  theme: string
}

interface ParticipantDetail {
  userId: number
  user: { id: number; name: string; avatar: string }
  isAdmin: boolean
}

interface ChatSummary {
  id: string
  type: "individual" | "group"
  name: string
  description?: string | null
  avatar: string
  participants: number[]
  participantsDetail: ParticipantDetail[]
  settings?: ParticipantSettings
  createdAt?: string | null
  lastMessage?: {
    id: string
    content: string
    timestamp: string
    senderId: number
    deleted: boolean | null
  }
  unreadCount: number
  isPinned: boolean
  isMuted: boolean
  isArchived: boolean
  isGroupAdmin: boolean
  online?: boolean
  lastMessageTime?: string
  preview?: string
  otherUserId?: number
}

interface ChatMessage {
  id: string
  content: string
  type: string
  timestamp: string
  senderId: number
  fileUrl?: string
  fileName?: string
  deleted: boolean | null
  editedAt?: string | null
  replyToId?: string | null
  sender: { id: number; name: string; avatar: string }
  replyTo?: { id: string; content: string; senderId: number; type: string }
  reactions: Record<string, number[]>
}

interface TeamMember {
  id: number
  name: string
  avatar: string | null
  department: string
  role: string
}

interface MentionNotification {
  id: number
  type: string
  title: string
  body: string | null
  isRead: boolean
  createdAt: string
  metadata?: { chatId?: string; link?: string } | null
}

interface Profile {
  id: number
  name: string
  avatar?: string | null
}

const EMOJI_PICKS = ["👍", "❤️", "😂", "🎉", "🙏", "👀", "✅", "🔥"]
const REACTION_CHOICES = ["👍", "❤️", "😂", "🎉", "🙏", "🔥"]
const POLL_INTERVAL_MS = 12_000

/* ------------------------------------------------------------- utilities */

function dayKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const yesterday = new Date(now.getTime() - 86_400_000)
  if (isSameLocalDay(d, now)) return "Today"
  if (isSameLocalDay(d, yesterday)) return "Yesterday"
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** Client-side mirror of the server's @Name parser (used for highlighting and
 *  the @me tab). Matches @First Last or @First at a word boundary. */
function mentionsUser(content: string, name: string): boolean {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const candidates = [parts.join(" "), parts[0]].filter(Boolean)
  return candidates.some((cand) => {
    const escaped = cand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    return new RegExp(`@${escaped}(?![\\p{L}\\d])`, "iu").test(content)
  })
}

function jsonHeaders() {
  return { "Content-Type": "application/json" }
}

/* ------------------------------------------------------------- components */

/** Renders message text, highlighting @-tokens that point at the viewer. */
function HighlightedText({
  text,
  selfName,
}: {
  text: string
  selfName: string
}) {
  const parts = selfName.trim().split(/\s+/).filter(Boolean)
  const candidates = [parts.join(" "), parts[0]].filter(Boolean).map((c) =>
    c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  )
  if (candidates.length === 0) return <>{text}</>
  const re = new RegExp(`(@(?:${candidates.join("|")})(?![\\p{L}\\d]))`, "giu")
  const segments = text.split(re)
  return (
    <>
      {segments.map((seg, i) =>
        seg.startsWith("@") ? (
          <span
            key={i}
            className="rounded bg-primary/15 px-1 font-medium text-primary"
          >
            {seg}
          </span>
        ) : (
          <span key={i}>{seg}</span>
        ),
      )}
    </>
  )
}

function MessageSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-2">
          <Skeleton className="h-7 w-7 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className={cn("h-9", i % 2 ? "w-2/3" : "w-1/2")} />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ================================================================ page */

export default function ChatWorkspace() {
  const { toast } = useToast()
  const router = useRouter()

  /* -------------------------------------------------- 1 · global state */

  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileReady, setProfileReady] = useState(false)

  const [chats, setChats] = useState<ChatSummary[]>([])
  const [chatsLoading, setChatsLoading] = useState(true)
  const [chatsError, setChatsError] = useState<string | null>(null)

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)

  const [search, setSearch] = useState("")
  const [draft, setDraft] = useState("")
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [editing, setEditing] = useState<ChatMessage | null>(null)
  const [sending, setSending] = useState(false)

  const [railTab, setRailTab] = useState<"members" | "stats" | "mentions" | "archive">(
    "members",
  )
  const [mentionFeed, setMentionFeed] = useState<MentionNotification[]>([])
  const [markingAllRead, setMarkingAllRead] = useState(false)
  const [confirmPermanent, setConfirmPermanent] = useState<ChatMessage | null>(null)

  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showStartDm, setShowStartDm] = useState(false)
  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const [groupForm, setGroupForm] = useState({ name: "", description: "", memberIds: [] as number[] })
  const [groupInfoForm, setGroupInfoForm] = useState({ name: "", description: "" })
  const [busy, setBusy] = useState(false)

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const streamRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const selectedChatIdRef = useRef<string | null>(null)
  const [mentionPopup, setMentionPopup] = useState<{ start: number; term: string } | null>(null)

  const selectedChat = useMemo(
    () => chats.find((c) => c.id === selectedChatId) ?? null,
    [chats, selectedChatId],
  )

  useEffect(() => {
    selectedChatIdRef.current = selectedChatId
  }, [selectedChatId])

  /* --------------------------------------------------- loaders */

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/user/profile", { cache: "no-store" })
      if (!res.ok) {
        setProfileReady(true)
        return
      }
      const data = await res.json()
      if (data?.success && data.profile) {
        setProfile({
          id: data.profile.id,
          name: data.profile.name,
          avatar: data.profile.avatar ?? null,
        })
      }
    } catch {
      // profile stays null; sections render honest empty notes
    } finally {
      setProfileReady(true)
    }
  }, [])

  const loadChats = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (!opts.silent) setChatsLoading(true)
    try {
      const res = await fetch("/api/chat", { cache: "no-store" })
      if (res.status === 401) {
        setChatsError("sign-in")
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as ChatSummary[]
      setChats(Array.isArray(data) ? data : [])
      setChatsError(null)
      setLastSync(new Date().toISOString())
    } catch (err) {
      setChatsError(err instanceof Error ? err.message : String(err))
    } finally {
      if (!opts.silent) setChatsLoading(false)
    }
  }, [])

  const loadMessages = useCallback(async (chatId: string, opts: { silent?: boolean } = {}) => {
    if (!chatId) return
    if (!opts.silent) setMessagesLoading(true)
    try {
      const res = await fetch(`/api/chat/messages?chatId=${encodeURIComponent(chatId)}`, {
        cache: "no-store",
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as ChatMessage[]
      // Guard against a slow response for a chat the user already left.
      if (selectedChatIdRef.current === chatId && Array.isArray(data)) {
        setMessages(data)
      }
    } catch (err) {
      toast({
        title: "Could not load messages",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      })
    } finally {
      if (!opts.silent) setMessagesLoading(false)
    }
  }, [toast])

  /** Advances chat_participants.last_read — the only thing that clears
   *  unreadCount server-side. Optimistic; resynced from /api/chat on failure.
   *  Declared with the loaders because the selection and polling effects both
   *  list it as a dependency. */
  const markChatRead = useCallback(
    async (chatId: string) => {
      setChats((prev) =>
        prev.map((c) => (c.id === chatId && c.unreadCount > 0 ? { ...c, unreadCount: 0 } : c)),
      )
      try {
        const res = await fetch(`/api/chat/${chatId}/read`, { method: "POST" })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
      } catch {
        await loadChats({ silent: true })
      }
    },
    [loadChats],
  )

  const loadTeamMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/team/members", { cache: "no-store" })
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data?.teamMembers)) setTeamMembers(data.teamMembers)
    } catch {
      // roster is optional polish; dialogs show EmptyNote
    }
  }, [])

  // /api/chat/notifications returns a bare array (limit/offset/type); the shell
  // bell uses /api/notifications, which wraps { items, unreadCount } instead.
  // type=mention is filtered server-side on purpose — limit is applied before
  // any client-side narrowing, so filtering here would let a busy user's newer
  // task/system rows push every mention out of the window.
  const loadMentionFeed = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/notifications?type=mention&limit=30", { cache: "no-store" })
      if (!res.ok) return
      const data = await res.json()
      const items: MentionNotification[] = Array.isArray(data) ? data : []
      setMentionFeed(items)
    } catch {
      // The rail is a convenience surface; a failed fetch must not break chat.
    }
  }, [])

  const markFeedRead = useCallback(
    async (ids: number[]) => {
      if (ids.length === 0) return
      setMentionFeed((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, isRead: true } : n)))
      try {
        const res = await fetch("/api/chat/notifications", {
          method: "POST",
          headers: jsonHeaders(),
          body: JSON.stringify({ notificationIds: ids }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
      } catch (err) {
        toast({
          title: "Could not mark notifications read",
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive",
        })
        loadMentionFeed()
      }
    },
    [loadMentionFeed, toast],
  )

  const dismissFeedItem = useCallback(
    async (id: number) => {
      setMentionFeed((prev) => prev.filter((n) => n.id !== id))
      try {
        const res = await fetch("/api/chat/notifications", {
          method: "DELETE",
          headers: jsonHeaders(),
          body: JSON.stringify({ notificationIds: [id] }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
      } catch (err) {
        toast({
          title: "Could not dismiss notification",
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive",
        })
        loadMentionFeed()
      }
    },
    [loadMentionFeed, toast],
  )

  useEffect(() => {
    loadProfile()
    loadChats()
    loadTeamMembers()
    loadMentionFeed()
  }, [loadProfile, loadChats, loadTeamMembers, loadMentionFeed])

  /* ------------------------------------ 12 · polling engine (12s delta) */

  useEffect(() => {
    const timer = setInterval(async () => {
      await loadChats({ silent: true })
      loadMentionFeed()
      if (!selectedChatId) return
      try {
        const newest = messages.length > 0
          ? new Date(messages[messages.length - 1].timestamp).toISOString()
          : undefined
        const url = newest
          ? `/api/chat/messages?chatId=${encodeURIComponent(selectedChatId)}&after=${encodeURIComponent(newest)}`
          : `/api/chat/messages?chatId=${encodeURIComponent(selectedChatId)}`
        const res = await fetch(url, { cache: "no-store" })
        if (!res.ok) return
        const delta = (await res.json()) as ChatMessage[]
        if (!Array.isArray(delta) || delta.length === 0) return
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id))
          const merged = [...prev, ...delta.filter((m) => !seen.has(m.id))]
          merged.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
          return merged
        })
        // An open conversation stays read: advance last_read whenever the poll
        // delivers someone else's message, or the badge reappears next tick.
        if (delta.some((m) => m.senderId !== profile?.id)) markChatRead(selectedChatId)
      } catch {
        // transient poll failures are swallowed; next tick retries
      }
    }, POLL_INTERVAL_MS)
    return () => clearInterval(timer)
    // `messages` intentionally excluded: the interval reads the latest value
    // through the closure we refresh whenever the tail changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChatId, messages.length, loadChats, loadMentionFeed, markChatRead, profile?.id])

  /* ------------------------------------------------- selection handling */

  useEffect(() => {
    if (!selectedChatId) {
      setMessages([])
      return
    }
    setReplyTo(null)
    setEditing(null)
    void loadMessages(selectedChatId).then(() => markChatRead(selectedChatId))
  }, [selectedChatId, loadMessages, markChatRead])

  useEffect(() => {
    const el = streamRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, selectedChatId])

  /* -------------------------------------------------------- 2 · sidebar */

  const visibleChats = useMemo(() => {
    const term = search.trim().toLowerCase()
    const active = chats.filter((c) => !c.isArchived)
    const filtered = term
      ? active.filter(
          (c) =>
            c.name.toLowerCase().includes(term) ||
            (c.preview ?? "").toLowerCase().includes(term),
        )
      : active
    const pinned = filtered.filter((c) => c.isPinned)
    const groups = filtered.filter((c) => !c.isPinned && c.type === "group")
    const dms = filtered.filter((c) => !c.isPinned && c.type !== "group")
    return { pinned, groups, dms }
  }, [chats, search])

  const archivedChats = useMemo(() => chats.filter((c) => c.isArchived), [chats])

  // Muted conversations are excluded on purpose — that is what muting means.
  // Their rows still carry a badge, so nothing is hidden, only de-escalated.
  const totalUnread = useMemo(
    () =>
      chats.reduce(
        (sum, c) => sum + (c.isArchived || c.isMuted ? 0 : c.unreadCount ?? 0),
        0,
      ),
    [chats],
  )

  // Counts muted chats too: mark-all-read clears badges, which mute only hides.
  const unreadChatCount = useMemo(
    () => chats.filter((c) => !c.isArchived && c.unreadCount > 0).length,
    [chats],
  )

  /* ------------------------------------------- settings / flag mutations */

  const patchChatSettings = useCallback(
    async (chatId: string, payload: Record<string, unknown>) => {
      const res = await fetch(`/api/chat/${chatId}/settings`, {
        method: "PATCH",
        headers: jsonHeaders(),
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast({
          title: "Update failed",
          description: body?.error ?? `HTTP ${res.status}`,
          variant: "destructive",
        })
        return false
      }
      await loadChats({ silent: true })
      return true
    },
    [loadChats, toast],
  )

  const togglePin = useCallback(
    async (chat: ChatSummary) => {
      const next = !chat.isPinned
      setChats((prev) => prev.map((c) => (c.id === chat.id ? { ...c, isPinned: next } : c)))
      const ok = await patchChatSettings(chat.id, { isPinned: next })
      if (!ok) setChats((prev) => prev.map((c) => (c.id === chat.id ? { ...c, isPinned: !next } : c)))
    },
    [patchChatSettings],
  )

  /** Mute gets its own endpoint because it changes server behaviour too:
   *  notifyMentions() skips muted participants, so muting really does silence
   *  the bell instead of only swapping the row icon. */
  const toggleMute = useCallback(
    async (chat: ChatSummary) => {
      const next = !chat.isMuted
      setChats((prev) => prev.map((c) => (c.id === chat.id ? { ...c, isMuted: next } : c)))
      try {
        const res = await fetch(`/api/chat/${chat.id}/mute`, {
          method: "PATCH",
          headers: jsonHeaders(),
          body: JSON.stringify({ isMuted: next }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error ?? `HTTP ${res.status}`)
        }
        toast({
          title: next ? "Chat muted" : "Chat unmuted",
          description: next
            ? "No bell notifications from this conversation. The unread badge stays on the row."
            : "Bell notifications are back on for this conversation.",
        })
      } catch (err) {
        setChats((prev) => prev.map((c) => (c.id === chat.id ? { ...c, isMuted: !next } : c)))
        toast({
          title: "Could not update mute",
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive",
        })
      }
    },
    [toast],
  )

  /* ------------------------------------------------------ 13 · read state */

  const markAllChatsRead = useCallback(async () => {
    const targets = chats.filter((c) => !c.isArchived && c.unreadCount > 0)
    if (targets.length === 0) return
    setMarkingAllRead(true)
    try {
      const results = await Promise.all(
        targets.map((c) => fetch(`/api/chat/${c.id}/read`, { method: "POST" })),
      )
      const failed = results.filter((r) => !r.ok).length
      if (failed > 0) throw new Error(`${failed} of ${targets.length} conversations failed`)
      setChats((prev) => prev.map((c) => (c.isArchived ? c : { ...c, unreadCount: 0 })))
      toast({ title: `Marked ${targets.length} conversation${targets.length === 1 ? "" : "s"} read` })
    } catch (err) {
      toast({
        title: "Mark-all-read incomplete",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      })
      await loadChats({ silent: true })
    } finally {
      setMarkingAllRead(false)
    }
  }, [chats, loadChats, toast])

  const toggleArchive = useCallback(
    async (chatId: string, isArchived: boolean) => {
      const res = await fetch(`/api/chat/${chatId}/archive`, {
        method: "PATCH",
        headers: jsonHeaders(),
        body: JSON.stringify({ isArchived }),
      })
      if (!res.ok) {
        toast({ title: "Archive failed", variant: "destructive" })
        return
      }
      toast({ title: isArchived ? "Chat archived" : "Chat restored" })
      await loadChats({ silent: true })
      if (isArchived && selectedChatId === chatId) setSelectedChatId(null)
    },
    [loadChats, selectedChatId, toast],
  )

  /* --------------------------------------------------------- 5 · composer */

  const sendMessage = useCallback(async () => {
    if (!selectedChatId || sending) return
    const content = draft.trim()
    if (!content) return

    // In-place edit path (PATCH), reply quoting and plain sends share the
    // composer to keep the keyboard flow identical.
    if (editing) {
      setSending(true)
      try {
        const res = await fetch(`/api/chat/messages/${editing.id}`, {
          method: "PATCH",
          headers: jsonHeaders(),
          body: JSON.stringify({ content }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const updated = (await res.json()) as ChatMessage
        setMessages((prev) =>
          prev.map((m) =>
            m.id === updated.id
              ? { ...m, content: updated.content, editedAt: updated.editedAt ?? new Date().toISOString() }
              : m,
          ),
        )
        setEditing(null)
        setDraft("")
      } catch (err) {
        toast({
          title: "Edit failed",
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive",
        })
      } finally {
        setSending(false)
      }
      return
    }

    setSending(true)
    const optimistic: ChatMessage = {
      id: `pending-${Date.now()}`,
      content,
      type: "text",
      timestamp: new Date().toISOString(),
      senderId: profile?.id ?? -1,
      deleted: false,
      sender: { id: profile?.id ?? -1, name: profile?.name ?? "You", avatar: profile?.avatar ?? "" },
      replyTo: replyTo
        ? { id: replyTo.id, content: replyTo.content, senderId: replyTo.senderId, type: replyTo.type }
        : undefined,
      reactions: {},
    }
    try {
      setMessages((prev) => [...prev, optimistic])
      setDraft("")
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({
          chatId: selectedChatId,
          content,
          type: "text",
          replyToId: replyTo?.id,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const created = (await res.json()) as ChatMessage
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? { ...created, replyTo: optimistic.replyTo ?? created.replyTo } : m)))
      setReplyTo(null)
      loadChats({ silent: true })
      // The server fires mention notifications on POST; refresh the cross-feed
      // so @me highlights catch up within one poll cycle.
      if (/@\S/.test(content)) loadMentionFeed()
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      setDraft(content)
      toast({
        title: "Message not sent",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }, [draft, editing, loadChats, loadMentionFeed, profile, replyTo, selectedChatId, sending, toast])

  /* ---------------------------------------------------- reactions/edit/del */

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      try {
        const res = await fetch(`/api/chat/messages/${messageId}/reactions`, {
          method: "PUT",
          headers: jsonHeaders(),
          body: JSON.stringify({ emoji }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        const reactions = (data?.reactions ?? {}) as Record<string, number[]>
        setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, reactions } : m)))
      } catch (err) {
        toast({
          title: "Reaction failed",
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive",
        })
      }
    },
    [toast],
  )

  const softDelete = useCallback(
    async (messageId: string) => {
      const res = await fetch(`/api/chat/messages/${messageId}`, { method: "DELETE" })
      if (!res.ok) {
        toast({ title: "Delete failed", variant: "destructive" })
        return
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, deleted: true, content: "" } : m)),
      )
      if (editing?.id === messageId) setEditing(null)
    },
    [editing, toast],
  )

  const restoreMessage = useCallback(
    async (messageId: string) => {
      const res = await fetch(`/api/chat/messages/${messageId}/restore`, { method: "POST" })
      if (!res.ok) {
        toast({ title: "Restore failed", variant: "destructive" })
        return
      }
      // Refetch the stream so the original content comes back verbatim from
      // messages.original_content rather than trusting a local copy.
      await loadMessages(selectedChatId ?? "", { silent: true })
      toast({ title: "Message restored" })
    },
    [loadMessages, selectedChatId, toast],
  )

  /** Hard delete: the row is gone, so there is nothing left to restore. Only
   *  offered on messages that are already soft-deleted, behind a confirm. */
  const permanentDelete = useCallback(
    async (messageId: string) => {
      try {
        const res = await fetch(`/api/chat/messages/${messageId}/permanent-delete`, {
          method: "DELETE",
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error ?? `HTTP ${res.status}`)
        }
        setMessages((prev) => prev.filter((m) => m.id !== messageId))
        if (editing?.id === messageId) setEditing(null)
        if (replyTo?.id === messageId) setReplyTo(null)
        toast({ title: "Message permanently deleted" })
      } catch (err) {
        toast({
          title: "Could not delete message",
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive",
        })
      } finally {
        setConfirmPermanent(null)
      }
    },
    [editing, replyTo, toast],
  )

  /* --------------------------------------------------- mention autocomplete */

  const syncMentionPopup = useCallback(
    (value: string, cursor: number) => {
      const upto = value.slice(0, cursor)
      const match = /(?:^|\s)@([\p{L}\p{M}'-]*)$/u.exec(upto)
      if (!match) {
        setMentionPopup(null)
        return
      }
      setMentionPopup({ start: upto.length - (match[1]?.length ?? 0) - 1, term: (match[1] ?? "").toLowerCase() })
    },
    [],
  )

  const mentionCandidates = useMemo(() => {
    if (!mentionPopup || !selectedChat) return []
    return selectedChat.participantsDetail
      .filter((p) => p.userId !== profile?.id)
      .filter((p) =>
        p.user.name.toLowerCase().includes(mentionPopup.term) ||
        p.user.name.split(" ")[0]?.toLowerCase().startsWith(mentionPopup.term),
      )
      .slice(0, 6)
  }, [mentionPopup, profile, selectedChat])

  const applyMention = useCallback(
    (name: string) => {
      if (!mentionPopup) return
      const cursor = textareaRef.current?.selectionStart ?? draft.length
      const before = draft.slice(0, mentionPopup.start)
      const after = draft.slice(cursor)
      const next = `${before}@${name} ${after}`
      setDraft(next)
      setMentionPopup(null)
      requestAnimationFrame(() => {
        const el = textareaRef.current
        if (el) {
          el.focus()
          const pos = before.length + name.length + 2
          el.setSelectionRange(pos, pos)
        }
      })
    },
    [draft, mentionPopup],
  )

  /* ---------------------------------------------------- dialogs (10 + 11) */

  const createGroup = useCallback(async () => {
    if (!groupForm.name.trim() || groupForm.memberIds.length === 0) {
      toast({ title: "Group name and at least one member are required" })
      return
    }
    setBusy(true)
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({
          type: "group",
          name: groupForm.name.trim(),
          description: groupForm.description.trim() || undefined,
          participants: groupForm.memberIds,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error ?? `HTTP ${res.status}`)
      }
      const created = (await res.json()) as { id: string }
      setShowCreateGroup(false)
      setGroupForm({ name: "", description: "", memberIds: [] })
      await loadChats({ silent: true })
      setSelectedChatId(created.id)
      toast({ title: "Group created", description: groupForm.name.trim() })
    } catch (err) {
      toast({
        title: "Could not create group",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      })
    } finally {
      setBusy(false)
    }
  }, [groupForm, loadChats, toast])

  const startDm = useCallback(
    async (member: TeamMember) => {
      try {
        const res = await fetch("/api/chat/dm", {
          method: "POST",
          headers: jsonHeaders(),
          body: JSON.stringify({ otherUserId: member.id }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error ?? `HTTP ${res.status}`)
        }
        const data = await res.json()
        setShowStartDm(false)
        await loadChats({ silent: true })
        setSelectedChatId(data.chatId)
      } catch (err) {
        toast({
          title: "Could not open DM",
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive",
        })
      }
    },
    [loadChats, toast],
  )

  const saveGroupInfo = useCallback(async () => {
    if (!selectedChat) return
    const ok = await patchChatSettings(selectedChat.id, {
      name: groupInfoForm.name.trim() || selectedChat.name,
      description: groupInfoForm.description.trim() || null,
    })
    if (ok) {
      setShowGroupInfo(false)
      toast({ title: "Group info updated" })
    }
  }, [groupInfoForm, patchChatSettings, selectedChat, toast])

  /* ------------------------------------------------------ 7 · chat stats */

  const stats = useMemo(() => {
    const now = new Date()
    const buckets: { key: string; day: string; count: number }[] = []
    for (let i = 13; i >= 0; i -= 1) {
      const d = new Date(now.getTime() - i * 86_400_000)
      buckets.push({
        key: dayKey(d.toDateString()),
        day: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        count: 0,
      })
    }
    const byKey = new Map(buckets.map((b) => [b.key, b]))
    const perSender = new Map<number, { name: string; count: number }>()
    let topMessage: { text: string; count: number; author: string } | null = null
    for (const m of messages) {
      if (m.deleted) continue
      const bucket = byKey.get(dayKey(new Date(m.timestamp).toDateString()))
      if (bucket) bucket.count += 1
      const s = perSender.get(m.senderId) ?? { name: m.sender.name, count: 0 }
      s.count += 1
      perSender.set(m.senderId, s)
      const total = Object.values(m.reactions ?? {}).reduce((a, b) => a + b.length, 0)
      if (total > 0 && (!topMessage || total > topMessage.count)) {
        topMessage = { text: m.content.slice(0, 120), count: total, author: m.sender.name }
      }
    }
    const active = [...perSender.values()].sort((a, b) => b.count - a.count).slice(0, 5)
    return { days: buckets, active, topMessage, total: messages.filter((m) => !m.deleted).length }
  }, [messages])

  /* ---------------------------------------------------- 8 · @me mentions */

  const selfMentions = useMemo(() => {
    if (!profile) return []
    return messages
      .filter((m) => !m.deleted && mentionsUser(m.content, profile.name))
      .slice(-20)
      .reverse()
  }, [messages, profile])

  const unreadFeedCount = useMemo(
    () => mentionFeed.filter((n) => !n.isRead).length,
    [mentionFeed],
  )

  /* =============================================================== render */

  if (!profileReady) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  if (chatsError === "sign-in" || !profile) {
    return (
      <div className="p-6">
        <EmptyNote>
          You need to be signed in to open the team chat.{" "}
          <a className="underline" href="/login">
            Sign in
          </a>
        </EmptyNote>
      </div>
    )
  }

  const isDMBlocked = selectedChat?.settings?.isBlocked === true

  return (
    <div className="flex h-[calc(100svh-4rem)] min-h-0 flex-col gap-0 lg:h-[calc(100svh-3.5rem)]">
      {/* ============================ 1 · page header / sync bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <MessagesSquare className="h-5 w-5 text-primary" />
            Team chat
            {totalUnread > 0 && (
              <Badge variant="secondary" className="ml-1">
                {totalUnread} unread
              </Badge>
            )}
          </h1>
          <p className="text-xs text-muted-foreground">
            {selectedChat
              ? `${selectedChat.type === "group" ? "Group" : "Direct"} · ${selectedChat.participants.length} participant${selectedChat.participants.length === 1 ? "" : "s"}`
              : "Pick a conversation or start a new one"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-muted-foreground" title="Chat updates arrive by polling — Neon Realtime only backs notifications">
            polling · {lastSync ? `synced ${relativeTime(lastSync)}` : "waiting"}
          </span>
          <Button
            size="sm"
            variant="ghost"
            disabled={markingAllRead || unreadChatCount === 0}
            onClick={markAllChatsRead}
            title="Advance your read marker on every conversation that still has unread messages"
          >
            <CheckCheck className={cn("mr-1 h-4 w-4", markingAllRead && "animate-pulse")} />
            Mark all read
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={refreshing}
            onClick={async () => {
              setRefreshing(true)
              await Promise.all([loadChats({ silent: true }), selectedChatId ? loadMessages(selectedChatId, { silent: true }) : Promise.resolve()])
              setRefreshing(false)
            }}
          >
            <RefreshCw className={cn("mr-1 h-4 w-4", refreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowStartDm(true)}>
            <MessageCircle className="mr-1 h-4 w-4" /> New DM
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowCreateGroup(true)}>
            <Plus className="mr-1 h-4 w-4" /> New group
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-[280px_minmax(0,1fr)_320px] xl:grid-cols-[300px_minmax(0,1fr)_340px]">
        {/* ============================ 2 · chat list sidebar */}
        <aside className="flex min-h-0 flex-col border-r bg-card/40" aria-label="Conversations">
          <div className="space-y-2 p-3">
            <Label htmlFor="chat-search" className="sr-only">
              Search chats
            </Label>
            <div className="relative">
              <Input
                id="chat-search"
                placeholder="Search chats…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </span>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
            {chatsLoading ? (
              <div className="space-y-2 p-2">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : chats.length === 0 ? (
              <EmptyNote>No chats yet — start a DM or create a group.</EmptyNote>
            ) : visibleChats.pinned.length + visibleChats.groups.length + visibleChats.dms.length === 0 ? (
              <EmptyNote>Nothing matches “{search}”.</EmptyNote>
            ) : (
              <>
                <ChatGroupLabel label="Pinned" chats={visibleChats.pinned} render={(c) => (
                  <ChatRow
                    key={c.id}
                    chat={c}
                    active={c.id === selectedChatId}
                    onSelect={setSelectedChatId}
                    onTogglePin={togglePin}
                    onToggleMute={toggleMute}
                    onArchive={toggleArchive}
                  />
                )} />
                <ChatGroupLabel label="Groups" chats={visibleChats.groups} render={(c) => (
                  <ChatRow
                    key={c.id}
                    chat={c}
                    active={c.id === selectedChatId}
                    onSelect={setSelectedChatId}
                    onTogglePin={togglePin}
                    onToggleMute={toggleMute}
                    onArchive={toggleArchive}
                  />
                )} />
                <ChatGroupLabel label="Direct messages" chats={visibleChats.dms} render={(c) => (
                  <ChatRow
                    key={c.id}
                    chat={c}
                    active={c.id === selectedChatId}
                    onSelect={setSelectedChatId}
                    onTogglePin={togglePin}
                    onToggleMute={toggleMute}
                    onArchive={toggleArchive}
                  />
                )} />
              </>
            )}
          </div>
        </aside>

        {/* ============================ 3–5 · conversation column */}
        <section className="flex min-h-0 flex-col" aria-label="Conversation">
          {!selectedChat ? (
            <div className="flex flex-1 items-center justify-center">
              <EmptyNote>
                Select a conversation on the left, or start one with <b>New DM</b> / <b>New group</b>.
              </EmptyNote>
            </div>
          ) : (
            <>
              {/* 3 · header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-card/60 px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <AvatarCircle name={selectedChat.name} avatar={selectedChat.avatar} size={34} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-sm font-semibold">{selectedChat.name}</h2>
                      {selectedChat.type === "group" && (
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          {selectedChat.participants.length} members
                        </Badge>
                      )}
                      {selectedChat.isMuted && <BellOff className="h-3.5 w-3.5 text-muted-foreground" aria-label="muted" />}
                      {selectedChat.isPinned && <Pin className="h-3.5 w-3.5 text-primary" aria-label="pinned" />}
                    </div>
                    {selectedChat.description ? (
                      <p className="truncate text-xs text-muted-foreground">{selectedChat.description}</p>
                    ) : (
                      <p className="truncate text-xs text-muted-foreground">
                        {selectedChat.participantsDetail
                          .filter((p) => p.userId !== profile.id)
                          .map((p) => p.user.name)
                          .slice(0, 3)
                          .join(", ") || "Just you"}
                        {selectedChat.participantsDetail.length > 2 ? "…" : ""}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {selectedChat.type === "group" && selectedChat.isGroupAdmin && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setGroupInfoForm({
                          name: selectedChat.name,
                          description: selectedChat.description ?? "",
                        })
                        setShowGroupInfo(true)
                      }}
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Edit info
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label={selectedChat.isPinned ? "Unpin chat" : "Pin chat"}
                    title={selectedChat.isPinned ? "Unpin" : "Pin"}
                    onClick={() => togglePin(selectedChat)}
                  >
                    {selectedChat.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label={selectedChat.isMuted ? "Unmute chat" : "Mute chat"}
                    title={selectedChat.isMuted ? "Unmute" : "Mute"}
                    onClick={() => toggleMute(selectedChat)}
                  >
                    {selectedChat.isMuted ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label="Archive chat"
                    title="Archive chat"
                    onClick={() => toggleArchive(selectedChat.id, true)}
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {isDMBlocked && (
                <div className="flex items-center justify-between gap-2 border-b bg-muted/60 px-4 py-2 text-xs">
                  <span className="flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5" />
                    This conversation is blocked. You will not receive mention notifications here.
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => patchChatSettings(selectedChat.id, { isBlocked: false })}
                  >
                    Unblock
                  </Button>
                </div>
              )}

              {/* 4 · message stream */}
              <div
                ref={streamRef}
                role="log"
                aria-live="polite"
                aria-label={`Messages in ${selectedChat.name}`}
                className="min-h-0 flex-1 overflow-y-auto bg-muted/20 py-3"
              >
                {messagesLoading ? (
                  <MessageSkeleton />
                ) : messages.length === 0 ? (
                  <EmptyNote>No messages yet — say hi to get things moving.</EmptyNote>
                ) : (
                  messages.map((msg, idx) => {
                    const own = msg.senderId === profile.id
                    const prev = messages[idx - 1]
                    const newDay = !prev || dayKey(prev.timestamp) !== dayKey(msg.timestamp)
                    const groupedWithPrev =
                      !newDay && prev && prev.senderId === msg.senderId && !prev.deleted
                    return (
                      <div key={msg.id}>
                        {newDay && (
                          <div className="sticky top-0 z-10 my-2 flex justify-center">
                            <span className="rounded-full bg-card px-3 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground shadow-sm">
                              {dayLabel(msg.timestamp)}
                            </span>
                          </div>
                        )}
                        <article
                          className={cn(
                            "group flex gap-2 px-4 py-0.5",
                            own ? "flex-row-reverse" : "flex-row",
                          )}
                        >
                          <div className="w-8 shrink-0 self-end">
                            {!groupedWithPrev && (
                              <AvatarCircle name={msg.sender.name} avatar={msg.sender.avatar} size={28} />
                            )}
                          </div>
                          <div className={cn("flex min-w-0 max-w-[70%] flex-col gap-1", own && "items-end")}>
                            {!groupedWithPrev && (
                              <span className="px-1 text-[11px] font-medium text-muted-foreground">
                                {own ? "You" : msg.sender.name}
                                <span className="ml-1.5 font-normal">{clockTime(msg.timestamp)}</span>
                                {msg.editedAt && (
                                  <span className="ml-1.5 font-normal italic">(edited)</span>
                                )}
                              </span>
                            )}

                            {msg.deleted ? (
                              <div
                                className={cn(
                                  "rounded-lg border border-dashed px-3 py-1.5 text-xs italic text-muted-foreground",
                                  own ? "bg-card" : "bg-card",
                                )}
                              >
                                This message was deleted
                                {own && (
                                  <>
                                    <button
                                      type="button"
                                      className="ml-2 font-semibold not-italic text-primary underline-offset-2 hover:underline"
                                      onClick={() => restoreMessage(msg.id)}
                                    >
                                      Restore
                                    </button>
                                    <button
                                      type="button"
                                      className="ml-2 font-semibold not-italic text-destructive underline-offset-2 hover:underline"
                                      onClick={() => setConfirmPermanent(msg)}
                                    >
                                      Delete permanently
                                    </button>
                                  </>
                                )}
                              </div>
                            ) : (
                              <div
                                className={cn(
                                  "w-full break-words rounded-xl px-3 py-2 text-sm shadow-sm",
                                  own
                                    ? "rounded-br-sm bg-primary text-primary-foreground"
                                    : "rounded-bl-sm border bg-card",
                                )}
                              >
                                {msg.replyTo && (
                                  <div
                                    className={cn(
                                      "mb-1.5 truncate rounded border-l-2 px-2 py-1 text-[11px]",
                                      own
                                        ? "border-primary-foreground/50 bg-primary-foreground/10"
                                        : "border-primary/60 bg-muted/60",
                                    )}
                                  >
                                    <b>
                                      {msg.replyTo.senderId === profile.id
                                        ? "You"
                                        : messages.find((m) => m.id === msg.replyTo?.id)?.sender?.name ?? "Someone"}
                                    </b>{" "}
                                    {msg.replyTo.content.slice(0, 80) || "message"}
                                  </div>
                                )}
                                <p className="whitespace-pre-wrap">
                                  <HighlightedText text={msg.content} selfName={profile.name} />
                                </p>
                                {msg.fileName && (
                                  <p className="mt-1 flex items-center gap-1 text-[11px] opacity-80">
                                    <Paperclip className="h-3 w-3" /> {msg.fileName}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* reaction chips */}
                            {!msg.deleted && Object.keys(msg.reactions ?? {}).length > 0 && (
                              <div className={cn("flex flex-wrap gap-1 px-1", own && "justify-end")}>
                                {Object.entries(msg.reactions).map(([emoji, ids]) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => toggleReaction(msg.id, emoji)}
                                    aria-pressed={ids.includes(profile.id)}
                                    className={cn(
                                      "rounded-full border px-1.5 py-0.5 text-[11px] transition-colors",
                                      ids.includes(profile.id)
                                        ? "border-primary bg-primary/15 text-primary"
                                        : "border-border bg-card hover:border-primary/40",
                                    )}
                                    title={ids.length === 1 ? `1 reaction` : `${ids.length} reactions`}
                                  >
                                    {emoji} {ids.length}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* hover actions: quick reactions + reply/edit/delete */}
                            {!msg.deleted && !isDMBlocked && (
                              <div
                                className={cn(
                                  "flex gap-0.5 px-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100",
                                  own && "flex-row-reverse",
                                )}
                              >
                                {REACTION_CHOICES.map((emoji) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    aria-label={`React ${emoji}`}
                                    title={`React ${emoji}`}
                                    className="rounded p-0.5 text-xs hover:bg-muted"
                                    onClick={() => toggleReaction(msg.id, emoji)}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                                <button
                                  type="button"
                                  aria-label="Reply to message"
                                  title="Reply"
                                  className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                  onClick={() => {
                                    setReplyTo(msg)
                                    textareaRef.current?.focus()
                                  }}
                                >
                                  <Reply className="h-3.5 w-3.5" />
                                </button>
                                {own && (
                                  <>
                                    <button
                                      type="button"
                                      aria-label="Edit message"
                                      title="Edit"
                                      className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                      onClick={() => {
                                        setEditing(msg)
                                        setReplyTo(null)
                                        setDraft(msg.content)
                                        textareaRef.current?.focus()
                                      }}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      aria-label="Delete message"
                                      title="Delete (restore available)"
                                      className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                                      onClick={() => softDelete(msg.id)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </article>
                      </div>
                    )
                  })
                )}
              </div>

              {/* 5 · composer */}
              <div className="relative border-t bg-card px-3 py-3">
                {isDMBlocked ? (
                  <p className="py-2 text-center text-xs text-muted-foreground">
                    Unblock this conversation (banner above) to send messages.
                  </p>
                ) : (
                  <>
                    {(replyTo || editing) && (
                      <div className="mb-2 flex items-center justify-between rounded-md border bg-muted/40 px-2 py-1 text-xs">
                        <span className="truncate">
                          {editing ? "Editing message" : `Replying to ${replyTo?.sender.name}: `}
                          <span className="text-muted-foreground">
                            {(editing ?? replyTo)?.content.slice(0, 80)}
                          </span>
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          aria-label="Cancel"
                          onClick={() => {
                            if (editing) {
                              setEditing(null)
                              setDraft("")
                            }
                            setReplyTo(null)
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                    <form
                      className="flex items-end gap-2"
                      onSubmit={(e) => {
                        e.preventDefault()
                        sendMessage()
                      }}
                    >
                      <div className="relative flex-1">
                        <Label htmlFor="chat-composer" className="sr-only">
                          Message in {selectedChat.name}
                        </Label>
                        <Textarea
                          id="chat-composer"
                          ref={textareaRef}
                          rows={2}
                          value={draft}
                          placeholder={`Message ${selectedChat.name} — Enter sends, Shift+Enter newline, @ to mention`}
                          onChange={(e) => {
                            setDraft(e.target.value)
                            syncMentionPopup(e.target.value, e.target.selectionStart ?? e.target.value.length)
                          }}
                          onKeyUp={(e) => {
                            const el = e.currentTarget
                            syncMentionPopup(el.value, el.selectionStart ?? el.value.length)
                          }}
                          onKeyDown={(e) => {
                            if (mentionPopup && mentionCandidates.length > 0) {
                              if (e.key === "Tab" || e.key === "Enter") {
                                e.preventDefault()
                                applyMention(mentionCandidates[0].user.name)
                                return
                              }
                              if (e.key === "Escape") {
                                e.preventDefault()
                                setMentionPopup(null)
                                return
                              }
                            }
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault()
                              sendMessage()
                            }
                          }}
                          className="max-h-40 min-h-[2.5rem] resize-y"
                          disabled={sending}
                        />
                        {mentionPopup && mentionCandidates.length > 0 && (
                          <ul
                            className="absolute bottom-full left-2 z-20 mb-1 w-64 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
                            aria-label="Mention suggestions"
                          >
                            {mentionCandidates.map((p, i) => (
                              <li key={p.userId}>
                                <button
                                  type="button"
                                  className={cn(
                                    "flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-muted",
                                    i === 0 && "bg-muted/60",
                                  )}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => applyMention(p.user.name)}
                                >
                                  <AtSign className="h-3.5 w-3.5 text-primary" />
                                  {p.user.name}
                                  {p.isAdmin && <Badge variant="outline" className="ml-auto text-[9px]">admin</Badge>}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="flex items-center gap-1 pb-1">
                        <div className="flex items-center gap-0.5" aria-label="Quick emoji">
                          {EMOJI_PICKS.slice(0, 5).map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              aria-label={`Insert ${emoji}`}
                              className="rounded p-1 text-sm hover:bg-muted"
                              onClick={() => {
                                setDraft((d) => d + emoji)
                                textareaRef.current?.focus()
                              }}
                            >
                              {emoji}
                            </button>
                          ))}
                          <Smile className="h-4 w-4 text-muted-foreground/60" aria-hidden />
                        </div>
                        <span
                          title="Chat file upload is not available — the only verified upload API in this app stores avatars (/api/user/avatar/upload), so attachments stay honest-disabled."
                          className="inline-flex"
                        >
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            aria-label="Attach file (unavailable)"
                            disabled
                          >
                            <Paperclip className="h-4 w-4" />
                          </Button>
                        </span>
                        <Button type="submit" size="icon" aria-label="Send message" disabled={sending || !draft.trim()}>
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </>
          )}
        </section>

        {/* ============================ 6–9 · right rail */}
        <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto border-l bg-card/30 p-3" aria-label="Chat details">
          <div className="grid grid-cols-4 gap-1 rounded-lg bg-muted/60 p-1 text-xs" role="tablist" aria-label="Rail tabs">
            {(
              [
                ["members", "Members", Users],
                ["stats", "Stats", BarChart3],
                ["mentions", "@ Me", AtSign],
                ["archive", "Archive", Archive],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                role="tab"
                aria-selected={railTab === key}
                type="button"
                onClick={() => setRailTab(key)}
                className={cn(
                  "flex items-center justify-center gap-1 rounded-md px-1.5 py-1.5 font-medium transition-colors",
                  railTab === key ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* 6 · members */}
          {railTab === "members" && (
            <SectionCard
              title={selectedChat ? `Members · ${selectedChat.name}` : "Members"}
              icon={<Users className="h-4 w-4" />}
            >
              {!selectedChat ? (
                <EmptyNote>Select a chat to see its roster.</EmptyNote>
              ) : (
                <>
                  <p className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                    presence (demo — status column is not live)
                  </p>
                  <ul className="space-y-1.5">
                    {selectedChat.participantsDetail.map((p) => {
                      const isSelf = p.userId === profile.id
                      return (
                        <li key={p.userId} className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted/50">
                          <span className="relative">
                            <AvatarCircle name={p.user.name} avatar={p.user.avatar} size={28} />
                            <span
                              className="absolute -bottom-0 -right-0 h-2 w-2 rounded-full border border-background bg-slate-400"
                              title="Presence is demo data"
                            />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium">
                              {p.user.name}
                              {isSelf && <span className="text-muted-foreground"> (you)</span>}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {selectedChat.type === "group" ? "member" : "direct message"}
                            </p>
                          </div>
                          {p.isAdmin && (
                            <Badge variant="outline" className="gap-1 text-[9px]" title="Group admin">
                              <Crown className="h-3 w-3" /> admin
                            </Badge>
                          )}
                          {!isSelf && selectedChat.type === "individual" && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-1.5 text-[10px]"
                                onClick={() => toggleMute(selectedChat)}
                              >
                                {selectedChat.isMuted ? "Unmute" : "Mute"}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-1.5 text-[10px] text-destructive"
                                onClick={() => patchChatSettings(selectedChat.id, { isBlocked: true })}
                              >
                                Block
                              </Button>
                            </div>
                          )}
                          {!isSelf && selectedChat.type === "group" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-1.5 text-[10px]"
                              title={`Direct message ${p.user.name}`}
                              onClick={() =>
                                startDm({
                                  id: p.userId,
                                  name: p.user.name,
                                  avatar: p.user.avatar,
                                  department: "",
                                  role: "",
                                })
                              }
                            >
                              DM
                            </Button>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </>
              )}
            </SectionCard>
          )}

          {/* 7 · chat stats */}
          {railTab === "stats" && (
            <>
              <SectionCard title="Messages per day · 14d" icon={<BarChart3 className="h-4 w-4" />}>
                {selectedChat && stats.total > 0 ? (
                  <div className="h-36 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.days} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="day" tick={AXIS} tickLine={false} interval={2} />
                        <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
                        <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted))" }} />
                        <Bar dataKey="count" name="messages" fill="hsl(var(--chart-moss))" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyNote>{selectedChat ? "No messages yet in this chat." : "Select a chat first."}</EmptyNote>
                )}
              </SectionCard>

              <SectionCard title="Most reacted message" icon={<Smile className="h-4 w-4" />}>
                {stats.topMessage ? (
                  <blockquote className="rounded-lg border bg-muted/40 p-2 text-xs">
                    <p className="line-clamp-3">“{stats.topMessage.text}”</p>
                    <footer className="mt-1 text-[10px] text-muted-foreground">
                      {stats.topMessage.author} · {stats.topMessage.count} reaction
                      {stats.topMessage.count === 1 ? "" : "s"}
                    </footer>
                  </blockquote>
                ) : (
                  <EmptyNote>No reactions yet — use the emoji row on any message.</EmptyNote>
                )}
              </SectionCard>

              <SectionCard title="Most active members" icon={<Users className="h-4 w-4" />}>
                {stats.active.length > 0 ? (
                  <ul className="space-y-2">
                    {stats.active.map((s) => (
                      <li key={s.name} className="text-xs">
                        <div className="mb-0.5 flex justify-between">
                          <span className="truncate font-medium">{s.name}</span>
                          <span className="text-muted-foreground">{s.count} msgs</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted">
                          <div
                            className="h-1.5 rounded-full bg-primary/70"
                            style={{ width: `${Math.max(6, (s.count / stats.active[0].count) * 100)}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyNote>No activity yet.</EmptyNote>
                )}
              </SectionCard>
            </>
          )}

          {/* 8 · @me highlights */}
          {railTab === "mentions" && (
            <SectionCard title="Mentions of you" icon={<AtSign className="h-4 w-4" />}>
              <p className="mb-2 text-[10px] text-muted-foreground">
                Live filter of this chat, plus your mention notifications from{" "}
                <code className="font-mono text-[9px]">/api/chat/notifications</code> — click one to
                jump to its chat and mark it read, or dismiss it with the ×.
              </p>
              {selfMentions.length === 0 && mentionFeed.length === 0 ? (
                <EmptyNote>No one has mentioned you recently. Use @Name in the composer.</EmptyNote>
              ) : (
                <div className="space-y-3">
                  {selfMentions.length > 0 && (
                    <ul className="space-y-1.5">
                      {selfMentions.map((m) => (
                        <li key={m.id} className="rounded-md border bg-card p-2 text-xs">
                          <b className="text-[10px] text-muted-foreground">
                            {m.sender.id === profile.id ? "You" : m.sender.name} · {relativeTime(m.timestamp)}
                          </b>
                          <p className="mt-0.5 line-clamp-2">
                            <HighlightedText text={m.content} selfName={profile.name} />
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                  {mentionFeed.length > 0 && (
                    <div>
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-muted-foreground">
                          {unreadFeedCount === 0
                            ? "All caught up"
                            : `${unreadFeedCount} unread notification${unreadFeedCount === 1 ? "" : "s"}`}
                        </span>
                        <button
                          type="button"
                          className="text-[10px] font-semibold text-primary hover:underline disabled:pointer-events-none disabled:opacity-40"
                          disabled={unreadFeedCount === 0}
                          onClick={() =>
                            markFeedRead(mentionFeed.filter((n) => !n.isRead).map((n) => n.id))
                          }
                        >
                          Mark all read
                        </button>
                      </div>
                      <ul className="space-y-1.5">
                        {mentionFeed.slice(0, 8).map((n) => (
                          <li key={n.id} className="flex items-start gap-1 text-xs">
                            <button
                              type="button"
                              className={cn(
                                "min-w-0 flex-1 rounded-md border p-2 text-left hover:bg-muted/60",
                                n.isRead
                                  ? "border-dashed bg-muted/30"
                                  : "border-primary/40 bg-primary/5",
                              )}
                              onClick={() => {
                                if (!n.isRead) markFeedRead([n.id])
                                const chatId = n.metadata?.chatId
                                const link = n.metadata?.link
                                if (chatId && chats.some((c) => c.id === chatId)) {
                                  setSelectedChatId(chatId)
                                  setRailTab("members")
                                } else if (link) {
                                  // Pre-chat mention rows carry a route instead of a chatId.
                                  router.push(link)
                                } else {
                                  toast({
                                    title: "That conversation is no longer in your list.",
                                    description: "It may have been deleted, or you were removed from it.",
                                  })
                                }
                              }}
                            >
                              <b>{n.title}</b>
                              {n.body && <p className="mt-0.5 line-clamp-1 text-muted-foreground">{n.body}</p>}
                              <span className="text-[10px] text-muted-foreground">{relativeTime(n.createdAt)}</span>
                            </button>
                            <button
                              type="button"
                              aria-label="Dismiss notification"
                              title="Dismiss"
                              className="mt-1 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                              onClick={() => dismissFeedItem(n.id)}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </SectionCard>
          )}

          {/* 9 · archives */}
          {railTab === "archive" && (
            <SectionCard title={`Archived chats (${archivedChats.length})`} icon={<Archive className="h-4 w-4" />}>
              {archivedChats.length === 0 ? (
                <EmptyNote>Nothing archived. Use the archive button in a chat header or the sidebar menu.</EmptyNote>
              ) : (
                <ul className="space-y-1.5">
                  {archivedChats.map((c) => (
                    <li key={c.id} className="flex items-center gap-2 rounded-md border bg-card p-2">
                      <AvatarCircle name={c.name} avatar={c.avatar} size={26} />
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left text-xs font-medium hover:underline"
                        onClick={() => toggleArchive(c.id, false)}
                      >
                        {c.name}
                        <span className="block truncate text-[10px] font-normal text-muted-foreground">
                          {c.preview ?? ""}
                        </span>
                      </button>
                      <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => toggleArchive(c.id, false)}>
                        <ArchiveRestore className="mr-1 h-3 w-3" />
                        Unarchive
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          )}

          <div className="px-1 pb-2 text-[10px] text-muted-foreground">
            Polling every {POLL_INTERVAL_MS / 1000}s with an <code>after</code> delta on the open
            chat. Chat is not realtime — Neon Realtime currently backs notifications only.
          </div>
        </aside>
      </div>

      {/* ============================ 10 · create group dialog */}
      <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create group</DialogTitle>
            <DialogDescription>
              The group is stored in <code>chats</code> with members in{" "}
              <code>chat_participants</code>. You become the group admin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="group-name">Group name</Label>
              <Input
                id="group-name"
                value={groupForm.name}
                onChange={(e) => setGroupForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Sprint 24 launch crew"
              />
            </div>
            <div>
              <Label htmlFor="group-description">Description (optional)</Label>
              <Textarea
                id="group-description"
                rows={2}
                value={groupForm.description}
                onChange={(e) => setGroupForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What is this group for?"
              />
            </div>
            <div>
              <Label>Members</Label>
              {teamMembers.length === 0 ? (
                <EmptyNote>No team roster loaded.</EmptyNote>
              ) : (
                <div className="mt-1 max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
                  {teamMembers
                    .filter((m) => m.id !== profile.id)
                    .map((m) => (
                      <label key={m.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs hover:bg-muted/50">
                        <Checkbox
                          checked={groupForm.memberIds.includes(m.id)}
                          onCheckedChange={(checked) =>
                            setGroupForm((f) => ({
                              ...f,
                              memberIds:
                                checked === true
                                  ? [...new Set([...f.memberIds, m.id])]
                                  : f.memberIds.filter((id) => id !== m.id),
                            }))
                          }
                          aria-label={`Add ${m.name}`}
                        />
                        <AvatarCircle name={m.name} avatar={m.avatar} size={20} />
                        <span className="truncate">{m.name}</span>
                        <span className="ml-auto text-[10px] text-muted-foreground">{m.department}</span>
                      </label>
                    ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateGroup(false)}>
              Cancel
            </Button>
            <Button onClick={createGroup} disabled={busy}>
              {busy ? "Creating…" : "Create group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================ 11 · start DM dialog */}
      <Dialog open={showStartDm} onOpenChange={setShowStartDm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start a direct message</DialogTitle>
            <DialogDescription>
              Picking a teammate opens the existing DM or creates one — repeated picks land on the
              same conversation.
            </DialogDescription>
          </DialogHeader>
          {teamMembers.length === 0 ? (
            <EmptyNote>Team roster could not be loaded.</EmptyNote>
          ) : (
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {teamMembers
                .filter((m) => m.id !== profile.id)
                .map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md border p-2 text-left text-xs hover:bg-muted/60"
                    onClick={() => startDm(m)}
                  >
                    <AvatarCircle name={m.name} avatar={m.avatar} size={28} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{m.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {[m.role, m.department].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowStartDm(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================ 3b · admin group-info dialog */}
      <Dialog open={showGroupInfo} onOpenChange={setShowGroupInfo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit group info</DialogTitle>
            <DialogDescription>Only group admins can rename a group or change its description.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="edit-group-name">Name</Label>
              <Input
                id="edit-group-name"
                value={groupInfoForm.name}
                onChange={(e) => setGroupInfoForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-group-description">Description</Label>
              <Textarea
                id="edit-group-description"
                rows={2}
                value={groupInfoForm.description}
                onChange={(e) => setGroupInfoForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowGroupInfo(false)}>
              Cancel
            </Button>
            <Button onClick={saveGroupInfo}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================ 4b · permanent-delete confirm */}
      <AlertDialog
        open={confirmPermanent !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmPermanent(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this message permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              The row is removed from the database for everyone in the conversation and cannot be
              restored. A soft-deleted message still keeps its original content server-side until
              you do this.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmPermanent) permanentDelete(confirmPermanent.id)
              }}
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* ---------------------------------------------------------- sidebar bits */

function ChatGroupLabel({
  label,
  chats,
  render,
}: {
  label: string
  chats: ChatSummary[]
  render: (chat: ChatSummary) => React.ReactNode
}) {
  if (chats.length === 0) return null
  return (
    <div className="mb-1">
      <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {chats.map(render)}
    </div>
  )
}

function ChatRow({
  chat,
  active,
  onSelect,
  onTogglePin,
  onToggleMute,
  onArchive,
}: {
  chat: ChatSummary
  active: boolean
  onSelect: (id: string) => void
  onTogglePin: (chat: ChatSummary) => void
  onToggleMute: (chat: ChatSummary) => void
  onArchive: (chatId: string, isArchived: boolean) => void
}) {
  return (
    <div
      className={cn(
        "group relative mb-0.5 flex cursor-pointer items-start gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
        active ? "bg-primary/10" : "hover:bg-muted/60",
      )}
      onClick={() => onSelect(chat.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelect(chat.id)
        }
      }}
      role="button"
      tabIndex={0}
      aria-current={active ? "true" : undefined}
    >
      <AvatarCircle name={chat.name} avatar={chat.avatar} size={32} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className={cn("truncate text-xs font-semibold", active && "text-primary")}>{chat.name}</p>
          {chat.isMuted && <BellOff className="h-3 w-3 shrink-0 text-muted-foreground" />}
          <span className="ml-auto shrink-0 text-[9px] text-muted-foreground">
            {chat.lastMessageTime ? relativeTime(chat.lastMessageTime) : ""}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <p className="truncate text-[11px] text-muted-foreground">{chat.preview}</p>
          {chat.unreadCount > 0 && (
            <Badge
              className="ml-auto h-4 shrink-0 min-w-4 px-1 text-center text-[9px] leading-4"
              variant={chat.isMuted ? "secondary" : "default"}
            >
              {chat.unreadCount}
            </Badge>
          )}
        </div>
      </div>
      {/* hover controls */}
      <div className="absolute right-1 top-1 hidden gap-0.5 rounded-md bg-card/95 p-0.5 shadow-sm group-hover:flex">
        <button
          type="button"
          aria-label={chat.isPinned ? "Unpin" : "Pin"}
          title={chat.isPinned ? "Unpin" : "Pin"}
          className="rounded p-1 hover:bg-muted"
          onClick={(e) => {
            e.stopPropagation()
            onTogglePin(chat)
          }}
        >
          {chat.isPinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
        </button>
        <button
          type="button"
          aria-label={chat.isMuted ? "Unmute" : "Mute"}
          title={chat.isMuted ? "Unmute" : "Mute"}
          className="rounded p-1 hover:bg-muted"
          onClick={(e) => {
            e.stopPropagation()
            onToggleMute(chat)
          }}
        >
          {chat.isMuted ? <Bell className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
        </button>
        <button
          type="button"
          aria-label="Archive"
          title="Archive"
          className="rounded p-1 hover:bg-muted"
          onClick={(e) => {
            e.stopPropagation()
            onArchive(chat.id, true)
          }}
        >
          <Archive className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}
