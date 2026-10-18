import React, { useState, useMemo, useEffect } from 'react';
import { PanelCard, PanelCardContent, PanelCardHeader, PanelCardTitle } from '@/components/layout/panel-section';
import { AddButton, panelButtonClass, panelPrimaryButtonClass, Chip } from '@/components/layout/workspace-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useSocietes } from '@/hooks/useSocietes';
import { useSocieteAssocies, useSocietePacte, useSocieteCCA } from '@/hooks/useSocieteExtended';
import {
  societeAssocieService, SocieteAssocie,
  societePacteService,
  societeCCAService, SocieteCCA,
} from '@/services/societeExtendedService';
import { useSocieteDividendes } from '@/hooks/useSocieteDividendes';
import { useSocieteParticipations } from '@/hooks/useSocieteParticipations';
import { Trash2, AlertTriangle } from 'lucide-react';
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
import { toast } from 'sonner';

const NATURES = ['Pleine propriété', 'Nue-propriété', 'Usufruit'];

// Société choisie : partagée avec l'onglet Transmission par SocietesSection.
export const SocietesGouvernance: React.FC<{ societeId: string | null; onSocieteChange: (id: string) => void }> = ({
  societeId,
  onSocieteChange: setSocieteId,
}) => {
  const { societes } = useSocietes();
  const { associes, refetch: refetchAssocies } = useSocieteAssocies(societeId);
  const { pacte, refetch: refetchPacte } = useSocietePacte(societeId);
  const { cca, refetch: refetchCCA } = useSocieteCCA(societeId);
  const { dividendes } = useSocieteDividendes(societeId);
  const { participations } = useSocieteParticipations();
  const societe = societes.find(s => s.id === societeId);
  // Détention déjà déclarée ailleurs (quotités du foyer sur la fiche, participations
  // entre sociétés dans « Mes sociétés ») : rappelée ici, la table de capitalisation
  // étant une saisie distincte qui n'est pas croisée avec elles.
  const detentionsDeclarees = useMemo(() => {
    if (!societe) return [];
    const lignes: string[] = [];
    const pu = societe.pourcentage_utilisateur ?? 100;
    const pc = societe.pourcentage_conjoint ?? 0;
    if (pu + pc > 0) lignes.push(`Foyer : ${pu + pc} % (fiche société)`);
    participations
      .filter(p => p.societe_fille_id === societe.id)
      .forEach(p => {
        const mere = societes.find(s => s.id === p.societe_mere_id);
        lignes.push(`${mere?.denomination || 'Société'} : ${p.pourcentage} % (participations)`);
      });
    return lignes;
  }, [societe, societes, participations]);

  const [editingAssoc, setEditingAssoc] = useState<Partial<SocieteAssocie> | null>(null);
  const [editingCCA, setEditingCCA] = useState<Partial<SocieteCCA> | null>(null);
  const [pacteDraft, setPacteDraft] = useState<any>(null);
  const [pendingDelete, setPendingDelete] = useState<{ kind: 'associe' | 'cca'; id: string; libelle: string } | null>(null);

  // Brouillons propres à la société affichée : sans cette remise à zéro, un associé,
  // un compte courant ou un pacte en cours d'édition était enregistré sur la société
  // suivante (et, pour un associé ou un CCA existant, la ligne y était déplacée).
  useEffect(() => {
    setEditingAssoc(null);
    setEditingCCA(null);
    setPacteDraft(null);
  }, [societeId]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      if (pendingDelete.kind === 'associe') {
        await societeAssocieService.delete(pendingDelete.id);
        refetchAssocies();
      } else {
        await societeCCAService.delete(pendingDelete.id);
        refetchCCA();
      }
      toast.success('Ligne supprimée');
    } catch (e) {
      toast.error('Erreur lors de la suppression');
      if (import.meta.env.DEV) console.error(e);
    } finally {
      setPendingDelete(null);
    }
  };

  const totalPct = useMemo(() => associes.reduce((s, a) => s + (Number(a.pourcentage) || 0), 0), [associes]);
  const totalCCA = useMemo(() => cca.reduce((s, c) => s + (Number(c.solde) || 0), 0), [cca]);
  const dividendesParAssocie = useMemo(() => {
    const map: Record<string, number> = {};
    dividendes.forEach(d => {
      const k = d.beneficiaire || 'Non attribué';
      map[k] = (map[k] || 0) + (Number(d.montant_brut) || 0);
    });
    return map;
  }, [dividendes]);

  const pacteAncien = pacte?.date_signature && (new Date().getFullYear() - new Date(pacte.date_signature).getFullYear() > 7);

  const saveAssoc = async () => {
    if (!editingAssoc || !societeId) return;
    try {
      await societeAssocieService.upsert({
        societe_id: societeId,
        family_link_id: editingAssoc.family_link_id || null,
        nom_libre: editingAssoc.nom_libre || null,
        societe_associee_id: editingAssoc.societe_associee_id || null,
        nombre_titres: editingAssoc.nombre_titres ?? null,
        pourcentage: editingAssoc.pourcentage ?? null,
        nature_detention: editingAssoc.nature_detention || 'Pleine propriété',
        detention_directe: editingAssoc.detention_directe ?? true,
        id: editingAssoc.id,
      });
      toast.success('Associé enregistré');
      setEditingAssoc(null);
      refetchAssocies();
    } catch (e) { toast.error('Erreur'); if (import.meta.env.DEV) console.error(e); }
  };

  const saveCCA = async () => {
    if (!editingCCA || !societeId) return;
    try {
      await societeCCAService.upsert({
        societe_id: societeId,
        associe_id: editingCCA.associe_id || null,
        associe_libelle: editingCCA.associe_libelle || null,
        solde: editingCCA.solde ?? 0,
        taux: editingCCA.taux ?? null,
        date_remboursement: editingCCA.date_remboursement || null,
        commentaire: editingCCA.commentaire || null,
        id: editingCCA.id,
      });
      toast.success('CCA enregistré');
      setEditingCCA(null);
      refetchCCA();
    } catch (e) { toast.error('Erreur'); if (import.meta.env.DEV) console.error(e); }
  };

  const savePacte = async () => {
    if (!societeId) return;
    try {
      await societePacteService.upsert({ societe_id: societeId, ...(pacteDraft || pacte || { existe: false }) });
      toast.success('Pacte enregistré');
      setPacteDraft(null);
      refetchPacte();
    } catch (e) { toast.error('Erreur'); if (import.meta.env.DEV) console.error(e); }
  };

  if (societes.length === 0) {
    return (
      <div className="px-8 py-7">
        <p className="max-w-md text-[13px] text-muted-foreground">Aucune société enregistrée.</p>
      </div>
    );
  }

  const p = pacteDraft || pacte || { existe: false };

  return (
    <div>
      {/* Choix de la société : bandeau fileté en tête du panneau. */}
      <div className="flex items-center gap-4 border-b border-border px-8 py-4">
        <Label>Société</Label>
        <Select value={societeId || undefined} onValueChange={setSocieteId}>
          <SelectTrigger className="w-80"><SelectValue placeholder="Sélectionner une société" /></SelectTrigger>
          <SelectContent>
            {societes.map(s => <SelectItem key={s.id} value={s.id}>{s.denomination}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {!societeId && <p className="px-8 py-6 text-[13px] text-muted-foreground">Sélectionnez une société pour gérer sa gouvernance.</p>}

      {societeId && (
        <>
          {/* Cap Table */}
          <PanelCard>
            <PanelCardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
              <PanelCardTitle>Table de capitalisation</PanelCardTitle>
              <div className="flex items-center gap-3">
                {associes.length > 0 && (
                  <Chip tone={Math.abs(totalPct - 100) < 0.01 ? 'lagon' : 'alerte'}>Total : {totalPct.toFixed(2)} %</Chip>
                )}
                <AddButton onClick={() => setEditingAssoc({ nature_detention: 'Pleine propriété', detention_directe: true })}>Ajouter</AddButton>
              </div>
            </PanelCardHeader>
            <PanelCardContent>
              {detentionsDeclarees.length > 0 && (
                <p className="mb-3 text-[12.5px] text-muted-foreground">
                  Détention déclarée ailleurs : {detentionsDeclarees.join(' · ')}. La table ci-dessous est une saisie distincte.
                </p>
              )}
              <div className="divide-y divide-border border-border [&:has(>div)]:border-y">
                {associes.map(a => (
                  <div key={a.id} className="flex items-center justify-between py-2.5">
                    <div className="grid grid-cols-5 gap-4 flex-1 text-sm">
                      <div><span className="text-muted-foreground">Associé</span><br />{a.nom_libre || 'Associé sans nom'}</div>
                      <div><span className="text-muted-foreground">Titres</span><br />{a.nombre_titres ?? '-'}</div>
                      <div><span className="text-muted-foreground">Quote-part</span><br />{a.pourcentage ?? 0}%</div>
                      <div><span className="text-muted-foreground">Nature</span><br />{a.nature_detention}</div>
                      <div><span className="text-muted-foreground">Détention</span><br />{a.detention_directe ? 'Directe' : 'Via holding'}</div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-8 rounded-[2px] text-[12.5px]" onClick={() => setEditingAssoc(a)}>Modifier</Button>
                      <Button size="sm" variant="ghost" onClick={() => setPendingDelete({ kind: 'associe', id: a.id, libelle: a.nom_libre || 'cet associé' })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {associes.length === 0 && !editingAssoc && <p className="text-sm text-muted-foreground">Aucun associé déclaré.</p>}
              </div>

              {editingAssoc && (
                <div className="mt-4 rounded-[2px] border border-border p-4 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label>Nom de l'associé</Label><Input value={editingAssoc.nom_libre || ''} onChange={e => setEditingAssoc({ ...editingAssoc, nom_libre: e.target.value })} /></div>
                    <div><Label>Nombre de titres</Label><Input type="number" value={editingAssoc.nombre_titres ?? ''} onChange={e => setEditingAssoc({ ...editingAssoc, nombre_titres: e.target.value ? Number(e.target.value) : null })} /></div>
                    <div><Label>Pourcentage (%)</Label><Input type="number" step="0.01" value={editingAssoc.pourcentage ?? ''} onChange={e => setEditingAssoc({ ...editingAssoc, pourcentage: e.target.value ? Number(e.target.value) : null })} /></div>
                    <div>
                      <Label>Nature</Label>
                      <Select value={editingAssoc.nature_detention} onValueChange={v => setEditingAssoc({ ...editingAssoc, nature_detention: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{NATURES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <Checkbox checked={editingAssoc.detention_directe ?? true} onCheckedChange={c => setEditingAssoc({ ...editingAssoc, detention_directe: !!c })} />
                      <Label>Détention directe</Label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button className={panelPrimaryButtonClass} onClick={saveAssoc}>Enregistrer</Button>
                    <Button variant="outline" className={panelButtonClass} onClick={() => setEditingAssoc(null)}>Annuler</Button>
                  </div>
                </div>
              )}
            </PanelCardContent>
          </PanelCard>

          {/* Dividendes par associé */}
          <PanelCard>
            <PanelCardHeader><PanelCardTitle>Dividendes versés (agrégat par bénéficiaire)</PanelCardTitle></PanelCardHeader>
            <PanelCardContent>
              {Object.keys(dividendesParAssocie).length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun dividende. Ajoutez-en dans la fiche société (onglet Finances).</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(dividendesParAssocie).map(([k, v]) => (
                    <div key={k} className="flex justify-between py-2.5 text-sm">
                      <span>{k}</span><span className="font-medium">{v.toLocaleString('fr-FR')} €</span>
                    </div>
                  ))}
                </div>
              )}
            </PanelCardContent>
          </PanelCard>

          {/* Pacte d'associés */}
          <PanelCard>
            <PanelCardHeader><PanelCardTitle>Pacte d'associés</PanelCardTitle></PanelCardHeader>
            <PanelCardContent>
              {pacteAncien && (
                <div className="mx-8 mt-6 flex items-center gap-2 rounded-[2px] bg-destructive/10 p-3 text-[13px] text-destructive">
                  <AlertTriangle className="h-4 w-4" />Le pacte a plus de 7 ans, pensez à le revoir.
                </div>
              )}
              <div className="flex items-center gap-2">
                <Checkbox checked={p.existe} onCheckedChange={c => setPacteDraft({ ...p, existe: !!c })} />
                <Label>Un pacte d'associés existe</Label>
              </div>
              {p.existe && (
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Date de signature</Label><Input type="date" value={p.date_signature || ''} onChange={e => setPacteDraft({ ...p, date_signature: e.target.value })} /></div>
                  <div><Label>Durée (années)</Label><Input type="number" value={p.duree_annees ?? ''} onChange={e => setPacteDraft({ ...p, duree_annees: e.target.value ? Number(e.target.value) : null })} /></div>
                  {[
                    ['clause_preemption', 'Clause de préemption'],
                    ['clause_agrement', 'Clause d\'agrément'],
                    ['clause_sortie_conjointe', 'Clause de sortie conjointe (tag-along)'],
                    ['clause_drag_along', 'Clause d\'entraînement (drag-along)'],
                  ].map(([k, lbl]) => (
                    <div key={k} className="flex items-center gap-2">
                      <Checkbox checked={!!p[k]} onCheckedChange={c => setPacteDraft({ ...p, [k]: !!c })} />
                      <Label>{lbl}</Label>
                    </div>
                  ))}
                  <div className="col-span-2"><Label>Commentaire</Label><Textarea value={p.commentaire || ''} onChange={e => setPacteDraft({ ...p, commentaire: e.target.value })} /></div>
                </div>
              )}
              <Button className={panelPrimaryButtonClass} onClick={savePacte}>Enregistrer</Button>
            </PanelCardContent>
          </PanelCard>

          {/* CCA */}
          <PanelCard>
            <PanelCardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
              <PanelCardTitle>Comptes courants d'associés</PanelCardTitle>
              <div className="flex items-center gap-3">
                <Chip>Total : {totalCCA.toLocaleString('fr-FR')} €</Chip>
                <AddButton onClick={() => setEditingCCA({ solde: 0 })}>Ajouter</AddButton>
              </div>
            </PanelCardHeader>
            <PanelCardContent>
              <div className="divide-y divide-border border-border [&:has(>div)]:border-y">
                {cca.map(c => (
                  <div key={c.id} className="flex items-center justify-between py-2.5">
                    <div className="grid grid-cols-4 gap-4 flex-1 text-sm">
                      <div><span className="text-muted-foreground">Associé</span><br />{c.associe_libelle || '-'}</div>
                      <div><span className="text-muted-foreground">Solde</span><br />{(Number(c.solde) || 0).toLocaleString('fr-FR')} €</div>
                      <div><span className="text-muted-foreground">Taux</span><br />{c.taux ?? '-'} %</div>
                      <div><span className="text-muted-foreground">Échéance</span><br />{c.date_remboursement || '-'}</div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-8 rounded-[2px] text-[12.5px]" onClick={() => setEditingCCA(c)}>Modifier</Button>
                      <Button size="sm" variant="ghost" onClick={() => setPendingDelete({ kind: 'cca', id: c.id, libelle: c.associe_libelle || 'ce compte courant' })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {cca.length === 0 && !editingCCA && <p className="text-sm text-muted-foreground">Aucun compte courant.</p>}
              </div>
              {editingCCA && (
                <div className="mt-4 rounded-[2px] border border-border p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Associé</Label><Input value={editingCCA.associe_libelle || ''} onChange={e => setEditingCCA({ ...editingCCA, associe_libelle: e.target.value })} /></div>
                    <div><Label>Solde (€)</Label><Input type="number" value={editingCCA.solde ?? ''} onChange={e => setEditingCCA({ ...editingCCA, solde: e.target.value ? Number(e.target.value) : 0 })} /></div>
                    <div><Label>Taux (%)</Label><Input type="number" step="0.01" value={editingCCA.taux ?? ''} onChange={e => setEditingCCA({ ...editingCCA, taux: e.target.value ? Number(e.target.value) : null })} /></div>
                    <div><Label>Date de remboursement</Label><Input type="date" value={editingCCA.date_remboursement || ''} onChange={e => setEditingCCA({ ...editingCCA, date_remboursement: e.target.value })} /></div>
                  </div>
                  <div className="flex gap-2">
                    <Button className={panelPrimaryButtonClass} onClick={saveCCA}>Enregistrer</Button>
                    <Button variant="outline" className={panelButtonClass} onClick={() => setEditingCCA(null)}>Annuler</Button>
                  </div>
                </div>
              )}
            </PanelCardContent>
          </PanelCard>
        </>
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDelete?.kind === 'associe' ? 'Supprimer l\'associé' : 'Supprimer le compte courant'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.libelle} sera supprimé de la société. Cette action est définitive.
            </AlertDialogDescription>
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
