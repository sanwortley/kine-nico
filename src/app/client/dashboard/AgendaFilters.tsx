'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface AgendaFiltersProps {
  services: any[];
  professionals: any[];
  initialServiceId: string;
  initialProfessionalId: string;
}

export default function AgendaFilters({
  services,
  professionals,
  initialServiceId,
  initialProfessionalId,
}: AgendaFiltersProps) {
  const router = useRouter();
  const [serviceId, setServiceId] = useState(initialServiceId);
  const [professionalId, setProfessionalId] = useState(initialProfessionalId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set('tab', 'reservar');
    if (serviceId) params.set('serviceId', serviceId);
    if (professionalId) params.set('professionalId', professionalId);
    
    router.push(`/client/dashboard?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 pb-6 border-b border-slate-100">
      <div>
        <label htmlFor="serviceId" className="block text-xs font-semibold text-slate-550 uppercase tracking-wider mb-1">
          Servicio
        </label>
        <select 
          id="serviceId" 
          name="serviceId"
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          className="block w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="">Todos los servicios</option>
          {services.map((s: any) => (
            <option key={s.id} value={s.id}>{s.name} ({s.duration} min)</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="professionalId" className="block text-xs font-semibold text-slate-550 uppercase tracking-wider mb-1">
          Profesional
        </label>
        <select 
          id="professionalId" 
          name="professionalId"
          value={professionalId}
          onChange={(e) => setProfessionalId(e.target.value)}
          className="block w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="">Todos los profesionales</option>
          {professionals.map((p: any) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      <div className="flex items-end">
        <button type="submit" className="w-full bg-primary text-white p-2.5 rounded-lg text-sm font-bold shadow hover:bg-secondary transition-all cursor-pointer">
          Filtrar Agenda
        </button>
      </div>
    </form>
  );
}
