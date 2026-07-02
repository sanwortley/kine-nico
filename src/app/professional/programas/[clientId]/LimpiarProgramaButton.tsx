'use client';

import { useState, useTransition } from 'react';
import { limpiarPrograma } from '@/modules/programas/actions';
import { useRouter } from 'next/navigation';

export default function LimpiarProgramaButton({ clientId }: { clientId: string }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleLimpiar() {
    startTransition(async () => {
      await limpiarPrograma(clientId);
      router.refresh();
    });
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={handleLimpiar}
          disabled={pending}
          className="h-8 px-2.5 rounded-lg bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 transition-colors disabled:opacity-50"
        >
          {pending ? '...' : 'Limpiar'}
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
      title="Limpiar ejercicios del programa actual"
      className="shrink-0 flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-slate-200 text-slate-400 hover:text-orange-500 hover:border-orange-200 text-xs transition-colors"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
      Limpiar
    </button>
  );
}