import React, { useEffect, useRef, useState } from "react"
import { RoleBasedLayout } from "@/components/layout/role-based-layout"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  MessageSquare,
  Send,
  Info,
} from "lucide-react"

type ChatMsg = {
  id: string
  role: "user" | "assistant"
  text: string
  ts: number
}

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/+$/, "") ?? ""
const api = (path: string) => `${API_BASE}/api/v1${path}`

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
  const listRef = useRef<HTMLDivElement>(null)

  // Simple, local rule-based responder (stub)
  function generateReply(q: string): string {
    const s = q.toLowerCase()

    if (/(policy|policies)/.test(s) && /(pdf|open|view)/.test(s)) {
      return "You can view your linked policies from the Policies page. If you see a PDF button there, click it to open the policy document."
    }
    if (/(coverage|covered|copay|co-pay)/.test(s)) {
      return "Coverage depends on the specific policy version. In general: “covered” means no cost beyond copays/deductibles, “percent” means cost share by percentage, and “not covered” means you pay the retail price."
    }
    if (/(medication|drug|rx|paracetamol|ibuprofen|metformin|insulin|glp-1)/.test(s)) {
      return "Medication coverage varies per policy. Ask about a specific medication and policy (e.g., “Is metformin 500mg covered on my latest policy?”) for a more precise answer."
    }
    if (/(how|help|what can you do)/.test(s)) {
      return "I can help summarize how policy coverage works, explain terms in plain language, and guide you to where to view your policy PDFs. In a future version I can read your actual policies to answer specifically."
    }
    if (/(hi|hello|hey)/.test(s)) {
      return "Hello! How can I help with your insurance policies today?"
    }
    return "Thanks! I’m a simple demo assistant right now. Try asking about coverage terms, medications, or where to see your policy PDFs."
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return

    setSending(true)
    const userMsg: ChatMsg = { id: crypto.randomUUID(), role: "user", text, ts: Date.now() }
    setMessages((m) => [...m, userMsg])
    setInput("")

    // simulate thinking + local reply
    setTimeout(() => {
      const reply = generateReply(text)
      const botMsg: ChatMsg = { id: crypto.randomUUID(), role: "assistant", text: reply, ts: Date.now() }
      setMessages((m) => [...m, botMsg])
      setSending(false)
      // scroll to bottom after adding messages
      requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }))
    }, 300)
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
          <p className="text-muted-foreground mt-2">
            Talk to our smart chatbot to learn more.
          </p>
        </div>

        {/* Chat Window */}
        <Card className="h-[560px] flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Chat
            </CardTitle>
            <CardDescription>Type a question below to get started.</CardDescription>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col gap-3 min-h-0">
            {/* Messages list */}
            <div
              ref={listRef}
              className="flex-1 overflow-y-auto rounded-md border bg-card p-3 space-y-3"
            >
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[90%] md:max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "mr-auto bg-muted text-foreground"
                  }`}
                >
                  {m.text}
                </div>
              ))}
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
                <Send className="h-4 w-4 mr-2" />
                Send
              </Button>
            </div>

            {/* Info footer */}
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <Info className="h-3.5 w-3.5" />
              Demo assistant — not yet reading your actual policies.
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleBasedLayout>
  )
}
