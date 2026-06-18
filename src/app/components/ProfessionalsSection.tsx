'use client';

import { useState } from 'react';
import Image from 'next/image';

interface Professional {
  id: string;
  name: string;
  specialty: string;
  email?: string | null;
  active: boolean;
}

export default function ProfessionalsSection({ professionals }: { professionals: any[] }) {
  const [selectedProf, setSelectedProf] = useState<Professional | null>(null);

  const getBio = (name: string) => {
    if (name.toLowerCase().includes('jaled')) {
      return {
        title: 'Kinesiólogo y Fisioterapeuta',
        subtitle: 'Especialista en Deporte',
        description: 'Especialista en rehabilitación deportiva y optimización física. Enfocado en la recuperación funcional de lesiones y el retorno seguro al rendimiento deportivo de atletas amateurs y profesionales.',
        photo: '/nicolas-jaled.png',
      };
    }
    return {
      title: 'Especialista en RPG',
      subtitle: 'Reeducación Postural Global',
      description: 'Especialista en la evaluación y corrección de alteraciones posturales y dolores crónicos a través de técnicas globales de estiramiento y alineación corporal.',
      photo: null,
    };
  };

  return (
    <>
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {professionals.map((prof) => (
          <div 
            key={prof.id} 
            onClick={() => setSelectedProf(prof)}
            className="bg-white rounded-2xl p-8 flex items-center gap-6 shadow-sm border border-slate-50 hover:shadow-lg hover:border-slate-100 transition-all cursor-pointer group"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-title text-xl font-bold shrink-0 group-hover:scale-105 transition-transform">
              {prof.name.split(' ').slice(-1)[0][0]}
            </div>
            <div>
              <h3 className="font-title text-lg text-slate-900 font-bold group-hover:text-primary transition-colors">{prof.name}</h3>
              <p className="text-accent text-sm font-subtitle font-semibold">{prof.specialty}</p>
              <p className="text-slate-500 text-xs mt-1">{prof.email || 'Contacto del centro'}</p>
              <span className="text-[10px] text-primary/60 font-semibold mt-2 inline-flex items-center gap-1 group-hover:text-primary transition-colors">
                Ver perfil y foto →
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {selectedProf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setSelectedProf(null)}
          />
          
          {/* Modal Container */}
          <div className="bg-white w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl relative z-10 border border-slate-100 animate-in fade-in zoom-in-95 duration-200 flex flex-col md:flex-row max-h-[90vh] md:max-h-none overflow-y-auto md:overflow-y-visible">
            {/* Left side: Photo or placeholder */}
            <div className="relative w-full md:w-1/2 h-48 sm:h-56 md:h-auto bg-slate-100 shrink-0">
              {getBio(selectedProf.name).photo ? (
                <Image 
                  src={getBio(selectedProf.name).photo!} 
                  alt={selectedProf.name}
                  fill
                  className="object-cover object-top"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 text-primary p-6">
                  <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center text-3xl font-bold">
                    {selectedProf.name.split(' ').slice(-1)[0][0]}
                  </div>
                  <h4 className="mt-4 font-title text-lg font-bold text-center">{selectedProf.name}</h4>
                  <p className="text-xs text-slate-500 text-center mt-1">{selectedProf.specialty}</p>
                </div>
              )}
            </div>

            {/* Right side: Bio Info */}
            <div className="p-6 sm:p-8 flex flex-col justify-between flex-grow">
              <button 
                onClick={() => setSelectedProf(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-2.5 transition-all w-9 h-9 flex items-center justify-center font-bold z-20"
                aria-label="Cerrar"
              >
                ✕
              </button>

              <div className="pr-2 sm:pr-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-accent bg-accent/10 px-2.5 py-1 rounded-full">
                  {getBio(selectedProf.name).subtitle || 'Profesional'}
                </span>
                <h3 className="font-title text-xl sm:text-2xl text-slate-900 font-bold mt-2 sm:mt-3">{selectedProf.name}</h3>
                <p className="text-primary text-xs sm:text-sm font-subtitle font-semibold mt-1">{selectedProf.specialty}</p>
                
                <h4 className="font-title text-xs sm:text-sm text-slate-700 font-semibold mt-4 sm:mt-6 uppercase tracking-wider">Sobre el profesional</h4>
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mt-2 font-sans">
                  {getBio(selectedProf.name).description}
                </p>
              </div>

              <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] text-slate-400 font-subtitle uppercase">Email de contacto</p>
                  <p className="text-xs font-semibold text-slate-700 mt-0.5">{selectedProf.email || 'contacto@centro.com'}</p>
                </div>
                <button 
                  onClick={() => setSelectedProf(null)}
                  className="bg-primary hover:bg-secondary text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
