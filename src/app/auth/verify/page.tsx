'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { verifyEmail } from '@/modules/auth/actions';

export default function VerifyPage({ searchParams }: { searchParams: Promise<{ id?: string; email?: string }> }) {
  const params = use(searchParams);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const id = params.id;
    const email = params.email;

    if (!id && !email) {
      setStatus('error');
      setErrorMessage('Faltan parámetros de verificación.');
      return;
    }

    async function doVerification() {
      const res = await verifyEmail(id || '', email || '');
      if (res.success) {
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMessage(res.error || 'No se pudo verificar el correo.');
      }
    }

    doVerification();
  }, [params]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-block">
          <Image 
            src="/logo.png" 
            alt="NJK Logo" 
            width={64} 
            height={64} 
            className="mx-auto object-contain" 
          />
        </Link>
        <h2 className="mt-6 text-center text-3xl font-bold font-title text-primary">
          Verificación de Cuenta
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-slate-100 text-center">
          {status === 'loading' && (
            <div className="py-6">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-sm text-slate-500">Verificando tu dirección de correo electrónico...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="py-4">
              <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto text-2xl mb-4">
                ✓
              </div>
              <h3 className="font-title text-xl text-slate-900 font-bold mb-2">¡Email verificado!</h3>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                Tu dirección de correo ha sido confirmada con éxito.<br />
                Tu cuenta ahora está en <strong>espera de aprobación manual por parte del administrador</strong>. Te enviaremos un email cuando tu cuenta sea activada.
              </p>
              <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500 mb-6 leading-normal text-left">
                ℹ️ <strong>Siguiente paso para el demo:</strong><br />
                Iniciá sesión como el Administrador (<code className="bg-white px-1 border rounded">admin@njk.com</code> / <code className="bg-white px-1 border rounded">admin</code>) e ingresá al panel de control para aprobar la cuenta de este usuario.
              </div>
              <Link href="/auth/login" className="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-secondary transition-all">
                Ir al Iniciar Sesión
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="py-4">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto text-2xl mb-4">
                ⚠️
              </div>
              <h3 className="font-title text-xl text-slate-900 font-bold mb-2">Error de Verificación</h3>
              <p className="text-sm text-red-600 mb-6">{errorMessage}</p>
              <Link href="/" className="bg-slate-200 text-slate-700 px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-350 transition-all">
                Volver al Inicio
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
