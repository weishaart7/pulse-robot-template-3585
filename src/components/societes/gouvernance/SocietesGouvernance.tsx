import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useSocietes } from '@/hooks/useSocietes';
import { useSocieteAssocies, useSocietePacte, useSocieteCCA } from '@/hooks/useSocieteExtended';
import {
  societeAssocieService, SocieteAssocie,
  societePacteService,
  societeCCAService, SocieteCCA,
} from '@/services/societeExtendedService';
import { useSocieteDividendes } from '@/hooks/useSocieteDividendes';
import { Building2, Plus, Trash2, FileSignature, Wallet, Users, Coins, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const NATURES = ['Pleine propriété', 'Nue-propriété', 'Usufruit'];

export const SocietesGouvernance: React.FC = () => {
  const { societes } = useSocietes();
  const [societeId, setSocieteId] = useState<string | null>(null);
  const { associes, refetch: refetchAssocies } = useSocieteAssocies(societeId);
  const { pacte, refetch: refetchPacte } = useSocietePacte(societeId);
  const { cca, refetch: refetchCCA } = useSocieteCCA(societeId);
  const { dividendes } = useSocieteDividendes(societeId);

  const [editingAssoc, setEditingAssoc] = useState<Partial<SocieteAssocie> | null>(null);
  const [editingCCA, setEditingCCA] = useState<Partial<SocieteCCA> | null>(null);
  const [pacteDraft, setPacteDraft] = useState<any>(null);

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
    } catch (e) { toast.error('Erreur'); console.error(e); }
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
    } catch (e) { toast.error('Erreur'); console.error(e); }
  };

  const savePacte = async () => {
    if (!societeId) return;
    try {
      await societePacteService.upsert({ societe_id: societeId, ...(pacteDraft || pacte || { existe: false }) });
      toast.success('Pacte enregistré');
      setPacteDraft(null);
      refetchPacte();
    } catch (e) { toast.error('Erreur'); console.error(e); }
  };

  if (societes.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">Aucune société enregistrée.</p>
      </div>
    );
  }

  const p = pacteDraft || pacte || { existe: false };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Label>Société</Label>
        <Select value={societeId || undefined} onValueChange={setSocieteId}>
          <SelectTrigger className="w-80"><SelectValue placeholder="Sélectionner une société" /></SelectTrigger>
          <SelectContent>
            {societes.map(s => <SelectItem key={s.id} value={s.id}>{s.denomination}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {!societeId && <p className="text-muted-foreground text-sm">Sélectionnez une société pour gérer sa gouvernance.</p>}

      {societeId && (
        <>
          {/* Cap Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" />Table de capitalisation</CardTitle>
              <div className="flex items-center gap-3">
                <Badge variant={Math.abs(totalPct - 100) < 0.01 ? 'default' : 'destructive'}>Total : {totalPct.toFixed(2)}%</Badge>
                <Button size="sm" onClick={() => setEditingAssoc({ nature_detention: 'Pleine propriété', detention_directe: true })}>
                  <Plus className="h-4 w-4 mr-2" />Ajouter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {associes.map(a => (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-[5px] bg-muted/40">
                    <div className="grid grid-cols-5 gap-4 flex-1 text-sm">
                      <div><span className="text-muted-foreground">Associé</span><br />{a.nom_libre || 'Lié famille'}</div>
                      <div><span className="text-muted-foreground">Titres</span><br />{a.nombre_titres ?? '-'}</div>
                      <div><span className="text-muted-foreground">Quote-part</span><br />{a.pourcentage ?? 0}%</div>
                      <div><span className="text-muted-foreground">Nature</span><br />{a.nature_detention}</div>
                      <div><span className="text-muted-foreground">Détention</span><br />{a.detention_directe ? 'Directe' : 'Via holding'}</div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditingAssoc(a)}>Modifier</Button>
                      <Button size="sm" variant="ghost" onClick={async () => { await societeAssocieService.delete(a.id); refetchAssocies(); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {associes.length === 0 && !editingAssoc && <p className="text-sm text-muted-foreground">Aucun associé déclaré.</p>}
              </div>

              {editingAssoc && (
                <div className="mt-4 p-4 border border-border/60 rounded-[5px] space-y-3">
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
                    <Button onClick={saveAssoc}>Enregistrer</Button>
                    <Button variant="ghost" onClick={() => setEditingAssoc(null)}>Annuler</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dividendes par associé */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Coins className="h-4 w-4" />Dividendes versés (agrégat par bénéficiaire)</CardTitle></CardHeader>
            <CardContent>
              {Object.keys(dividendesParAssocie).length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun dividende. Ajoutez-en dans la fiche société (onglet Finances).</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(dividendesParAssocie).map(([k, v]) => (
                    <div key={k} className="flex justify-between p-3 rounded-[5px] bg-muted/40 text-sm">
                      <span>{k}</span><span className="font-medium">{v.toLocaleString('fr-FR')} €</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pacte d'associés */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileSignature className="h-4 w-4" />Pacte d'associés</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {pacteAncien && (
                <div className="flex items-center gap-2 p-3 rounded-[5px] bg-destructive/10 text-destructive text-sm">
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
              <Button onClick={savePacte}>Enregistrer</Button>
            </CardContent>
          </Card>

          {/* CCA */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4" />Comptes courants d'associés</CardTitle>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">Total : {totalCCA.toLocaleString('fr-FR')} €</Badge>
                <Button size="sm" onClick={() => setEditingCCA({ solde: 0 })}><Plus className="h-4 w-4 mr-2" />Ajouter</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {cca.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-[5px] bg-muted/40">
                    <div className="grid grid-cols-4 gap-4 flex-1 text-sm">
                      <div><span className="text-muted-foreground">Associé</span><br />{c.associe_libelle || '-'}</div>
                      <div><span className="text-muted-foreground">Solde</span><br />{(Number(c.solde) || 0).toLocaleString('fr-FR')} €</div>
                      <div><span className="text-muted-foreground">Taux</span><br />{c.taux ?? '-'} %</div>
                      <div><span className="text-muted-foreground">Échéance</span><br />{c.date_remboursement || '-'}</div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditingCCA(c)}>Modifier</Button>
                      <Button size="sm" variant="ghost" onClick={async () => { await societeCCAService.delete(c.id); refetchCCA(); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {cca.length === 0 && !editingCCA && <p className="text-sm text-muted-foreground">Aucun compte courant.</p>}
              </div>
              {editingCCA && (
                <div className="mt-4 p-4 border border-border/60 rounded-[5px] space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Associé</Label><Input value={editingCCA.associe_libelle || ''} onChange={e => setEditingCCA({ ...editingCCA, associe_libelle: e.target.value })} /></div>
                    <div><Label>Solde (€)</Label><Input type="number" value={editingCCA.solde ?? ''} onChange={e => setEditingCCA({ ...editingCCA, solde: e.target.value ? Number(e.target.value) : 0 })} /></div>
                    <div><Label>Taux (%)</Label><Input type="number" step="0.01" value={editingCCA.taux ?? ''} onChange={e => setEditingCCA({ ...editingCCA, taux: e.target.value ? Number(e.target.value) : null })} /></div>
                    <div><Label>Date de remboursement</Label><Input type="date" value={editingCCA.date_remboursement || ''} onChange={e => setEditingCCA({ ...editingCCA, date_remboursement: e.target.value })} /></div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={saveCCA}>Enregistrer</Button>
                    <Button variant="ghost" onClick={() => setEditingCCA(null)}>Annuler</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
