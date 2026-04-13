'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  "What's missing from this tour?",
  "Summarise the full itinerary",
  "Draft an advance email to the first venue",
  "What does the band need before departure?",
]

const accent = '#C4622D'
const bg = '#1A1714'
const card = '#242018'
const border = '#2A2520'
const muted = '#5A5450'
const textCol = '#F4EFE6'

export default function FloatingAssistant() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [tourId, setTourId] = useState<string | null>(null)
  const [tourName, setTourName] = useState<string | null>(null)
  const [tours, setTours] = useState<any[]>([])
  const [showTourPicker, setShowTourPicker] = useState(false)
  const [attachments, setAttachments] = useState<{ name: string, base64: string, type: string }[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Don't show on public pages or auth pages
  const hidden = ['/', '/auth/signin', '/auth/signup', '/onboarding', '/privacy', '/terms'].includes(pathname)
    || pathname.startsWith('/daysheet/')
    || pathname.startsWith('/tour/')

  // Extract tour_id from URL if on a tour-related page
  useEffect(() => {
    const match = pathname.match(/\/dashboard\/artists\/([^/]+)/) 
    const tourMatch = pathname.match(/\/tour-ai\/([^/]+)/)
    
    if (tourMatch) {
      setTourId(tourMatch[1])
    } else if (match) {
      // On artist page - try to get active tour
      const artistId = match[1]
      if (artistId && artistId !== 'new') {
        supabase.from('tours').select('id, name').eq('artist_id', artistId).order('start_date', { ascending: false }).limit(1).single()
          .then(({ data }) => {
            if (data) { setTourId(data.id); setTourName(data.name) }
          })
      }
    }
  }, [pathname])

  // Load tour name when tourId changes
  useEffect(() => {
    if (!tourId) return
    supabase.from('tours').select('name').eq('id', tourId).single()
      .then(({ data }) => { if (data) setTourName(data.name) })
  }, [tourId])

  // Load all tours for picker
  useEffect(() => {
    if (!open) return
    supabase.from('tours').select('id, name, artists(name)').order('start_date', { ascending: false })
      .then(({ data }) => setTours(data || []))
  }, [open])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Focus textarea when opened
  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 100)
  }, [open])

  async function send(text?: string) {
    const content = text || input.trim()
    if ((!content && attachments.length === 0) || loading) return
    if (!tourId) { setShowTourPicker(true); return }

    const displayContent = content + (attachments.length > 0 ? `\n📎 ${attachments.map(a => a.name).join(', ')}` : '')
    const userMsg: Message = { role: 'user', content: displayContent }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setAttachments([])
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setLoading(true)

    try {
      const res = await fetch('/api/tour-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourId,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          attachments,
        }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.success ? data.message : `Error: ${data.error}`,
      }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Try again.' }])
    }
    setLoading(false)
  }

  async function handleFileAttach(files: FileList | null) {
    if (!files) return
    const newAtts = await Promise.all(Array.from(files).map(async file => {
      const ext = file.name.split('.').pop()?.toLowerCase()

      // Excel files - parse to text via SheetJS then send as plain text attachment
      if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
        let text = ''
        if (ext === 'csv') {
          text = await file.text()
        } else {
          // Load SheetJS
          if (!(window as any).XLSX) {
            await new Promise<void>((res, rej) => {
              const s = document.createElement('script')
              s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
              s.onload = () => res(); s.onerror = rej
              document.head.appendChild(s)
            })
          }
          const XLSX = (window as any).XLSX
          const buffer = await file.arrayBuffer()
          const wb = XLSX.read(buffer, { type: 'array' })
          const parts: string[] = []
          for (const sheetName of wb.SheetNames) {
            const ws = wb.Sheets[sheetName]
            const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
            parts.push(`=== ${sheetName} ===`)
            for (const row of data) {
              const cells = row.map((c: any) => String(c ?? '').trim()).filter(Boolean)
              if (cells.length >= 2) parts.push(cells.slice(0, 10).join(' | '))
            }
          }
          text = parts.join('\n')
        }
        // Encode as base64 text so the API can read it as a document
        const base64 = btoa(unescape(encodeURIComponent(text)))
        return { name: file.name, base64, type: 'text/plain' }
      }

      // All other files (PDF, images, docx etc) - send as-is
      const base64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader()
        reader.onload = () => res((reader.result as string).split(',')[1])
        reader.onerror = rej
        reader.readAsDataURL(file)
      })
      return { name: file.name, base64, type: file.type || 'application/octet-stream' }
    }))
    setAttachments(prev => [...prev, ...newAtts])
  }

  function formatMessage(text: string) {
    return text
      .split('\n')
      .map((line, i) => {
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return `<div style="display:flex;gap:6px;margin:2px 0"><span style="opacity:0.4;flex-shrink:0">—</span><span>${line.slice(2)}</span></div>`
        }
        return `<span>${line}</span>`
      })
      .join('<br/>')
  }

  if (hidden) return null

  return (
    <>
      <style>{`
        @keyframes ai-bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }
        @keyframes ai-pop { from{opacity:0;transform:scale(0.92) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
        .ai-bubble-btn:hover { transform: scale(1.07); }
        .ai-bubble-btn { transition: transform 0.15s; }
      `}</style>

      {/* Floating button */}
      {!open && (
        <button
          className="ai-bubble-btn"
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed', bottom: 28, right: 28, zIndex: 1000,
            width: 52, height: 52, borderRadius: '50%',
            background: accent, border: 'none', cursor: 'pointer',
            color: '#fff', fontSize: 20, boxShadow: '0 4px 20px rgba(196,98,45,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          title="Open Assistant"
        >
          ✦
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
          width: 380, height: 560,
          background: bg, borderRadius: 16,
          border: `1px solid ${border}`,
          boxShadow: '0 16px 60px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column',
          fontFamily: 'Georgia, serif',
          animation: 'ai-pop 0.2s ease',
          overflow: 'hidden',
        }}>

          {/* Header */}
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>✦</div>
              <div>
                <div style={{ fontSize: 13, color: textCol, fontStyle: 'italic' }}>Assistant</div>
                {tourName ? (
                  <button onClick={() => setShowTourPicker(!showTourPicker)}
                    style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.1em', color: accent, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    {tourName.length > 28 ? tourName.slice(0, 28) + '…' : tourName} ▾
                  </button>
                ) : (
                  <button onClick={() => setShowTourPicker(!showTourPicker)}
                    style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.1em', color: muted, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    SELECT TOUR ▾
                  </button>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {messages.length > 0 && (
                <button onClick={() => setMessages([])}
                  style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.1em', color: muted, background: 'none', border: `1px solid ${border}`, borderRadius: 4, padding: '4px 8px', cursor: 'pointer' }}>
                  CLEAR
                </button>
              )}
              <button onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 2px' }}>
                ×
              </button>
            </div>
          </div>

          {/* Tour picker dropdown */}
          {showTourPicker && (
            <div style={{ background: '#0F0E0C', borderBottom: `1px solid ${border}`, maxHeight: 180, overflowY: 'auto', flexShrink: 0 }}>
              {tours.map(t => (
                <button key={t.id} onClick={() => { setTourId(t.id); setTourName(t.name); setShowTourPicker(false); setMessages([]) }}
                  style={{ width: '100%', padding: '10px 16px', background: t.id === tourId ? '#2A2520' : 'transparent', border: 'none', borderBottom: `1px solid ${border}`, cursor: 'pointer', textAlign: 'left', color: textCol, fontSize: 13, fontFamily: 'Georgia, serif', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span>{t.name}</span>
                  {t.artists?.name && <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.1em', color: muted }}>{t.artists.name}</span>}
                </button>
              ))}
              {tours.length === 0 && (
                <div style={{ padding: '12px 16px', color: muted, fontSize: 12, fontFamily: 'monospace' }}>No tours found</div>
              )}
            </div>
          )}

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>

            {messages.length === 0 && !loading && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 13, color: muted, marginBottom: 12, lineHeight: 1.6 }}>
                  {tourName ? `Context loaded for **${tourName}**.` : 'Select a tour above, then ask me anything.'}
                </div>
                {tourId && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {SUGGESTIONS.map((s, i) => (
                      <button key={i} onClick={() => send(s)}
                        style={{ padding: '8px 12px', background: card, border: `1px solid ${border}`, borderRadius: 8, cursor: 'pointer', fontSize: 12, color: textCol, fontFamily: 'Georgia, serif', textAlign: 'left' }}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 8 }}>
                {msg.role === 'assistant' && (
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: accent, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, marginTop: 2 }}>✦</div>
                )}
                <div style={{
                  maxWidth: '85%', padding: '10px 13px',
                  borderRadius: msg.role === 'user' ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
                  background: msg.role === 'user' ? accent : card,
                  color: textCol,
                  border: msg.role === 'assistant' ? `1px solid ${border}` : 'none',
                  fontSize: 13, lineHeight: 1.65,
                }}>
                  {msg.role === 'assistant'
                    ? <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                    : msg.content
                  }
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9 }}>✦</div>
                <div style={{ padding: '10px 14px', borderRadius: '14px 14px 14px 3px', background: card, border: `1px solid ${border}`, display: 'flex', gap: 5, alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: muted, animation: `ai-bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '10px 12px 12px', borderTop: `1px solid ${border}`, flexShrink: 0 }}>
            <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx,.xls" style={{ display: 'none' }}
              onChange={e => handleFileAttach(e.target.files)} />

            {/* Attachment chips */}
            {attachments.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {attachments.map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', background: card, border: `1px solid ${border}`, borderRadius: 20, fontSize: 11, color: textCol }}>
                    <span>{a.type.startsWith('image/') ? '🖼' : '📄'}</span>
                    <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                    <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                      style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1, marginLeft: 2 }}>×</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <button onClick={() => fileInputRef.current?.click()} disabled={!tourId}
                style={{ width: 40, height: 40, background: 'transparent', border: `1px solid ${border}`, borderRadius: 10, cursor: tourId ? 'pointer' : 'default', color: muted, fontSize: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: tourId ? 1 : 0.4 }}
                title="Attach file">
                📎
              </button>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => {
                  setInput(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
                }}
                placeholder={tourId ? 'Ask anything, or attach a doc...' : 'Select a tour first...'}
                rows={1}
                disabled={!tourId}
                style={{
                  flex: 1, padding: '10px 12px',
                  border: `1px solid ${border}`, borderRadius: 10,
                  background: card, color: textCol,
                  fontSize: 13, fontFamily: 'Georgia, serif',
                  resize: 'none', outline: 'none',
                  lineHeight: 1.5, minHeight: 40, maxHeight: 120,
                  overflowY: 'auto',
                  opacity: tourId ? 1 : 0.5,
                }}
              />
              <button onClick={() => send()} disabled={loading || (!input.trim() && attachments.length === 0) || !tourId}
                style={{
                  width: 40, height: 40, background: (input.trim() || attachments.length > 0) && tourId ? accent : border,
                  color: '#fff', border: 'none', borderRadius: 10,
                  cursor: (input.trim() || attachments.length > 0) && tourId ? 'pointer' : 'default',
                  fontSize: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                ↑
              </button>
            </div>
          </div>

        </div>
      )}
    </>
  )
}
