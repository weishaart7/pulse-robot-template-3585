import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { societeService, type Societe } from '@/services/societeService';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useSocieteParticipations } from '@/hooks/useSocieteParticipations';
import { SocieteParticipationsGraph } from './SocieteParticipationsGraph';

interface SocietesMesSocietesProps {
  onEdit: (societeId: string) => void;
  onAdd: () => void;
}

export const SocietesMesSocietes = ({ onEdit, onAdd }: SocietesMesSocietesProps) => {
  const [societes, setSocietes] = useState<Societe[]>([]);
  const [loading, setLoading] = useState(true);
  const [societeToDelete, setSocieteToDelete] = useState<Societe | null>(null);
  const { participations, refetch: refetchParticipations } = useSocieteParticipations();

  useEffect(() => {
    loadSocietes();
  }, []);

  const loadSocietes = async () => {
    try {
      setLoading(true);
      const data = await societeService.getAll();
      setSocietes(data);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error loading societes:', error);
      toast.error('Erreur lors du chargement des sociétés');
    } finally {
      setLoading(false);
    }
  };

  const impactedParticipationsCount = (societeId: string) =>
    participations.filter(p => p.societe_mere_id === societeId || p.societe_fille_id === societeId).length;

  const confirmDeleteSociete = async () => {
    if (!societeToDelete) return;
    try {
      await societeService.delete(societeToDelete.id);
      setSocietes(prev => prev.filter(s => s.id !== societeToDelete.id));
      toast.success('Société supprimée avec succès');
      refetchParticipations();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error deleting societe:', error);
      toast.error('Erreur lors de la suppression de la société');
    } finally {
      setSocieteToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Chargement des sociétés...</p>
      </div>
    );
  }

  const impactCount = societeToDelete ? impactedParticipationsCount(societeToDelete.id) : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Mes sociétés</h3>
        <Button onClick={onAdd} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Ajouter une société
        </Button>
      </div>

      <SocieteParticipationsGraph
        societes={societes}
        participations={participations}
        onSelectSociete={onEdit}
        onDeleteSociete={societeId => {
          const societe = societes.find(s => s.id === societeId);
          if (societe) setSocieteToDelete(societe);
        }}
      />

      <AlertDialog open={!!societeToDelete} onOpenChange={open => { if (!open) setSocieteToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer « {societeToDelete?.denomination} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              {impactCount > 0
                ? `Cette société est liée à ${impactCount} participation${impactCount > 1 ? 's' : ''} inter-sociétés (comme société mère et/ou fille). Ces liens seront supprimés avec la société. Cette action est irréversible.`
                : 'Cette action est irréversible.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSociete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
