'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

const REDIRECT_SECONDS = 6;

export default function PaymentSuccessClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [seconds, setSeconds] = useState(REDIRECT_SECONDS);

  const planName = searchParams.get('plan') || 'tu plan';
  const destination = '/client/dashboard?tab=planes';

  useEffect(() => {
    if (seconds <= 0) {
      router.replace(destination);
      return;
    }
    const timer = setTimeout(() => setSeconds(s => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds, router]);

  const progress = ((REDIRECT_SECONDS - seconds) / REDIRECT_SECONDS) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-accent/5 flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-12 w-full max-w-md text-center space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <Image src="/logo.png" alt="NJK" width={56} height={56} className="object-contain" />
        </div>

        {/* Checkmark animado */}
        <div className="relative flex items-center justify-center">
          <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center animate-bounce-once">
            <svg className="w-12 h-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
                style={{ strokeDasharray: 30, strokeDashoffset: 0 }}
              />
            </svg>
          </div>
        </div>

        {/* Texto */}
        <div className="space-y-2">
          <h1 className="font-title text-2xl font-bold text-slate-900">¡Pago confirmado!</h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            Tu pago por <strong className="text-primary">{planName}</strong> fue procesado correctamente.
            Tu plan estará activo en instantes.
          </p>
        </div>

        {/* Barra de progreso con timer */}
        <div className="space-y-2">
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-400">
            Redirigiendo a tu panel en <span className="font-bold text-slate-600">{seconds}</span> segundo{seconds !== 1 ? 's' : ''}...
          </p>
        </div>

        {/* Botón manual */}
        <button
          onClick={() => router.replace(destination)}
          className="w-full py-3 rounded-xl bg-accent hover:bg-accent-light text-white font-bold text-sm shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
        >
          Ir a mi panel ahora
        </button>
      </div>
    </div>
  );
}