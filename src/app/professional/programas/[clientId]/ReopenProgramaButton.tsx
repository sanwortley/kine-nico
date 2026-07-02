'use client';

import { useState, useTransition } from 'react';
import { reabrirPrograma } from '@/modules/programas/actions';
import { useRouter } from 'next/navigation';

export default function ReopenProgramaButton({ programaId, clientId }: { programaId: string; clientId: string }) {
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleReopen() {
    setError('');
    startTransition(async () => {
      const res = await reabrirPrograma(programaId, clientId);
      if (res.success) {
        router.refresh();
      } else {
        setError(res.error ?? 'Error al reabrir');
        setConfirm(false);
      }
    });
  }

  if (error) {
    return (
      <span className="text-[10px] text-red-500 shrink-0 max-w-[120px] leading-tight">{error}</span>
    );
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={handleReopen}
          disabled={pending}
          className="h-8 px-2.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {pending ? '...' : 'Reabrir'}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="h-8 px-2 rounded-lg border border-slate-200 text-slate-500 text-xs hover:bg-slate-50 transition-colors"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      title="Reabrir este bloque como activo"
      className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-primary hover:border-primary/30 transition-colors"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    </button>
  );
}