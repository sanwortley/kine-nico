'use client';

import React, { useRef } from 'react';
import { logoutUser } from '@/modules/auth/actions';

export default function MobileMenu() {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  const closeMenu = () => {
    if (detailsRef.current) {
      detailsRef.current.removeAttribute('open');
    }
  };

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    closeMenu();
    await logoutUser();
    window.location.href = '/';
  };

  return (
    <details ref={detailsRef} className="relative md:hidden group">
      <summary className="list-none cursor-pointer p-2.5 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 rounded-xl text-slate-700 transition-all flex items-center justify-center h-10 w-10 focus:outline-none">
        <svg className="w-5 h-5 text-slate-600 group-open:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <svg className="w-5 h-5 text-slate-600 hidden group-open:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </summary>
      <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-150 rounded-2xl shadow-xl p-2 z-55 flex flex-col gap-0.5 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
        <div className="px-3 py-2 text-[10px] font-bold text-slate-450 uppercase tracking-wider border-b border-slate-100 mb-1">
          Navegación
        </div>
        <a 
          href="/client/dashboard?tab=turnos" 
          className="px-3 py-2.5 hover:bg-slate-50 active:bg-slate-100 rounded-xl font-bold text-slate-755 transition-colors flex items-center gap-2.5"
          onClick={closeMenu}
        >
          <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          Mis Turnos
        </a>
        <a 
          href="/client/dashboard?tab=reservar" 
          className="px-3 py-2.5 hover:bg-slate-50 active:bg-slate-100 rounded-xl font-bold text-slate-755 transition-colors flex items-center gap-2.5"
          onClick={closeMenu}
        >
          <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Reservar Turno
        </a>
        <a 
          href="/client/dashboard?tab=planes" 
          className="px-3 py-2.5 hover:bg-slate-50 active:bg-slate-100 rounded-xl font-bold text-slate-755 transition-colors flex items-center gap-2.5"
          onClick={closeMenu}
        >
          <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          Suscripciones
        </a>
        <a 
          href="/client/dashboard?tab=cuenta" 
          className="px-3 py-2.5 hover:bg-slate-50 active:bg-slate-100 rounded-xl font-bold text-slate-755 transition-colors flex items-center gap-2.5"
          onClick={closeMenu}
        >
          <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Cambiar Contraseña
        </a>
        
        <div className="border-t border-slate-100 my-1"></div>
        
        <a 
          href="#" 
          className="px-3 py-2.5 hover:bg-red-50 active:bg-red-100 rounded-xl font-bold text-red-650 transition-colors flex items-center gap-2.5"
          onClick={handleLogout}
        >
          <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Cerrar Sesión
        </a>
      </div>
    </details>
  );
}

