import React, { useState } from 'react';
import { PanelCard, PanelCardContent, PanelCardHeader, PanelCardTitle } from '@/components/layout/panel-section';
import { LAGON_INK, CITRON_MID, GREY } from '@/components/budget/budgetColors';
import { AddButton, panelButtonClass, panelPrimaryButtonClass } from '@/components/layout/workspace-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useSocieteBilans } from '@/hooks/useSocieteExtended';
import { societeBilanService, SocieteBilan } from '@/services/societeExtendedService';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

// Onglet Bilans de la fiche société : porte sur la société ouverte, sans
// sélecteur (qui permettait de saisir les bilans d'une autre société).
export const SocietesBilans: React.FC<{ societeId: string }> = ({ societeId }) => {
  const { bilans, refetch } = useSocieteBilans(societeId);
  const [editing, setEditing] = useState<Partial<SocieteBilan> | null>(null);
  const [bilanToDelete, setBilanToDelete] = useState<SocieteBilan | null>(null);

  const confirmDelete = async () => {
    if (!bilanToDelete) return;
    try {
      await societeBilanService.delete(bilanToDelete.id);
      toast.success('Bilan supprimé');
      refetch();
    } catch (e) {
      toast.error('Erreur lors de la suppression');
      if (import.meta.env.DEV) console.error(e);
    } finally {
      setBilanToDelete(null);
    }
  };

  const handleSave = async () => {
    if (!editing || !societeId || !editing.exercice_annee) return;
    try {
      await societeBilanService.upsert({
        societe_id: societeId,
        exercice_annee: editing.exercice_annee,
        date_cloture: editing.date_cloture,
        chiffre_affaires: editing.chiffre_affaires,
        resultat_net: editing.resultat_net,
        tresorerie: editing.tresorerie,
        capitaux_propres: editing.capitaux_propres,
        dettes_financieres: editing.dettes_financieres,
        commentaire: editing.commentaire,
        id: editing.id,
      });
      toast.success('Bilan enregistré');
      setEditing(null);
      refetch();
    } catch (e) { toast.error('Erreur'); if (import.meta.env.DEV) console.error(e); }
  };

  const chartData = [...bilans].reverse().map(b => ({
    annee: b.exercice_annee,
    CA: Number(b.chiffre_affaires) || 0,
    Résultat: Number(b.resultat_net) || 0,
    Trésorerie: Number(b.tresorerie) || 0,
  }));

  return (
    <div>
      <>
          {bilans.length >= 2 && (
            <PanelCard>
              <PanelCardHeader><PanelCardTitle>Évolution</PanelCardTitle></PanelCardHeader>
              <PanelCardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis dataKey="annee" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="CA" stroke={LAGON_INK} strokeWidth={1.5} />
                    <Line type="monotone" dataKey="Résultat" stroke={CITRON_MID} strokeWidth={1.5} />
                    <Line type="monotone" dataKey="Trésorerie" stroke={GREY} strokeWidth={1.5} />
                  </LineChart>
                </ResponsiveContainer>
              </PanelCardContent>
            </PanelCard>
          )}

          <PanelCard>
            <PanelCardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
              <PanelCardTitle>Historique des bilans</PanelCardTitle>
              <AddButton onClick={() => setEditing({ exercice_annee: new Date().getFullYear() - 1 })}>Ajouter</AddButton>
            </PanelCardHeader>
            <PanelCardContent>
              {bilans.length === 0 && !editing && <p className="text-sm text-muted-foreground">Aucun bilan saisi.</p>}
              <div className="divide-y divide-border border-y border-border empty:hidden">
                {bilans.map(b => (
                  <div key={b.id} className="flex items-center justify-between py-2.5">
                    <div className="grid grid-cols-5 gap-4 flex-1 text-sm">
                      <div><span className="text-muted-foreground">Année</span><br />{b.exercice_annee}</div>
                      <div><span className="text-muted-foreground">CA</span><br />{(Number(b.chiffre_affaires) || 0).toLocaleString('fr-FR')} €</div>
                      <div><span className="text-muted-foreground">Résultat</span><br />{(Number(b.resultat_net) || 0).toLocaleString('fr-FR')} €</div>
                      <div><span className="text-muted-foreground">Trésorerie</span><br />{(Number(b.tresorerie) || 0).toLocaleString('fr-FR')} €</div>
                      <div><span className="text-muted-foreground">Capitaux propres</span><br />{(Number(b.capitaux_propres) || 0).toLocaleString('fr-FR')} €</div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-8 rounded-[2px] text-[12.5px]" onClick={() => setEditing(b)}>Modifier</Button>
                      <Button size="sm" variant="ghost" onClick={() => setBilanToDelete(b)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {editing && (
                <div className="mt-4 rounded-[2px] border border-border p-4 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label>Année</Label><Input type="number" value={editing.exercice_annee || ''} onChange={e => setEditing({ ...editing, exercice_annee: Number(e.target.value) })} /></div>
                    <div><Label>Date de clôture</Label><Input type="date" value={editing.date_cloture || ''} onChange={e => setEditing({ ...editing, date_cloture: e.target.value })} /></div>
                    <div><Label>Chiffre d'affaires</Label><Input type="number" value={editing.chiffre_affaires ?? ''} onChange={e => setEditing({ ...editing, chiffre_affaires: e.target.value ? Number(e.target.value) : null })} /></div>
                    <div><Label>Résultat net</Label><Input type="number" value={editing.resultat_net ?? ''} onChange={e => setEditing({ ...editing, resultat_net: e.target.value ? Number(e.target.value) : null })} /></div>
                    <div><Label>Trésorerie</Label><Input type="number" value={editing.tresorerie ?? ''} onChange={e => setEditing({ ...editing, tresorerie: e.target.value ? Number(e.target.value) : null })} /></div>
                    <div><Label>Capitaux propres</Label><Input type="number" value={editing.capitaux_propres ?? ''} onChange={e => setEditing({ ...editing, capitaux_propres: e.target.value ? Number(e.target.value) : null })} /></div>
                    <div><Label>Dettes financières</Label><Input type="number" value={editing.dettes_financieres ?? ''} onChange={e => setEditing({ ...editing, dettes_financieres: e.target.value ? Number(e.target.value) : null })} /></div>
                  </div>
                  <div className="flex gap-2">
                    <Button className={panelPrimaryButtonClass} onClick={handleSave}>Enregistrer</Button>
                    <Button variant="outline" className={panelButtonClass} onClick={() => setEditing(null)}>Annuler</Button>
                  </div>
                </div>
              )}
            </PanelCardContent>
          </PanelCard>
      </>

      <AlertDialog open={!!bilanToDelete} onOpenChange={(open) => { if (!open) setBilanToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le bilan {bilanToDelete?.exercice_annee}</AlertDialogTitle>
            <AlertDialogDescription>Le bilan de cet exercice sera supprimé. Cette action est définitive.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
