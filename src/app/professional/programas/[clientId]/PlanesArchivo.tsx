'use client';

import { useRef, useState, useTransition } from 'react';
import { subirPlanArchivo, eliminarPlanArchivo } from '@/modules/planArchivos/actions';

type Archivo = { id: string; nombre: string; tipo: string; tamano: number; createdAt: Date };

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ tipo }: { tipo: string }) {
  if (tipo === 'application/pdf') return (
    <svg className="w-5 h-5 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM9.5 16.5c-.3 0-.5-.1-.7-.3-.4-.4-.4-1 0-1.4l.7-.7H7a1 1 0 010-2h2.5l-.7-.7c-.4-.4-.4-1 0-1.4s1-.4 1.4 0l2.5 2.5c.4.4.4 1 0 1.4l-2.5 2.5c-.2.2-.4.1-.7.1z" />
      <text x="6" y="19" fontSize="5" fontWeight="bold" fill="white">PDF</text>
    </svg>
  );
  return (
    <svg className="w-5 h-5 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

export default function PlanesArchivo({ clientId, initialArchivos }: { clientId: string; initialArchivos: Archivo[] }) {
  const [archivos, setArchivos] = useState<Archivo[]>(initialArchivos);
  const [uploading, startUpload] = useTransition();
  const [deleting,  startDelete] = useTransition();
  const [error,  setError]  = useState('');
  const [ok,     setOk]     = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(''); setOk('');

    const fd = new FormData();
    fd.append('clientId', clientId);
    fd.append('archivo', file);

    startUpload(async () => {
      const res = await subirPlanArchivo(fd);
      if (res.error) { setError(res.error); return; }
      setOk('Plan subido correctamente');
      // Refresh list
      const resp = await fetch(`/api/plan-archivo/list?clientId=${clientId}`);
      if (resp.ok) setArchivos(await resp.json());
      if (fileRef.current) fileRef.current.value = '';
      setTimeout(() => setOk(''), 3000);
    });
  }

  function handleDelete(id: string) {
    startDelete(async () => {
      await eliminarPlanArchivo(id);
      setArchivos(prev => prev.filter(a => a.id !== id));
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-bold text-slate-800 text-sm">Planes importados</h2>
          <p className="text-xs text-slate-400 mt-0.5">Subí PDFs o documentos para que el cliente los vea</p>
        </div>

        {/* Upload button */}
        <label className={`flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${uploading ? 'opacity-50 pointer-events-none border-slate-200 text-slate-400' : 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/10'}`}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          {uploading ? 'Subiendo…' : 'Importar plan'}
          <input ref={fileRef} type="file" className="hidden" accept=".pdf,.docx,.doc,.png,.jpg,.jpeg" onChange={handleFile} />
        </label>
      </div>

      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
      {ok    && <p className="text-xs text-green-600 mb-3">{ok}</p>}

      {archivos.length === 0 ? (
        <div className="border-2 border-dashed border-slate-100 rounded-xl p-8 text-center">
          <svg className="w-8 h-8 text-slate-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <p className="text-sm text-slate-400">No hay planes importados todavía</p>
          <p className="text-xs text-slate-300 mt-1">PDF, Word o imagen · máx. 15 MB</p>
        </div>
      ) : (
        <div className="space-y-2">
          {archivos.map(a => (
            <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors group">
              <FileIcon tipo={a.tipo} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{a.nombre}</p>
                <p className="text-xs text-slate-400">{fmtSize(a.tamano)} · {new Date(a.createdAt).toLocaleDateString('es-AR')}</p>
              </div>
              <a href={`/api/plan-archivo/${a.id}`} target="_blank" rel="noopener noreferrer"
                className="shrink-0 h-7 px-2.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-500 hover:text-primary hover:border-primary/30 transition-colors flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Ver
              </a>
              <button onClick={() => handleDelete(a.id)} disabled={deleting}
                className="shrink-0 h-7 w-7 rounded-lg border border-slate-200 text-slate-300 hover:text-red-400 hover:border-red-200 transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}