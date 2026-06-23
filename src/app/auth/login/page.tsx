'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { loginUser } from '@/modules/auth/actions';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const res = await loginUser(formData);

    setLoading(false);
    if (res.success) {
      if (res.role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else if (res.role === 'PROFESSIONAL') {
        router.push('/professional/dashboard');
      } else {
        router.push('/client/dashboard');
      }
      router.refresh();
    } else {
      setError(res.error || 'Error al iniciar sesión');
    }
  }

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
          Iniciar Sesión
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500 font-sans">
          El registro es gestionado únicamente por administración.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-slate-100">
          
          <div className="mb-4 p-3.5 bg-blue-50 border border-blue-150 rounded-xl text-xs text-slate-700 leading-normal">
            💡 <strong>Credenciales de prueba disponibles:</strong><br />
            • Admin: <code className="bg-white/70 px-1 rounded">admin@njk.com</code> / <code className="bg-white/70 px-1 rounded">admin</code><br />
            • Paciente Activo: <code className="bg-white/70 px-1 rounded">paciente@gmail.com</code> / <code className="bg-white/70 px-1 rounded">paciente</code><br />
            • Paciente Pendiente: <code className="bg-white/70 px-1 rounded">pendiente@gmail.com</code> / <code className="bg-white/70 px-1 rounded">paciente</code>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-700 text-sm font-sans font-semibold border border-red-100">
              ⚠️ {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
                Email
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="admin@njk.com"
                  className="appearance-none block w-full px-3.5 py-2.5 border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                Contraseña
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="appearance-none block w-full px-3.5 py-2.5 border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold font-title text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading ? 'Validando...' : 'Iniciar Sesión'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center border-t border-slate-100 pt-4">
            <Link href="/" className="text-xs font-semibold text-slate-500 hover:text-primary transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
