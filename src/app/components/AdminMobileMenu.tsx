'use client';

import React, { useRef } from 'react';
import { logoutUser } from '@/modules/auth/actions';

export default function AdminMobileMenu() {
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
          Panel Admin
        </div>
        <a 
          href="/admin/dashboard?tab=usuarios" 
          className="px-3 py-2.5 hover:bg-slate-50 active:bg-slate-100 rounded-xl font-bold text-slate-755 transition-colors flex items-center gap-2.5"
          onClick={closeMenu}
        >
          <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Usuarios
        </a>
        <a 
          href="/admin/dashboard?tab=servicios" 
          className="px-3 py-2.5 hover:bg-slate-50 active:bg-slate-100 rounded-xl font-bold text-slate-755 transition-colors flex items-center gap-2.5"
          onClick={closeMenu}
        >
          <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Servicios
        </a>
        <a
          href="/admin/dashboard?tab=planes"
          className="px-3 py-2.5 hover:bg-slate-50 active:bg-slate-100 rounded-xl font-bold text-slate-755 transition-colors flex items-center gap-2.5"
          onClick={closeMenu}
        >
          <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          Planes
        </a>
        <a
          href="/admin/dashboard?tab=profesionales"
          className="px-3 py-2.5 hover:bg-slate-50 active:bg-slate-100 rounded-xl font-bold text-slate-755 transition-colors flex items-center gap-2.5"
          onClick={closeMenu}
        >
          <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Profesionales
        </a>
        <a
          href="/admin/dashboard?tab=ejercicios"
          className="px-3 py-2.5 hover:bg-slate-50 active:bg-slate-100 rounded-xl font-bold text-slate-755 transition-colors flex items-center gap-2.5"
          onClick={closeMenu}
        >
          <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          Ejercicios
        </a>
        <a
          href="/admin/dashboard?tab=turnos"
          className="px-3 py-2.5 hover:bg-slate-50 active:bg-slate-100 rounded-xl font-bold text-slate-755 transition-colors flex items-center gap-2.5"
          onClick={closeMenu}
        >
          <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Turnos / Agenda
        </a>
        <a 
          href="/admin/dashboard?tab=configuracion" 
          className="px-3 py-2.5 hover:bg-slate-50 active:bg-slate-100 rounded-xl font-bold text-slate-755 transition-colors flex items-center gap-2.5"
          onClick={closeMenu}
        >
          <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          Configuración
        </a>
        
        <a
          href="/admin/ai-planner"
          className="px-3 py-2.5 hover:bg-violet-50 active:bg-violet-100 rounded-xl font-bold text-violet-700 transition-colors flex items-center gap-2.5"
          onClick={closeMenu}
        >
          <svg className="w-4 h-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Asistente IA
        </a>
        <a
          href="/professional/programas"
          className="px-3 py-2.5 hover:bg-slate-50 active:bg-slate-100 rounded-xl font-bold text-slate-755 transition-colors flex items-center gap-2.5"
          onClick={closeMenu}
        >
          <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          Programas
        </a>
        <a
          href="/professional/planillas"
          className="px-3 py-2.5 hover:bg-slate-50 active:bg-slate-100 rounded-xl font-bold text-slate-755 transition-colors flex items-center gap-2.5"
          onClick={closeMenu}
        >
          <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Planillas
        </a>
        <a
          href="/professional/evaluaciones"
          className="px-3 py-2.5 hover:bg-slate-50 active:bg-slate-100 rounded-xl font-bold text-slate-755 transition-colors flex items-center gap-2.5"
          onClick={closeMenu}
        >
          <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Dinamometrías
        </a>
        <a
          href="/professional/ficha"
          className="px-3 py-2.5 hover:bg-slate-50 active:bg-slate-100 rounded-xl font-bold text-slate-755 transition-colors flex items-center gap-2.5"
          onClick={closeMenu}
        >
          <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Fichas
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
