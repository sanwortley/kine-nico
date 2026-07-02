'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';

type Role = 'user' | 'assistant';
interface Message { role: Role; content: string; events?: string[] }

const INIT: Message = {
  role: 'assistant',
  content: '¡Hola! Puedo crear planes de entrenamiento o agendar turnos recurrentes. ¿Qué necesitás?',
};

export default function FloatingChat() {
  const pathname = usePathname();
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState<Message[]>([INIT]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  // ALL hooks must be called before any conditional return
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [open, messages]);

  const send = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const userMsg: Message = { role: 'user', content };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);

    const apiMessages = next
      .slice(1)
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch('/api/ai/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const events: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.type === 'event') {
              events.push(msg.data);
              setMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last?.role === 'assistant' && last.content === '') {
                  return [...copy.slice(0, -1), { ...last, events: [...(last.events ?? []), msg.data] }];
                }
                return [...copy, { role: 'assistant' as const, content: '', events: [msg.data] }];
              });
            } else if (msg.type === 'done') {
              setMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last?.role === 'assistant' && last.content === '') {
                  return [...copy.slice(0, -1), { ...last, content: msg.reply }];
                }
                return [...copy, { role: 'assistant' as const, content: msg.reply, events }];
              });
            }
          } catch { /* ignore malformed lines */ }
        }
      }
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${err.message ?? 'No se pudo conectar con el asistente.'}`,
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  // Conditional render AFTER all hooks
  const visible = pathname.startsWith('/admin') || pathname.startsWith('/professional');
  if (!visible) return null;

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-4 z-50 w-[340px] sm:w-[380px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          style={{ maxHeight: 'min(520px, calc(100vh - 100px))' }}>

          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between shrink-0" style={{ background: 'linear-gradient(to right, #0A3D62, #2980B9)' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0">
                <img src="/icono_chatbot.png" alt="NJK" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="text-white text-xs font-bold">Asistente IA</p>
                <p className="text-white/60 text-[10px]">NJK Planificación</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <a href="/admin/ai-planner"
                title="Abrir en pantalla completa"
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              <button onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 text-sm">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-[#0A3D62] text-white rounded-br-sm'
                    : 'bg-slate-50 border border-slate-100 text-slate-700 rounded-bl-sm'
                }`}>
                  {msg.role === 'assistant' && msg.events && msg.events.length > 0 && (
                    <div className="mb-1.5 pb-1.5 border-b border-slate-200 space-y-0.5">
                      {msg.events.map((ev, j) => (
                        <p key={j} className="text-[10px] text-slate-400 flex items-center gap-1">
                          <span className="text-green-500">✓</span> {ev}
                        </p>
                      ))}
                    </div>
                  )}
                  {msg.content}
                  {msg.content.includes('/professional/programas/') && (
                    <a href={msg.content.match(/\/professional\/programas\/[\w-]+/)?.[0]}
                      className="mt-1.5 flex items-center gap-1 text-[#2980B9] font-bold text-[10px] hover:underline">
                      → Ver programa
                    </a>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-50 border border-slate-100 rounded-xl rounded-bl-sm px-3 py-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-[#2980B9] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-[#2980B9] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-[#2980B9] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-slate-100 px-3 py-2.5 flex items-end gap-2 shrink-0">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Escribí acá..."
              rows={1}
              disabled={loading}
              className="flex-1 resize-none text-xs px-2.5 py-2 rounded-lg border border-slate-200 text-slate-700 focus:outline-none focus:border-[#2980B9] disabled:opacity-50 max-h-20 overflow-y-auto"
              style={{ minHeight: 34 }}
            />
            <button onClick={() => send()} disabled={loading || !input.trim()}
              className="h-[34px] w-[34px] rounded-lg text-white flex items-center justify-center transition-colors disabled:opacity-40 shrink-0" style={{ background: '#2980B9' }}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-4 right-4 z-50 w-14 h-14 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all overflow-hidden"
      >
        <img src="/icono_chatbot.png" alt="Asistente IA" className="w-full h-full object-cover" />
      </button>
    </>
  );
}