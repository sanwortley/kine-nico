'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

const WA_NUMBER = '5493884459941';

interface Plan {
  id: string;
  nombre: string;
  price: number;
  descripcion: string;
  limiteTurnos: number;
}

interface Props {
  plan: Plan;
  clientId: string;
  checkoutCashAction: (planId: string, userId: string) => Promise<{ success: boolean; initPoint?: string; error?: string }>;
  checkoutMPAction: (planId: string, userId: string) => Promise<{ success: boolean; initPoint?: string; error?: string }>;
}

export default function PaymentModal({ plan, clientId, checkoutCashAction, checkoutMPAction }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<'CASH' | 'MP' | null>(null);

  function handleOpen() {
    setOpen(true);
    setError('');
    setSelectedMethod(null);
  }

  function handleClose() {
    if (isPending) return;
    setOpen(false);
    setError('');
    setSelectedMethod(null);
  }

  function handleConfirm() {
    if (!selectedMethod || isPending) return;
    setError('');

    if (selectedMethod === 'CASH') {
      const msg = [
        `Hola Nicolás! Quiero contratar el plan *${plan.nombre}*.`,
        ``,
        `💰 *Monto:* ${price}`,
        `📋 *Plan:* ${plan.descripcion}`,
        ``,
        `Me gustaría coordinar el primer turno y abonar en efectivo ese día. ¿Podés confirmarme disponibilidad?`,
      ].join('\n');

      startTransition(async () => {
        // Crear suscripción PENDING_PAYMENT en paralelo con la apertura de WA
        const [res] = await Promise.all([
          checkoutCashAction(plan.id, clientId),
          Promise.resolve(window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank')),
        ]);
        if (res.success && res.initPoint) {
          router.push(res.initPoint);
        } else {
          setError(res.error || 'No se pudo registrar la solicitud. Intentá de nuevo.');
        }
      });
      return;
    }

    startTransition(async () => {
      const res = await checkoutMPAction(plan.id, clientId);
      if (res.success && res.initPoint) {
        router.push(res.initPoint);
      } else {
        setError(res.error || 'Ocurrió un error. Intentá de nuevo.');
      }
    });
  }

  const price = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(plan.price);

  return (
    <>
      <button
        onClick={handleOpen}
        className="bg-accent text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-accent-light shadow transition-all cursor-pointer"
      >
        Contratar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />

          {/* Modal */}
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="bg-primary px-6 py-5 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold opacity-70 uppercase tracking-wider mb-1">Confirmá tu plan</p>
                  <h2 className="font-title text-xl font-bold leading-tight">{plan.nombre}</h2>
                  <p className="text-2xl font-bold mt-1">{price}</p>
                </div>
                <button
                  onClick={handleClose}
                  disabled={isPending}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors cursor-pointer shrink-0 mt-0.5"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <p className="text-sm font-semibold text-slate-700">¿Cómo querés abonar?</p>

              {/* Opción Efectivo */}
              <button
                onClick={() => setSelectedMethod('CASH')}
                className={`w-full text-left rounded-2xl border-2 p-4 transition-all cursor-pointer ${
                  selectedMethod === 'CASH'
                    ? 'border-primary bg-primary/5'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    selectedMethod === 'CASH' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-slate-800 text-sm">Efectivo</p>
                      {selectedMethod === 'CASH' && (
                        <svg className="w-4 h-4 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      El pago se efectúa en efectivo el <strong>primer día</strong> que te reunís con el profesional. Tu solicitud quedará pendiente hasta la confirmación.
                    </p>
                  </div>
                </div>
              </button>

              {/* Opción Mercado Pago */}
              <button
                onClick={() => setSelectedMethod('MP')}
                className={`w-full text-left rounded-2xl border-2 p-4 transition-all cursor-pointer ${
                  selectedMethod === 'MP'
                    ? 'border-[#009EE3] bg-[#009EE3]/5'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    selectedMethod === 'MP' ? 'bg-[#009EE3] text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-slate-800 text-sm">Mercado Pago</p>
                      {selectedMethod === 'MP' && (
                        <svg className="w-4 h-4 text-[#009EE3] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Pagá online ahora con tarjeta de crédito, débito, transferencia o saldo de MP. El plan se activa automáticamente al acreditarse el pago.
                    </p>
                  </div>
                </div>
              </button>

              {/* Resumen efectivo cuando está seleccionado */}
              {selectedMethod === 'CASH' && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-800 leading-relaxed">
                  <p className="font-bold mb-1">📋 Resumen de tu solicitud</p>
                  <ul className="space-y-1 text-amber-700">
                    <li>• <strong>Plan:</strong> {plan.nombre}</li>
                    <li>• <strong>Monto a abonar:</strong> {price} en efectivo</li>
                    <li>• <strong>Cuándo:</strong> El día 1 que te reunís con el profesional</li>
                    <li>• <strong>Estado:</strong> Pendiente hasta confirmar el pago</li>
                  </ul>
                </div>
              )}

              {selectedMethod === 'MP' && (
                <div className="rounded-xl bg-blue-50 border border-blue-200 p-3.5 text-xs text-blue-800 leading-relaxed">
                  <p className="font-bold mb-1">💳 Pago online</p>
                  <p className="text-blue-700">Serás redirigido a Mercado Pago para abonar <strong>{price}</strong>. El plan se activa automáticamente al acreditarse el pago.</p>
                </div>
              )}

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 font-semibold flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Botones */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleClose}
                  disabled={isPending}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!selectedMethod || isPending}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    selectedMethod === 'MP'
                      ? 'bg-[#009EE3] hover:bg-[#0081C0]'
                      : 'bg-primary hover:bg-secondary'
                  }`}
                >
                  {isPending
                    ? 'Procesando...'
                    : selectedMethod === 'MP'
                    ? 'Ir a pagar →'
                    : selectedMethod === 'CASH'
                    ? 'Confirmar solicitud'
                    : 'Seleccioná un método'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}