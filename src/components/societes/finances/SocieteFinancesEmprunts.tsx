import React, { useState, useEffect } from 'react';
import { actualiserEmprunt } from '@/lib/credit/contrat';
import { PanelCard, PanelCardContent, PanelCardHeader, PanelCardTitle } from '@/components/layout/panel-section';
import { panelButtonClass, panelPrimaryButtonClass } from '@/components/layout/workspace-panel';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Link2, Unlink, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Emprunt } from '@/services/passifService';
import { societeService } from '@/services/societeService';

// Sous-ensemble des colonnes réellement sélectionnées ci-dessous (pas de
// select('*')) — dérivé du type canonique de passifService.ts pour éviter la
// définition locale dupliquée qui existait ici auparavant.
type EmpruntSociete = Pick<Emprunt, 'id' | 'libelle' | 'nature' | 'capital_restant_du' | 'mensualite' | 'taux_interet' | 'duree_restante' | 'societe_id'>;

interface SocieteFinancesEmpruntsProps {
  societeId: string | null;
}

export const SocieteFinancesEmprunts: React.FC<SocieteFinancesEmpruntsProps> = ({
  societeId,
}) => {
  const [emprunts, setEmprunts] = useState<EmpruntSociete[]>([]);
  const [linkedEmprunts, setLinkedEmprunts] = useState<EmpruntSociete[]>([]);
  const [availableEmprunts, setAvailableEmprunts] = useState<EmpruntSociete[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEmpruntId, setSelectedEmpruntId] = useState<string>('');

  const formatCurrency = (value: number | null | undefined) => {
    if (value === undefined || value === null) return '-';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const fetchEmprunts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('emprunts')
        .select('id, libelle, nature, capital_restant_du, mensualite, duree_restante, societe_id, capital_initial, date_premiere_echeance, duree_totale_mois, differe_mois, differe_type, assurance_mode, assurance_valeur, frais_dossier, frais_garantie, mode_amortissement, taux_interet')
        .order('libelle');

      if (error) throw error;
      
      // Contrat complet : capital restant dû et durée restante calculés à la date du jour.
      const actualises = (data || []).map((e) => actualiserEmprunt(e));
      setEmprunts(actualises);
      
      // Filter linked and available emprunts
      const linked = actualises.filter(e => e.societe_id === societeId);
      const available = actualises.filter(e => !e.societe_id);
      
      setLinkedEmprunts(linked);
      setAvailableEmprunts(available);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Erreur chargement emprunts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmprunts();
  }, [societeId]);

  const linkEmprunt = async () => {
    if (!societeId || !selectedEmpruntId) return;

    try {
      const { error } = await supabase
        .from('emprunts')
        .update({ societe_id: societeId })
        .eq('id', selectedEmpruntId);

      if (error) throw error;

      await societeService.recalculerSociete(societeId);
      toast.success('Emprunt lié à la société');
      setSelectedEmpruntId('');
      setIsDialogOpen(false);
      fetchEmprunts();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Erreur liaison emprunt:', error);
      toast.error('Erreur lors de la liaison');
    }
  };

  const unlinkEmprunt = async (empruntId: string) => {
    try {
      const { error } = await supabase
        .from('emprunts')
        .update({ societe_id: null })
        .eq('id', empruntId);

      if (error) throw error;

      await societeService.recalculerSociete(societeId);
      toast.success('Emprunt délié de la société');
      fetchEmprunts();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Erreur déliaison emprunt:', error);
      toast.error('Erreur lors de la déliaison');
    }
  };

  const totalCapitalRestant = linkedEmprunts.reduce((sum, e) => sum + (e.capital_restant_du || 0), 0);
  const totalMensualites = linkedEmprunts.reduce((sum, e) => sum + (e.mensualite || 0), 0);

  return (
    <PanelCard>
      <PanelCardHeader>
        <div className="flex items-center justify-between">
          <PanelCardTitle>Emprunts liés
          </PanelCardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className={`gap-1.5 ${panelButtonClass}`} disabled={!societeId || availableEmprunts.length === 0}>
                <Link2 className="h-3.5 w-3.5" />
                Lier un emprunt
              </Button>
            </DialogTrigger>
            <DialogContent overlayClassName="bg-black/30 backdrop-blur-[6px]" className="workspace-panel rounded-[4px] sm:rounded-[4px]">
              <DialogHeader className="-mx-6 border-b border-border px-6 pb-4">
                <DialogTitle className="text-[16px] font-medium leading-tight tracking-[-0.01em]">Lier un emprunt existant</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="flex items-start gap-2 p-3 rounded-[2px] bg-secondary/50">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    Sélectionnez un emprunt existant de votre patrimoine pour l'associer à cette société.
                  </p>
                </div>
                <Select value={selectedEmpruntId} onValueChange={setSelectedEmpruntId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un emprunt" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEmprunts.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.libelle} - {formatCurrency(e.capital_restant_du)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={linkEmprunt} className={`w-full ${panelPrimaryButtonClass}`} disabled={!selectedEmpruntId}>
                  Lier à cette société
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </PanelCardHeader>
      <PanelCardContent>
        {/* Summary KPIs */}
        <div className="grid grid-cols-1 divide-y divide-border border-y border-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 mb-4">
          <div className="px-4 py-2.5 first:pl-0">
            <p className="text-xs text-muted-foreground">Capital restant dû</p>
            <p className="text-[13px] font-medium tabular-nums">{formatCurrency(totalCapitalRestant)}</p>
          </div>
          <div className="px-4 py-2.5 first:pl-0">
            <p className="text-xs text-muted-foreground">Mensualités totales</p>
            <p className="text-[13px] font-medium tabular-nums">{formatCurrency(totalMensualites)}</p>
          </div>
        </div>

        {/* List of linked emprunts */}
        {linkedEmprunts.length > 0 ? (
          <div className="space-y-2">
            {linkedEmprunts.map((e) => (
              <div key={e.id} className="flex items-center justify-between py-2.5">
                <div className="space-y-1">
                  <p className="font-medium text-sm">{e.libelle}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Capital: {formatCurrency(e.capital_restant_du)}</span>
                    <span>Mensualité: {formatCurrency(e.mensualite)}</span>
                    {e.taux_interet && <span>Taux: {e.taux_interet}%</span>}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => unlinkEmprunt(e.id)}
                >
                  <Unlink className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            {!societeId 
              ? "Enregistrez d'abord la société pour lier des emprunts"
              : "Aucun emprunt lié à cette société"
            }
          </p>
        )}
      </PanelCardContent>
    </PanelCard>
  );
};
