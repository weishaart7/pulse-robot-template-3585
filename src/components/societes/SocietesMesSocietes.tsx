import React, { useState, useEffect } from 'react';
import { AddButton } from '@/components/layout/workspace-panel';
import { societeService, type Societe } from '@/services/societeService';
import { passifService, type Emprunt } from '@/services/passifService';
import { assetService, type Asset } from '@/services/assetService';
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
import { SocieteParticipationsDialog } from './SocieteParticipationsDialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface SocietesMesSocietesProps {
  onEdit: (societeId: string) => void;
  onAdd: () => void;
}

export const SocietesMesSocietes = ({ onEdit, onAdd }: SocietesMesSocietesProps) => {
  const [societes, setSocietes] = useState<Societe[]>([]);
  const [loading, setLoading] = useState(true);
  const [societeToDelete, setSocieteToDelete] = useState<Societe | null>(null);
  const { participations, refetch: refetchParticipations } = useSocieteParticipations();
  // Éléments de Patrimoine rattachés à la société à supprimer, listés
  // nommément dans la confirmation (cf. docs/societes.md) :
  // - emprunts : supprimés avec elle (emprunts.societe_id ON DELETE CASCADE) ;
  // - actifs « parts » : conservés, détachés (ON DELETE SET NULL) et
  //   transfert_societe décoché par trigger.
  const [linkedEmprunts, setLinkedEmprunts] = useState<Emprunt[]>([]);
  const [linkedAssets, setLinkedAssets] = useState<Asset[]>([]);

  useEffect(() => {
    setLinkedEmprunts([]);
    setLinkedAssets([]);
    if (!societeToDelete) return;
    let cancelled = false;
    Promise.all([passifService.getEmprunts(), assetService.getAssets()])
      .then(([emprunts, assets]) => {
        if (cancelled) return;
        setLinkedEmprunts(emprunts.filter(e => e.societe_id === societeToDelete.id));
        setLinkedAssets(assets.filter(a => a.societe_id === societeToDelete.id));
      })
      .catch(error => {
        if (import.meta.env.DEV) console.error('Error loading linked items:', error);
      });
    return () => { cancelled = true; };
  }, [societeToDelete]);

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
      <div className="px-8 py-6"><LoadingSpinner text="Chargement des sociétés..." /></div>
    );
  }

  const impactCount = societeToDelete ? impactedParticipationsCount(societeToDelete.id) : 0;

  return (
    <div>
      {/* Barre d'outils filetée : rappel et actions (participations, ajout). */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-8 py-3">
        <p className="text-[12.5px] text-muted-foreground">
          Graphe de détention : cliquez sur une société pour ouvrir sa fiche.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <SocieteParticipationsDialog
            societes={societes}
            participations={participations}
            onChanged={refetchParticipations}
          />
          <AddButton onClick={onAdd}>Ajouter une société</AddButton>
        </div>
      </div>

      <div className="px-8 py-6">
      <SocieteParticipationsGraph
        societes={societes}
        participations={participations}
        onSelectSociete={onEdit}
        onDeleteSociete={societeId => {
          const societe = societes.find(s => s.id === societeId);
          if (societe) setSocieteToDelete(societe);
        }}
      />
      </div>

      <AlertDialog open={!!societeToDelete} onOpenChange={open => { if (!open) setSocieteToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer « {societeToDelete?.denomination} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              {impactCount > 0 && `Cette société est liée à ${impactCount} participation${impactCount > 1 ? 's' : ''} inter-sociétés (comme société mère et/ou fille). Ces liens seront supprimés avec la société. `}
              {linkedEmprunts.length > 0 && (
                <>
                  {linkedEmprunts.length > 1
                    ? `Les ${linkedEmprunts.length} emprunts rattachés à cette société seront définitivement supprimés, y compris de Patrimoine > Passifs : `
                    : `L'emprunt rattaché à cette société sera définitivement supprimé, y compris de Patrimoine > Passifs : `}
                  {linkedEmprunts.map(e => `« ${e.libelle || e.nature} »`).join(', ')}
                  {'. Pour les conserver, déliez-les d\'abord depuis Finances > Emprunts. '}
                </>
              )}
              {linkedAssets.length > 0 && (
                <>
                  {linkedAssets.length > 1 ? 'Les actifs ' : 'L\'actif '}
                  {linkedAssets.map(a => `« ${a.denomination || a.nature} »`).join(', ')}
                  {linkedAssets.length > 1
                    ? ' resteront dans Patrimoine, détachés de la société. Si les parts ont été cédées, supprimez-les aussi dans Patrimoine. '
                    : ' restera dans Patrimoine, détaché de la société. Si les parts ont été cédées, supprimez-le aussi dans Patrimoine. '}
                </>
              )}
              Cette action est irréversible.
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
