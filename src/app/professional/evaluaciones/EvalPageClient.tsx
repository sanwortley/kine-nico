'use client';

import { useState } from 'react';
import DinamoForm, { type DinamoRow } from './DinamoForm';
import DinamoHistorial from './DinamoHistorial';
import { saveDinamometria, updateDinamometria } from '@/modules/dinamometria/actions';

interface Props {
  clients: { id: string; name: string }[];
  rows: DinamoRow[];
}

export default function EvalPageClient({ clients, rows }: Props) {
  const [editRow, setEditRow] = useState<DinamoRow | null>(null);

  function handleEdit(row: DinamoRow) {
    setEditRow(row);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleEditDone() {
    setEditRow(null);
  }

  return (
    <>
      <DinamoForm
        key={editRow?.id ?? 'new'}
        clients={clients}
        prevRows={rows}
        saveAction={saveDinamometria}
        updateAction={updateDinamometria}
        initialData={editRow}
        onEditDone={handleEditDone}
      />
      <DinamoHistorial rows={rows} onEdit={handleEdit} />
    </>
  );
}