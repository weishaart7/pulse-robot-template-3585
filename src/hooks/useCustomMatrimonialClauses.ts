import { useState, useEffect, useCallback } from 'react';
import { useMaritalStatus } from '@/hooks/useFamilyData';
import { useToast } from '@/hooks/use-toast';
import { ClausePersonnalisee } from '@/types/customClause';

export function useCustomMatrimonialClauses() {
  const { toast } = useToast();
  const { data: maritalData, saveData, loading: isLoading } = useMaritalStatus();
  const [clauses, setClauses] = useState<ClausePersonnalisee[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (maritalData) {
      const raw = (maritalData as any).clauses_personnalisees;
      if (!raw) {
        setClauses([]);
        return;
      }
      try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        setClauses(Array.isArray(parsed) ? parsed : []);
      } catch (error) {
        console.error('Erreur de parsing des clauses personnalisées:', error);
        setClauses([]);
      }
    }
  }, [maritalData]);

  const persist = useCallback(async (next: ClausePersonnalisee[]) => {
    setIsSaving(true);
    try {
      await saveData({ clauses_personnalisees: next } as any);
      setClauses(next);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des clauses personnalisées:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer la clause personnalisée.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  }, [saveData, toast]);

  const addClause = useCallback((clause: Omit<ClausePersonnalisee, 'id'>) => {
    const newClause: ClausePersonnalisee = { ...clause, id: crypto.randomUUID() };
    return persist([...clauses, newClause]);
  }, [clauses, persist]);

  const removeClause = useCallback((id: string) => {
    return persist(clauses.filter(c => c.id !== id));
  }, [clauses, persist]);

  return { clauses, isLoading, isSaving, addClause, removeClause };
}
