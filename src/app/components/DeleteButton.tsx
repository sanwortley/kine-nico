'use client';

interface DeleteButtonProps {
  action: (formData: FormData) => Promise<void>;
  id: string;
  confirmMessage?: string;
  title?: string;
}

export default function DeleteButton({ action, id, confirmMessage, title }: DeleteButtonProps) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        const msg = confirmMessage || '¿Estás seguro de eliminar este elemento?';
        if (!confirm(msg)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        title={title || 'Eliminar'}
        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </form>
  );
}
