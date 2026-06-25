'use client';

import { useState, useTransition } from 'react';
import type { DinamoInput } from '@/modules/dinamometria/actions';

interface Client { id: string; name: string; }

export interface DinamoRow {
  id: string;
  clientId: string;
  fecha: string;
  client: { name: string };
  notas?: string | null;
  peso?: number | null; altura?: number | null;
  cuadDer?: number | null; cuadIzq?: number | null;
  isquioDer?: number | null; isquioIzq?: number | null;
  abdDer?: number | null; abdIzq?: number | null;
  addDer?: number | null; addIzq?: number | null;
  eversorDer?: number | null; eversorIzq?: number | null;
  romCaderaDer?: number | null; romCaderaIzq?: number | null;
  romTobilloDer?: number | null; romTobilloIzq?: number | null;
  velocidadSquat?: number | null;
}

interface Props {
  clients: Client[];
  saveAction:   (data: DinamoInput) => Promise<{ success: boolean; error?: string }>;
  updateAction: (id: string, data: DinamoInput) => Promise<{ success: boolean; error?: string }>;
  initialData?: DinamoRow | null;
  onEditDone?: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function pct(a?: number, b?: number): number | null {
  if (!a || !b) return null;
  return Math.round(((Math.max(a, b) - Math.min(a, b)) / Math.max(a, b)) * 100 * 10) / 10;
}
function ratio(num?: number, den?: number): number | null {
  if (!num || !den) return null;
  return Math.round((num / den) * 100) / 100;
}
function imc(peso?: number, altura?: number): number | null {
  if (!peso || !altura) return null;
  return Math.round((peso / (altura * altura)) * 10) / 10;
}

function DiffBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-300 text-xs">—</span>;
  const color = value < 10 ? 'bg-green-100 text-green-700' : value < 15 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
  const icon = value < 10 ? '✓' : value < 15 ? '⚠' : '✕';
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>{icon} {value}%</span>;
}

function NumInput({ label, value, onChange, unit = 'N' }: { label: string; value: string; onChange: (v: string) => void; unit?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">{label}</span>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="—"
          className="w-full h-9 pl-2.5 pr-7 rounded-lg border border-slate-200 text-sm font-mono text-slate-700 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white placeholder-slate-300"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">{unit}</span>
      </div>
    </div>
  );
}

function MuscleRow({ label, derKey, izqKey, vals, setVals, unit = 'N', extra }: {
  label: string;
  derKey: keyof typeof initVals;
  izqKey: keyof typeof initVals;
  vals: Record<string, string>;
  setVals: (k: string, v: string) => void;
  unit?: string;
  extra?: React.ReactNode;
}) {
  const der = parseFloat(vals[derKey]) || undefined;
  const izq = parseFloat(vals[izqKey]) || undefined;
  const diff = pct(der, izq);
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <span className="text-sm font-semibold text-slate-700 min-w-[140px]">{label}</span>
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <div className="flex gap-2 flex-1 min-w-[180px]">
            <NumInput label="Derecha" value={vals[derKey]} onChange={v => setVals(derKey, v)} unit={unit} />
            <NumInput label="Izquierda" value={vals[izqKey]} onChange={v => setVals(izqKey, v)} unit={unit} />
          </div>
          <div className="flex flex-col gap-1 min-w-[80px]">
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">% Asimetría</span>
            <DiffBadge value={diff} />
          </div>
        </div>
      </div>
      {extra}
    </div>
  );
}

const initVals = {
  peso: '', altura: '',
  cuadDer: '', cuadIzq: '',
  isquioDer: '', isquioIzq: '',
  abdDer: '', abdIzq: '',
  addDer: '', addIzq: '',
  eversorDer: '', eversorIzq: '',
  romCaderaDer: '', romCaderaIzq: '',
  romTobilloDer: '', romTobilloIzq: '',
  velocidadSquat: '',
  notas: '',
};

