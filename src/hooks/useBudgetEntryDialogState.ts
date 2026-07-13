import { useState } from 'react';

// Machine à états partagée par BudgetRevenus.tsx et BudgetCharges.tsx : gère
// l'ouverture du formulaire de création/édition et la bascule create/update.
// Le rendu (libellés, formulaire spécifique) reste dans chaque composant.
interface UseBudgetEntryDialogStateOptions<TEntity extends { id: string }, TPayload> {
  createEntry: (data: TPayload) => Promise<unknown>;
  updateEntry: (id: string, data: TPayload) => Promise<unknown>;
}

export function useBudgetEntryDialogState<TEntity extends { id: string }, TPayload>({
  createEntry,
  updateEntry,
}: UseBudgetEntryDialogStateOptions<TEntity, TPayload>) {
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TEntity | undefined>();

  const handleSubmit = async (data: TPayload) => {
    if (editingEntry) {
      await updateEntry(editingEntry.id, data);
      setEditingEntry(undefined);
    } else {
      await createEntry(data);
    }
    setShowForm(false);
  };

  const handleEdit = (entry: TEntity) => {
    setEditingEntry(entry);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingEntry(undefined);
  };

  const handleAdd = () => setShowForm(true);

  return { showForm, editingEntry, handleSubmit, handleEdit, handleCancel, handleAdd };
}
