'use client';

import { useState } from 'react';
import FichaForm from './FichaForm';
import FichaHistorial from './FichaHistorial';
import { saveFicha, updateFicha, getLastDinamometria } from '@/modules/ficha/actions';

interface FichaRow {
  id: string;
  clientId: string;
  fecha: string;
  client: { name: string };
  peso?: number | null;
  altura?: number | null;
  sexo?: string | null;
  grasaEst?: number | null;
  deporte?: string | null;
  catPeso?: string | null;
  historia?: any;
  romTests?: any;
  fuerzaTests?: any;
  capacidadTests?: any;
  dinamoExt?: any;
  fortalezas?: string | null;
  debilidades?: string | null;
  prioridades?: string | null;
  restricciones?: string | null;
  objetivos12sem?: string | null;
  fechaReevaluacion?: string | null;
  notas?: string | null;
}

interface Props {
  clients: { id: string; name: string }[];
  rows: FichaRow[];
}

export default function FichaPageClient({ clients, rows }: Props) {
  const [editRow, setEditRow] = useState<FichaRow | null>(null);

  function handleEdit(row: FichaRow) {
    setEditRow(row);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <>
      <FichaForm
        key={editRow?.id ?? 'new'}
        clients={clients}
        saveAction={saveFicha}
        updateAction={updateFicha}
        getLastDinamoAction={getLastDinamometria}
        initialData={editRow}
        onEditDone={() => setEditRow(null)}
      />
      <FichaHistorial rows={rows} onEdit={handleEdit} />
    </>
  );
}