function rowToVals(r: DinamoRow): typeof initVals {
  const s = (v: number | null | undefined) => (v != null ? String(v) : '');
  return {
    peso: s(r.peso), altura: s(r.altura),
    cuadDer: s(r.cuadDer), cuadIzq: s(r.cuadIzq),
    isquioDer: s(r.isquioDer), isquioIzq: s(r.isquioIzq),
    abdDer: s(r.abdDer), abdIzq: s(r.abdIzq),
    addDer: s(r.addDer), addIzq: s(r.addIzq),
    eversorDer: s(r.eversorDer), eversorIzq: s(r.eversorIzq),
    romCaderaDer: s(r.romCaderaDer), romCaderaIzq: s(r.romCaderaIzq),
    romTobilloDer: s(r.romTobilloDer), romTobilloIzq: s(r.romTobilloIzq),
    velocidadSquat: s(r.velocidadSquat),
    notas: r.notas ?? '',
  };
}

// ── Componente principal ────────────────────────────────────────────────────────

export default function DinamoForm({ clients, saveAction, updateAction, initialData, onEditDone }: Props) {
  const isEdit = !!initialData;
  const [open, setOpen] = useState(isEdit);
  const [clientId, setClientId] = useState(initialData?.clientId ?? '');
  const [fecha, setFecha] = useState(initialData?.fecha?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [vals, setValsState] = useState<typeof initVals>(() => initialData ? rowToVals(initialData) : { ...initVals });
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  function setVals(k: string, v: string) {
    setValsState(prev => ({ ...prev, [k]: v }));
    setSaved(false);
  }

  function n(k: keyof typeof initVals) {
    const v = parseFloat(vals[k]);
    return isNaN(v) ? undefined : v;
  }

  function buildPayload(): DinamoInput {
    return {
      clientId, fecha,
      notas: vals.notas || undefined,
      peso: n('peso'), altura: n('altura'),
      cuadDer: n('cuadDer'), cuadIzq: n('cuadIzq'),
      isquioDer: n('isquioDer'), isquioIzq: n('isquioIzq'),
      abdDer: n('abdDer'), abdIzq: n('abdIzq'),
      addDer: n('addDer'), addIzq: n('addIzq'),
      eversorDer: n('eversorDer'), eversorIzq: n('eversorIzq'),
      romCaderaDer: n('romCaderaDer'), romCaderaIzq: n('romCaderaIzq'),
      romTobilloDer: n('romTobilloDer'), romTobilloIzq: n('romTobilloIzq'),
      velocidadSquat: n('velocidadSquat'),
    };
  }

  function handleSave() {
    if (!clientId) { setError('Seleccioná un paciente'); return; }
    setError('');
    startTransition(async () => {
      const res = isEdit
        ? await updateAction(initialData!.id, buildPayload())
        : await saveAction(buildPayload());
      if (res.success) {
        setSaved(true);
        if (isEdit) {
          onEditDone?.();
        } else {
          setValsState({ ...initVals });
          setClientId('');
          setOpen(false);
        }
      } else {
        setError(res.error || 'Error al guardar');
      }
    });
  }

  const imcVal = imc(n('peso'), n('altura'));
  const ratioIQDer = ratio(n('isquioDer'), n('cuadDer'));
  const ratioIQIzq = ratio(n('isquioIzq'), n('cuadIzq'));
  const ratioAddAbdDer = ratio(n('addDer'), n('abdDer'));
  const ratioAddAbdIzq = ratio(n('addIzq'), n('abdIzq'));

  return (
    <div className="space-y-4">
      {isEdit ? (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
          <p className="text-sm font-semibold text-amber-800">Editando evaluación de <span className="font-bold">{initialData.client.name}</span></p>
          <button onClick={onEditDone} className="text-xs text-amber-600 hover:text-amber-800 font-bold">Cancelar</button>
        </div>
      ) : (
        <button
          onClick={() => { setOpen(o => !o); setSaved(false); setError(''); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 hover:border-primary hover:text-primary transition-all text-sm font-semibold w-full justify-center"
        >
          <span className={`text-lg leading-none transition-transform ${open ? 'rotate-45' : ''}`}>+</span>
          {open ? 'Cancelar' : 'Nueva evaluación'}
        </button>
      )}

      {saved && !open && !isEdit && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-sm text-green-700 font-semibold">✓ Evaluación guardada correctamente</div>
      )}

      {open && (
        <>
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-[10px] text-slate-400 font-medium uppercase tracking-wide block mb-1">Paciente</label>
              {isEdit ? (
                <div className="h-9 flex items-center px-3 rounded-lg border border-slate-100 bg-slate-50 text-sm font-medium text-slate-600">
                  {initialData.client.name}
                </div>
              ) : (
                <select value={clientId} onChange={e => { setClientId(e.target.value); setSaved(false); }}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none focus:border-primary bg-white">
                  <option value="">Seleccioná un paciente...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
            </div>
            <div className="min-w-[140px]">
              <label className="text-[10px] text-slate-400 font-medium uppercase tracking-wide block mb-1">Fecha</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none focus:border-primary bg-white" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Datos corporales</p>
            <div className="flex items-end gap-4 flex-wrap">
              <div className="w-28"><NumInput label="Peso" value={vals.peso} onChange={v => setVals('peso', v)} unit="kg" /></div>
              <div className="w-28"><NumInput label="Altura" value={vals.altura} onChange={v => setVals('altura', v)} unit="m" /></div>
              {imcVal && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">IMC</span>
                  <span className={`text-xl font-bold ${imcVal < 18.5 ? 'text-blue-600' : imcVal < 25 ? 'text-green-600' : imcVal < 30 ? 'text-amber-600' : 'text-red-600'}`}>{imcVal}</span>
                </div>
              )}
            </div>
          </div>

          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Fuerza muscular</p>
          <MuscleRow label="Cuádriceps" derKey="cuadDer" izqKey="cuadIzq" vals={vals} setVals={setVals} />
          <MuscleRow label="Isquiotibiales" derKey="isquioDer" izqKey="isquioIzq" vals={vals} setVals={setVals}
            extra={(ratioIQDer || ratioIQIzq) ? (
              <div className="flex gap-4 mt-2 pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-500">Ratio I/Q:</span>
                {ratioIQDer && <span className="text-xs font-mono text-slate-700">Der: <strong>{ratioIQDer}</strong></span>}
                {ratioIQIzq && <span className="text-xs font-mono text-slate-700">Izq: <strong>{ratioIQIzq}</strong></span>}
                <span className="text-xs text-slate-400">(óptimo 0.6–0.7)</span>
              </div>
            ) : null}
          />
          <MuscleRow label="Abductores" derKey="abdDer" izqKey="abdIzq" vals={vals} setVals={setVals} />
          <MuscleRow label="Adductores" derKey="addDer" izqKey="addIzq" vals={vals} setVals={setVals}
            extra={(ratioAddAbdDer || ratioAddAbdIzq) ? (
              <div className="flex gap-4 mt-2 pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-500">Ratio Add/Abd:</span>
                {ratioAddAbdDer && <span className="text-xs font-mono text-slate-700">Der: <strong>{ratioAddAbdDer}</strong></span>}
                {ratioAddAbdIzq && <span className="text-xs font-mono text-slate-700">Izq: <strong>{ratioAddAbdIzq}</strong></span>}
              </div>
            ) : null}
          />
          <MuscleRow label="Eversores de tobillo" derKey="eversorDer" izqKey="eversorIzq" vals={vals} setVals={setVals} />

          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1 pt-2">Rango de movimiento (ROM)</p>
          <MuscleRow label="ROM Cadera (flex.)" derKey="romCaderaDer" izqKey="romCaderaIzq" vals={vals} setVals={setVals} unit="cm" />
          <MuscleRow label="ROM Tobillo" derKey="romTobilloDer" izqKey="romTobilloIzq" vals={vals} setVals={setVals} unit="cm" />

          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex items-end gap-4 flex-wrap">
            <div className="w-36"><NumInput label="Velocidad squat 40kg" value={vals.velocidadSquat} onChange={v => setVals('velocidadSquat', v)} unit="m/s" /></div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <label className="text-[10px] text-slate-400 font-medium uppercase tracking-wide block mb-1">Observaciones / Notas</label>
            <textarea value={vals.notas} onChange={e => setVals('notas', e.target.value)} rows={3}
              placeholder="Lesiones previas, compensaciones observadas, contexto clínico..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none focus:border-primary resize-none placeholder-slate-300" />
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm text-red-700 font-semibold">{error}</div>}

          <button onClick={handleSave} disabled={isPending}
            className="w-full py-3 rounded-2xl bg-primary text-white font-bold text-sm shadow-md hover:bg-secondary transition-all disabled:opacity-50 cursor-pointer">
            {isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Guardar evaluación'}
          </button>
        </>
      )}
    </div>
  );
}