'use client';

import { useState, useRef, useEffect } from 'react';

type Role = 'user' | 'assistant';
interface Message { role: Role; content: string; events?: string[] }

const SUGERENCIAS = [
  'Creá un plan de fuerza de pierna para 4 días por semana, 4 semanas',
  'Listame los pacientes activos',
  'Creá un plan de hipertrofia upper body para 3 días',
  'Mostrá los ejercicios de cadena posterior disponibles',
];

export default function AiPlannerPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '¡Hola! Soy tu asistente de planificación. Puedo crear planes de entrenamiento completos, buscar pacientes, revisar ejercicios y aprender de los planes que generamos juntos.\n\n¿Qué hacemos hoy?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentEvent, setCurrentEvent] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const userMsg: Message = { role: 'user', content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setCurrentEvent('Pensando...');

    // Build API message history (exclude first assistant greeting)
    const apiMessages = newMessages
      .slice(1)
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch('/api/ai/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });

      const data = await res.json();

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.reply,
        events: data.events ?? [],
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Error al conectar con el asistente. Verificá que el API key de Anthropic esté configurado en Railway.',
      }]);
    } finally {
      setLoading(false);
      setCurrentEvent('');
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <a href="/admin/dashboard" className="text-slate-400 hover:text-slate-600 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </a>
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">Asistente IA</p>
          <p className="text-xs text-slate-400">Planificación inteligente de programas</p>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-3xl mx-auto w-full">

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-violet-600 text-white rounded-br-sm'
                : 'bg-white border border-slate-100 text-slate-700 shadow-sm rounded-bl-sm'
            }`}>
              {msg.role === 'assistant' && msg.events && msg.events.length > 0 && (
                <div className="mb-2 pb-2 border-b border-slate-100 space-y-1">
                  {msg.events.map((ev, j) => (
                    <p key={j} className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <span className="text-green-500">✓</span> {ev}
                    </p>
                  ))}
                </div>
              )}
              {msg.content}
              {msg.content.includes('/professional/programas/') && (
                <a
                  href={msg.content.match(/\/professional\/programas\/[\w-]+/)?.[0]}
                  className="mt-2 flex items-center gap-1.5 text-violet-600 font-bold text-xs hover:underline"
                >
                  → Ver programa creado
                </a>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-100 shadow-sm rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-slate-400 flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              {currentEvent}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggestions (only when fresh) */}
      {messages.length === 1 && (
        <div className="px-4 pb-3 max-w-3xl mx-auto w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SUGERENCIAS.map((s, i) => (
              <button key={i} onClick={() => send(s)}
                className="text-left px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 hover:border-violet-300 hover:bg-violet-50 transition-colors">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t border-slate-200 px-4 py-3 max-w-3xl mx-auto w-full">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Describí el plan que necesitás... (Enter para enviar)"
            rows={1}
            disabled={loading}
            className="flex-1 resize-none px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:border-violet-400 disabled:opacity-50 max-h-32 overflow-y-auto"
            style={{ minHeight: 42 }}
          />
          <button onClick={() => send()} disabled={loading || !input.trim()}
            className="h-[42px] w-[42px] rounded-xl bg-violet-600 text-white flex items-center justify-center hover:bg-violet-700 transition-colors disabled:opacity-40 shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5 text-center">Los planes creados se guardan automáticamente y mejoran futuras sugerencias</p>
      </div>
    </div>
  );
}