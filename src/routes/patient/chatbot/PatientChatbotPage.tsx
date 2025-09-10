import React, { useEffect, useRef, useState } from "react"
import { RoleBasedLayout } from "@/components/layout/role-based-layout"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MessageSquare, Send, Info, Loader2 } from "lucide-react"

type ChatMsg = {
  id: string
  role: "user" | "assistant"
  text: string
  ts: number
}

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/+$/, "") ?? ""
const api = (path: string) => `${API_BASE}/api/v1${path}`

/** Basic HTML escaper so we can safely inject formatted Markdown-ish text */
function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

/**
 * Very small “Markdown-lite” formatter:
 * - supports ### Headings
 * - **bold**
 * - bullet lists (- item)
 * - keeps paragraphs and line breaks
 * This avoids pulling in a full markdown lib.
 */
function mdLiteToHtml(input: string) {
  const text = escapeHtml(input)

  // Split into lines for simple structural transforms
  const lines = text.split(/\r?\n/)

  const out: string[] = []
  let inList = false

  const flushList = () => {
    if (inList) {
      out.push("</ul>")
      inList = false
    }
  }

  for (let raw of lines) {
    let line = raw.trim()

    // Headings: ### Title
    if (/^#{1,6}\s+/.test(line)) {
      flushList()
      const level = Math.min(6, (line.match(/^#+/)?.[0].length) || 3)
      const content = line.replace(/^#{1,6}\s+/, "")
      out.push(`<h${level} class="font-semibold mt-2 mb-1">${content}</h${level}>`)
      continue
    }

    // Bullets: - item
    if (/^-\s+/.test(line)) {
      if (!inList) {
        inList = true
        out.push('<ul class="list-disc pl-6 space-y-1 my-1">')
      }
      const content = line.replace(/^-\s+/, "")
      out.push(`<li>${content}</li>`)
      continue
    }

    // Blank line → paragraph break
    if (line === "") {
      flushList()
      out.push("<br/>")
      continue
    }

    // Normal paragraph line
    flushList()
    out.push(`<p>${line}</p>`)
  }
  flushList()

  // **bold**
  let html = out.join("\n").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")

  return html
}

export default function PatientChatbotPage() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMsg[]>(() => [
    {
      id: crypto.randomUUID(),
      role: "assistant",
      ts: Date.now(),
      text: "Hi! I’m your Policy Assistant. Talk to our smart chatbot to learn more.",
    },
  ])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Send conversation to backend (with user id in body or header—your server accepts body.userId)
  const callBackend = async (allMessages: ChatMsg[]): Promise<string> => {
    const history = allMessages.map(m => ({ role: m.role, content: m.text }))

    const res = await fetch(api("/ai/chat"), {
      method: "POST",
      credentials: "include", // keep if you need cookies
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user?.id ?? null,
        messages: history,
      }),
    })

    // Prefer JSON; fall back to text
    let reply: string | null = null
    try {
      const data = await res.json()
      reply =
        data?.answer ??           // <-- your backend field
        data?.reply ??
        data?.message ??
        data?.content ??
        data?.assistant ??
        data?.choices?.[0]?.message?.content ??
        null
      if (!res.ok) throw new Error(reply || `HTTP ${res.status}`)
    } catch {
      const txt = await res.text().catch(() => "")
      if (!res.ok) throw new Error(txt || `HTTP ${res.status}`)
      reply = txt || null
    }

    return (reply && String(reply).trim()) || "Sorry, I didn’t get a response."
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return

    setError(null)
    setSending(true)

    const userMsg: ChatMsg = { id: crypto.randomUUID(), role: "user", text, ts: Date.now() }
    setMessages((m) => [...m, userMsg])
    setInput("")

    try {
      const replyText = await callBackend([...messages, userMsg])
      const botMsg: ChatMsg = { id: crypto.randomUUID(), role: "assistant", text: replyText, ts: Date.now() }
      setMessages((m) => [...m, botMsg])
    } catch (e: any) {
      setError(e?.message ?? "Failed to reach the chatbot service.")
      const botMsg: ChatMsg = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: "Hmm, I couldn’t reach the chatbot service. Please try again.",
        ts: Date.now(),
      }
      setMessages((m) => [...m, botMsg])
    } finally {
      setSending(false)
      requestAnimationFrame(() =>
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" })
      )
    }
  }

  useEffect(() => {
    // auto scroll on initial mount
    requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }))
  }, [])

  return (
    <RoleBasedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Policy Chatbot</h1>
          <p className="text-muted-foreground mt-2">Talk to our smart chatbot to learn more.</p>
        </div>

        <Card className="h-[560px] flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Chat
            </CardTitle>
            <CardDescription>Type a question below to get started.</CardDescription>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col gap-3 min-h-0">
            {error && <div className="text-xs text-destructive -mt-1">{error}</div>}

            {/* Messages */}
            <div
              ref={listRef}
              className="flex-1 overflow-y-auto rounded-md border bg-card p-3 space-y-3"
            >
              {messages.map((m) => {
                const common = "max-w-[90%] md:max-w-[70%] rounded-lg px-3 py-2 text-sm"
                if (m.role === "assistant") {
                  return (
                    <div
                      key={m.id}
                      className={`mr-auto bg-muted text-foreground ${common}`}
                      // Safe: we escaped content first, then added small formatting
                      dangerouslySetInnerHTML={{ __html: mdLiteToHtml(m.text) }}
                    />
                  )
                }
                return (
                  <div key={m.id} className={`ml-auto bg-primary text-primary-foreground ${common}`}>
                    {m.text}
                  </div>
                )
              })}
            </div>

            {/* Composer */}
            <div className="flex items-center gap-2">
              <Input
                placeholder="Ask about coverage, policies, or medications…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                disabled={sending}
              />
              <Button onClick={handleSend} disabled={sending || !input.trim()}>
                {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                {sending ? "Sending…" : "Send"}
              </Button>
            </div>

            {/* Footer */}
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <Info className="h-3.5 w-3.5" />
              Demo assistant. Not a real medical advisor. For questions about your health or insurance, please contact a professional.
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleBasedLayout>
  )
}
