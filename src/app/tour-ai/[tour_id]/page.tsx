'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const SUGGESTIONS = [
  "What's missing from this tour?",
  "Draft an advance email to the first venue",
  "Summarise the full itinerary",
  "Are there any scheduling conflicts?",
  "What does the band need to know before departure?",
  "Draft a message to the crew about tomorrow",
]

export default function TourAIPage() {
  const params = useParams()
  const router = useRouter()
  const [tour, setTour] = useState<any>(null)
  const [artist, setArtist] = useState<any>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [attachments, setAttachments] = useState<{ name: string, base64: string, type: string }[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [darkMode, setDarkMode] = useState(false)
  const [tourLoading, setTourLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function clearChat() {
    try { localStorage.removeItem(`advance_chat_${params.tour_id}`) } catch {}
    setMessages([{
      role: 'assistant',
      content: `Chat cleared. I still have full context on **${tour?.name}**. What do you need?`,
      timestamp: new Date()
    }])
  }

  useEffect(() => { loadTour() }, [params.tour_id])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Persist messages per tour in localStorage
  useEffect(() => {
    if (!params.tour_id || messages.length === 0) return
    try {
      const key = `advance_chat_${params.tour_id}`
      localStorage.setItem(key, JSON.stringify(messages.map(m => ({ ...m, timestamp: m.timestamp.toISOString() }))))
    } catch {}
  }, [messages])

  async function loadTour() {
    // Clear messages immediately when tour changes to avoid bleed-over
    setMessages([])
    const { data: tourData } = await supabase.from('tours').select('*, artists(*)').eq('id', params.tour_id).single()
    if (!tourData) { router.push('/dashboard'); return }
    setTour(tourData)
    setArtist(tourData.artists)
    setTourLoading(false)

    // Restore saved conversation for this specific tour
    try {
      const key = `advance_chat_${params.tour_id}`
      const saved = localStorage.getItem(key)
      if (saved) {
        const parsed = JSON.parse(saved)
        setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })))
        return
      }
    } catch {}

    // Opening message for new tour conversations
    setMessages([{
      role: 'assistant',
      content: `I have full context on **${tourData.name}** — ${tourData.artists?.name}. Ask me anything about the tour, paste in any information you want to add, or ask me to draft something.\n\nWhat do you need?`,
      timestamp: new Date()
    }])
  }

  async function send(text?: string) {
    const content = text || input.trim()
    if ((!content && attachments.length === 0) || loading) return

    const displayContent = content + (attachments.length > 0 ? `\n📎 ${attachments.map(a => a.name).join(', ')}` : '')
    const userMessage: Message = { role: 'user', content: displayContent, timestamp: new Date() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setAttachments([])
    setLoading(true)

    try {
      const res = await fetch('/api/tour-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourId: params.tour_id,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          attachments,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.message,
          timestamp: new Date()
        }])
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Sorry, something went wrong: ${data.error}`,
          timestamp: new Date()
        }])
      }
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Connection error. Please try again.',
        timestamp: new Date()
      }])
    }
    setLoading(false)
  }

  function formatMessage(text: string) {
    // Simple markdown: bold, bullets, line breaks
    return text
      .split('\n')
      .map((line, i) => {
        // Bold
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Bullet
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return `<div key="${i}" style="display:flex;gap:8px;margin:2px 0"><span style="opacity:0.4;flex-shrink:0">—</span><span>${line.slice(2)}</span></div>`
        }
        return `<span>${line}</span>`
      })
      .join('<br/>')
  }

  async function handleFileAttach(files: FileList | null) {
    if (!files) return
    const newAttachments = await Promise.all(Array.from(files).map(async file => {
      const base64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader()
        reader.onload = () => res((reader.result as string).split(',')[1])
        reader.onerror = rej
        reader.readAsDataURL(file)
      })
      return { name: file.name, base64, type: file.type || 'application/octet-stream' }
    }))
    setAttachments(prev => [...prev, ...newAttachments])
  }

  const bg = darkMode ? '#1a1a1a' : '#F5F0E8'
  const card = darkMode ? '#2a2a2a' : '#fff'
  const text = darkMode ? '#e8e0d0' : '#1A1714'
  const muted = darkMode ? '#888' : '#8A8580'
  const border = darkMode ? '#333' : '#DDD8CE'
  const accent = '#C4622D'

  if (tourLoading) return (
    <div style={{ background: bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif', color: muted }}>Loading...</div>
  )

  return (
    <div style={{ background: bg, minHeight: '100vh', fontFamily: 'Georgia, serif', color: text, display: 'flex', flexDirection: 'column', height: '100vh' }}>

      {/* Header */}
      <div style={{ background: darkMode ? '#111' : '#1A1714', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()} style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, color: '#8A8580', background: 'transparent', border: '1px solid #2A2520', borderRadius: 4, padding: '6px 10px', cursor: 'pointer' }}>← BACK</button>
          <div>
            <span style={{ fontSize: 15, fontStyle: 'italic', color: '#F5F0E8' }}>{artist?.name}</span>
            <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', color: accent, marginLeft: 8 }}>✦ ASSISTANT</span>
            <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.1em', color: '#4A4540', marginLeft: 8 }}>· {tour?.name?.toUpperCase()}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={clearChat} style={{ background: 'none', border: '1px solid #2A2520', borderRadius: 6, padding: '6px 10px', color: '#5A5450', cursor: 'pointer', fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.1em' }}
            title="Clear this tour's chat history">
            CLEAR CHAT
          </button>
          <button onClick={() => setDarkMode(!darkMode)} style={{ background: 'none', border: '1px solid #333', borderRadius: 6, padding: '6px 10px', color: '#F5F0E8', cursor: 'pointer', fontSize: 12 }}>
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 800, width: '100%', margin: '0 auto', boxSizing: 'border-box' as const }}>

        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 10 }}>
            {msg.role === 'assistant' && (
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: accent, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, marginTop: 2 }}>✦</div>
            )}
            <div style={{
              maxWidth: '80%',
              padding: '12px 16px',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: msg.role === 'user' ? accent : card,
              color: msg.role === 'user' ? '#fff' : text,
              border: msg.role === 'assistant' ? `1px solid ${border}` : 'none',
              fontSize: 14,
              lineHeight: 1.7,
            }}>
              {msg.role === 'assistant'
                ? <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                : msg.content
              }
              <div style={{ fontSize: 10, opacity: 0.5, marginTop: 6, fontFamily: 'monospace' }}>
                {msg.timestamp.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12 }}>✦</div>
            <div style={{ padding: '12px 16px', borderRadius: '16px 16px 16px 4px', background: card, border: `1px solid ${border}`, display: 'flex', gap: 6, alignItems: 'center' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: muted, animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggestions - only show at start */}
      {messages.length <= 1 && (
        <div style={{ padding: '0 16px 12px', maxWidth: 800, width: '100%', margin: '0 auto', boxSizing: 'border-box' as const }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SUGGESTIONS.map((s, i) => (
              <button key={i} onClick={() => send(s)}
                style={{ padding: '7px 14px', background: 'transparent', border: `1px solid ${border}`, borderRadius: 20, cursor: 'pointer', fontSize: 12, color: muted, fontFamily: 'Georgia, serif' }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '12px 16px 20px', borderTop: `1px solid ${border}`, background: bg, flexShrink: 0 }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt" style={{ display: 'none' }}
            onChange={e => handleFileAttach(e.target.files)} />
          {attachments.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {attachments.map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: card, border: `1px solid ${border}`, borderRadius: 20, fontSize: 12 }}>
                  <span>{a.type.startsWith('image/') ? '🖼' : '📄'}</span>
                  <span style={{ color: text }}>{a.name}</span>
                  <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                    style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <button onClick={() => fileInputRef.current?.click()}
            style={{ width: 46, height: 46, background: 'transparent', border: `1px solid ${border}`, borderRadius: 10, cursor: 'pointer', color: muted, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            title="Attach file">
            📎
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
            }}
            placeholder="Ask anything, or paste in an email, confirmation, or itinerary..."
            rows={1}
            style={{ flex: 1, padding: '12px 16px', border: `1px solid ${border}`, borderRadius: 12, background: card, color: text, fontSize: 14, fontFamily: 'Georgia, serif', resize: 'none', outline: 'none', lineHeight: 1.5, minHeight: 46, maxHeight: 160, overflowY: 'auto' }}
          />
          <button onClick={() => send()} disabled={loading || (!input.trim() && attachments.length === 0)}
            style={{ width: 46, height: 46, background: (input.trim() || attachments.length > 0) ? accent : border, color: '#fff', border: 'none', borderRadius: 12, cursor: (input.trim() || attachments.length > 0) ? 'pointer' : 'default', fontSize: 18, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ↑
          </button>
          </div>
        </div>
        <div style={{ maxWidth: 800, margin: '6px auto 0', fontSize: 11, color: muted, fontFamily: 'monospace', letterSpacing: 1 }}>
          ENTER TO SEND · SHIFT+ENTER FOR NEW LINE · PASTE ANY DOCUMENT
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0) }
          30% { transform: translateY(-6px) }
        }
      `}</style>
    </div>
  )
}
