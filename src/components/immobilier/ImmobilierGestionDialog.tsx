import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Chip, panelButtonClass, panelPrimaryButtonClass } from '@/components/layout/workspace-panel';
import { WizardConfirmDialog } from '@/components/assets/wizard/WizardConfirmDialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { Asset, AssetRevenu, AssetCharge, assetService } from '@/services/assetService';
import { RevenuForm } from './RevenuForm';
import { ChargeForm } from './ChargeForm';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface ImmobilierGestionDialogProps {
  asset: Asset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ImmobilierGestionDialog = ({ asset, open, onOpenChange }: ImmobilierGestionDialogProps) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('revenus');
  const [revenuFormOpen, setRevenuFormOpen] = useState(false);
  const [chargeFormOpen, setChargeFormOpen] = useState(false);
  const [revenus, setRevenus] = useState<AssetRevenu[]>([]);
  const [charges, setCharges] = useState<AssetCharge[]>([]);
  const [isLoadingRevenus, setIsLoadingRevenus] = useState(false);
  const [isLoadingCharges, setIsLoadingCharges] = useState(false);
  const [impactBudget, setImpactBudget] = useState(true);
  const [isUpdatingBudget, setIsUpdatingBudget] = useState(false);
  // Ligne dont la suppression attend confirmation.
  const [pendingDelete, setPendingDelete] = useState<{ id: string; nom: string; type: 'revenu' | 'charge' } | null>(null);

  const fetchRevenus = useCallback(async () => {
    if (!asset?.id) return;
    
    setIsLoadingRevenus(true);
    try {
      const data = await assetService.getAssetRevenus(asset.id);
      setRevenus(data);
      // Check if any revenue has impact_budget = true
      const hasImpact = data.some((r) => (r as AssetRevenu & { impact_budget?: boolean }).impact_budget === true);
      setImpactBudget(hasImpact);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les revenus.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingRevenus(false);
    }
  }, [asset?.id, toast]);

  const fetchCharges = useCallback(async () => {
    if (!asset?.id) return;
    
    setIsLoadingCharges(true);
    try {
      const data = await assetService.getAssetCharges(asset.id);
      setCharges(data);
      // Check if any charge has impact_budget = true
      const hasImpact = data.some((c) => (c as AssetCharge & { impact_budget?: boolean }).impact_budget === true);
      if (hasImpact) setImpactBudget(true);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les charges.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCharges(false);
    }
  }, [asset?.id, toast]);

  useEffect(() => {
    if (asset && open) {
      fetchRevenus();
      fetchCharges();
    }
  }, [asset, open, fetchRevenus, fetchCharges]);

  const handleToggleImpactBudget = async (checked: boolean) => {
    if (!asset?.id) return;
    
    setIsUpdatingBudget(true);
    try {
      // Update all revenus for this asset
      const { error: revenusError } = await supabase
        .from('asset_revenus')
        .update({ impact_budget: checked })
        .eq('asset_id', asset.id);

      if (revenusError) throw revenusError;

      // Update all charges for this asset
      const { error: chargesError } = await supabase
        .from('asset_charges')
        .update({ impact_budget: checked })
        .eq('asset_id', asset.id);

      if (chargesError) throw chargesError;

      setImpactBudget(checked);
      
      toast({
        title: checked ? "Transfert activé" : "Transfert désactivé",
        description: checked 
          ? "Les revenus et charges seront visibles dans la section Budget."
          : "Les revenus et charges ne seront plus visibles dans le Budget.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le transfert budget.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingBudget(false);
    }
  };

  const handleDeleteRevenu = async (id: string) => {
    try {
      await assetService.deleteAssetRevenu(id);
      toast({
        title: "Revenu supprimé",
        description: "Le revenu a été supprimé avec succès.",
      });
      fetchRevenus();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le revenu.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCharge = async (id: string) => {
    try {
      await assetService.deleteAssetCharge(id);
      toast({
        title: "Charge supprimée",
        description: "La charge a été supprimée avec succès.",
      });
      fetchCharges();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la charge.",
        variant: "destructive",
      });
    }
  };

  const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('fr-FR') : null);
  const isRevenus = activeTab === 'revenus';

  // Lignes de l'onglet actif, dans un format commun.
  const lignes = isRevenus
    ? revenus.map(r => ({ id: r.id, nom: r.nature, montant: `${r.montant.toLocaleString('fr-FR')} €`, periodicite: r.periodicite, debut: fmtDate(r.date_debut) }))
    : charges.map(c => ({ id: c.id, nom: c.denomination || c.type_charge, montant: `${c.montant.toLocaleString('fr-FR')} ${c.unite}`, periodicite: c.periodicite, debut: fmtDate(c.date_debut) }));
  const isLoadingTab = isRevenus ? isLoadingRevenus : isLoadingCharges;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          overlayClassName="bg-black/30 backdrop-blur-[6px]"
          className="workspace-panel no-scrollbar max-w-2xl max-h-[90vh] overflow-y-auto rounded-[4px] sm:rounded-[4px]"
        >
          <DialogHeader className="-mx-6 border-b border-border px-6 pb-4">
            <DialogTitle className="text-[16px] font-medium leading-tight tracking-[-0.01em]">
              Revenus et charges · {asset?.denomination || 'ce bien'}
            </DialogTitle>
            <DialogDescription className="text-[12.5px]">
              Lignes de ce bien, reprises dans les indicateurs Immobilier et, si le transfert est activé, dans le Budget.
            </DialogDescription>
          </DialogHeader>

          {/* Transfert dans le Budget : s'applique à toutes les lignes du bien. */}
          <div className="flex items-start gap-3 rounded-[2px] border border-border bg-secondary/40 px-4 py-3">
            <Checkbox
              id="impact-budget"
              checked={impactBudget}
              onCheckedChange={handleToggleImpactBudget}
              disabled={isUpdatingBudget || (revenus.length === 0 && charges.length === 0)}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <Label htmlFor="impact-budget" className="cursor-pointer">Reporter dans le Budget</Label>
              <p className="text-[12px] text-muted-foreground">
                Les revenus et charges de ce bien apparaissent dans Budget → Revenus / Charges, en lecture seule.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex gap-[3px] rounded-[5px] border border-border bg-muted/40 p-[3px]">
              {([['revenus', 'Revenus', revenus.length], ['charges', 'Charges', charges.length]] as const).map(([id, label, count]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={activeTab === id}
                  onClick={() => setActiveTab(id)}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-[2px] border px-4 text-[12.5px] transition-colors ${
                    activeTab === id
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {label}
                  <span className={`tabular-nums ${activeTab === id ? 'text-background/70' : 'text-muted-foreground'}`}>{count}</span>
                </button>
              ))}
            </div>
            <Button
              type="button"
              onClick={() => (isRevenus ? setRevenuFormOpen(true) : setChargeFormOpen(true))}
              className={panelPrimaryButtonClass}
            >
              <Plus className="h-4 w-4" />
              {isRevenus ? 'Ajouter un revenu' : 'Ajouter une charge'}
            </Button>
          </div>

          {isLoadingTab ? (
            <LoadingSpinner text="Chargement..." />
          ) : lignes.length === 0 ? (
            <p className="border-y border-border py-6 text-[13px] text-muted-foreground">
              {isRevenus
                ? 'Aucun revenu pour le moment : ajoutez les loyers et autres revenus générés par ce bien.'
                : 'Aucune charge pour le moment : ajoutez la taxe foncière, les frais de gestion, l\'assurance…'}
            </p>
          ) : (
            <ul className="-mx-2 divide-y divide-border border-y border-border">
              {lignes.map(l => (
                <li key={l.id} className="flex items-center gap-3 px-2 py-2.5 text-[13px]">
                  <span className="w-[4.25rem] shrink-0">
                    <Chip tone={isRevenus ? 'lagon' : 'citron'}>{isRevenus ? 'Revenu' : 'Charge'}</Chip>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{l.nom}</p>
                    {l.debut && <p className="text-[12px] text-muted-foreground">Depuis le {l.debut}</p>}
                  </div>
                  <div className="shrink-0 text-right tabular-nums">
                    <p className="font-medium text-foreground">{l.montant}</p>
                    <p className="text-[12px] lowercase text-muted-foreground">{l.periodicite}</p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Supprimer ${l.nom}`}
                    onClick={() => l.id && setPendingDelete({ id: l.id, nom: l.nom, type: isRevenus ? 'revenu' : 'charge' })}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="-mx-6 flex justify-end border-t border-border px-6 pt-4">
            <Button type="button" variant="outline" className={panelButtonClass} onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <WizardConfirmDialog
        open={pendingDelete !== null}
        title={pendingDelete?.type === 'revenu' ? 'Supprimer ce revenu ?' : 'Supprimer cette charge ?'}
        description={pendingDelete ? `« ${pendingDelete.nom} » sera définitivement supprimé${pendingDelete.type === 'revenu' ? '' : 'e'}.` : ''}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onConfirm={() => {
          if (pendingDelete?.type === 'revenu') handleDeleteRevenu(pendingDelete.id);
          else if (pendingDelete) handleDeleteCharge(pendingDelete.id);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />

      {asset && (
        <>
          <RevenuForm
            assetId={asset.id}
            open={revenuFormOpen}
            onOpenChange={setRevenuFormOpen}
            onSuccess={() => {
              fetchRevenus();
              // If impact_budget is enabled, new revenues should inherit it
              if (impactBudget) {
                handleToggleImpactBudget(true);
              }
            }}
          />
          <ChargeForm
            assetId={asset.id}
            open={chargeFormOpen}
            onOpenChange={setChargeFormOpen}
            onSuccess={() => {
              fetchCharges();
              // If impact_budget is enabled, new charges should inherit it
              if (impactBudget) {
                handleToggleImpactBudget(true);
              }
            }}
          />
        </>
      )}
    </>
  );
};
