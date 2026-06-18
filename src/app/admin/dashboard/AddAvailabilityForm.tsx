'use client';

import { useState } from 'react';

interface AddAvailabilityFormProps {
  services: any[];
  professionals: any[];
  addAvailabilityAction: (formData: FormData) => Promise<void>;
}

export default function AddAvailabilityForm({
  services,
  professionals,
  addAvailabilityAction,
}: AddAvailabilityFormProps) {
  const [creationType, setCreationType] = useState<'individual' | 'range'>('individual');

  return (
    <form action={addAvailabilityAction} className="space-y-4">
      <h3 className="font-title text-md text-primary font-bold mb-2">Agregar Disponibilidad</h3>

      <div>
        <label htmlFor="t-service" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
          Servicio
        </label>
        <select
          id="t-service"
          name="serviceId"
          required
          className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none"
        >
          <option value="">Seleccione un servicio</option>
          {services.map((s: any) => (
            <option key={s.id} value={s.id}>{s.name} ({s.duration} min)</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="t-prof" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
          Profesional asignado
        </label>
        <select
          id="t-prof"
          name="professionalId"
          required
          className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none"
        >
          <option value="">Seleccione un profesional</option>
          {professionals.map((p: any) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
          Tipo de Carga
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className={`flex items-center gap-2 p-2.5 bg-white border rounded-lg cursor-pointer text-xs font-bold transition-all ${
            creationType === 'individual' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 hover:bg-slate-50/50'
          }`}>
            <input
              type="radio"
              name="creationType"
              value="individual"
              checked={creationType === 'individual'}
              onChange={() => setCreationType('individual')}
              className="text-primary focus:ring-primary"
            />
            <span>Individual</span>
          </label>
          <label className={`flex items-center gap-2 p-2.5 bg-white border rounded-lg cursor-pointer text-xs font-bold transition-all ${
            creationType === 'range' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 hover:bg-slate-50/50'
          }`}>
            <input
              type="radio"
              name="creationType"
              value="range"
              checked={creationType === 'range'}
              onChange={() => setCreationType('range')}
              className="text-primary focus:ring-primary"
            />
            <span>Por Rango</span>
          </label>
        </div>
      </div>

      {creationType === 'individual' && (
        <div>
          <label htmlFor="t-date" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
            Fecha y Hora
          </label>
          <input
            id="t-date"
            name="fechaInicio"
            type="datetime-local"
            required
            className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm"
          />
        </div>
      )}

      {creationType === 'range' && (
        <div className="space-y-4">
          <div>
            <label htmlFor="t-range-date" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Fecha del Bloque
            </label>
            <input
              id="t-range-date"
              name="rangeDate"
              type="date"
              required
              className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="t-range-start" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Hora Inicio
              </label>
              <input
                id="t-range-start"
                name="rangeStart"
                type="time"
                required
                placeholder="10:00"
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label htmlFor="t-range-end" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Hora Fin
              </label>
              <input
                id="t-range-end"
                name="rangeEnd"
                type="time"
                required
                placeholder="20:00"
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>
      )}

      <button
        type="submit"
        className="w-full bg-accent text-white p-2.5 rounded-lg text-sm font-bold shadow hover:bg-accent-light transition-all cursor-pointer"
      >
        Generar Disponibilidad
      </button>
    </form>
  );
}
