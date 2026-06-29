'use client';

import { useRef, useState } from 'react';
import { subirPlanArchivo } from '@/modules/planArchivos/actions';

type Client = { id: string; name: string; email: string };

export default function ClientList({
  clients,
  basePath,
  showExport,
  showImport,
}: {
  clients: Client[];
  basePath: string;
  showExport?: boolean;
  showImport?: boolean;
}) {
  const href = (id: string) => `${basePath}/${id}`;
  const [q, setQ] = useState('');
  const [uploading, setUploading] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ id: string; ok: boolean } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeId = useRef<string>('');

  const filtered = q.trim()
    ? clients.filter(c => c.name.toLowerCase().includes(q.toLowerCase()) || c.email.toLowerCase().includes(q.toLowerCase()))
    : clients;

  function triggerUpload(clientId: string) {
    activeId.current = clientId;
    inputRef.current?.click();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !activeId.current) return;
    e.target.value = '';

    const id = activeId.current;
    setUploading(id);

    const fd = new FormData();
    fd.append('clientId', id);
    fd.append('archivo', file);

    const res = await subirPlanArchivo(fd);
    setUploading(null);
    setFlash({ id, ok: !res.error });
    setTimeout(() => setFlash(null), 2000);
  }

  return (
    <div className="space-y-3">
      {/* hidden file input shared across all rows */}
      <input ref={inputRef} type="file" accept=".pdf,.docx,image/*" className="hidden" onChange={handleFile} />

      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar paciente por nombre o email…"
          className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-primary shadow-sm"
        />
        {q && (
          <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400 text-sm">
          No hay resultados para <strong>"{q}"</strong>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => {
            const isUploading = uploading === c.id;
            const flashState = flash?.id === c.id ? flash : null;

            return (
              <div key={c.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-0 hover:border-primary/40 hover:shadow-md transition-all group">
                <a href={href(c.id)} className="flex-1 px-5 py-4 flex items-center justify-between gap-3 min-w-0">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 group-hover:text-primary transition-colors truncate">{c.name}</p>
                    <p className="text-xs text-slate-400 truncate">{c.email}</p>
                  </div>
                  <svg className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>

                {showImport && (
                  <button
                    onClick={() => triggerUpload(c.id)}
                    disabled={isUploading}
                    title="Subir plan"
                    className={`shrink-0 w-10 h-full flex items-center justify-center border-l border-slate-100 transition-colors py-4 ${
                      flashState
                        ? flashState.ok
                          ? 'text-green-500 bg-green-50'
                          : 'text-red-400 bg-red-50'
                        : 'text-slate-300 hover:text-primary hover:bg-primary/5'
                    } ${showExport ? '' : 'rounded-r-2xl'}`}
                  >
                    {isUploading ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    ) : flashState?.ok ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    )}
                  </button>
                )}

                {showExport && (
                  <a href={`${basePath}/${c.id}/print`} target="_blank" rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    title="Exportar PDF"
                    className="shrink-0 w-10 h-full flex items-center justify-center border-l border-slate-100 text-slate-300 hover:text-primary hover:bg-primary/5 rounded-r-2xl transition-colors py-4">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </a>
                )}
              </div>
            );
          })}
          {q && (
            <p className="text-[11px] text-slate-400 text-right pt-1">
              {filtered.length} de {clients.length} paciente{clients.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}
    </div>
  );
}