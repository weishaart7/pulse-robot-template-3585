import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSocietes } from '@/hooks/useSocietes';
import { useSocieteBilans } from '@/hooks/useSocieteExtended';
import { societeBilanService, SocieteBilan } from '@/services/societeExtendedService';
import { Building2, Plus, Trash2, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

export const SocietesBilans: React.FC = () => {
  const { societes } = useSocietes();
  const [societeId, setSocieteId] = useState<string | null>(null);
  const { bilans, refetch } = useSocieteBilans(societeId);
  const [editing, setEditing] = useState<Partial<SocieteBilan> | null>(null);

  if (societes.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">Aucune société. Ajoutez-en pour suivre vos bilans.</p>
      </div>
    );
  }

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
    } catch (e) { toast.error('Erreur'); console.error(e); }
  };

  const chartData = [...bilans].reverse().map(b => ({
    annee: b.exercice_annee,
    CA: Number(b.chiffre_affaires) || 0,
    Résultat: Number(b.resultat_net) || 0,
    Trésorerie: Number(b.tresorerie) || 0,
  }));

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

      {societeId && (
        <>
          {bilans.length >= 2 && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" />Évolution</CardTitle></CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis dataKey="annee" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="CA" stroke="hsl(var(--primary))" strokeWidth={1.5} />
                    <Line type="monotone" dataKey="Résultat" stroke="hsl(var(--ring))" strokeWidth={1.5} />
                    <Line type="monotone" dataKey="Trésorerie" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Historique des bilans</CardTitle>
              <Button size="sm" onClick={() => setEditing({ exercice_annee: new Date().getFullYear() - 1 })}>
                <Plus className="h-4 w-4 mr-2" />Ajouter
              </Button>
            </CardHeader>
            <CardContent>
              {bilans.length === 0 && !editing && <p className="text-sm text-muted-foreground">Aucun bilan saisi.</p>}
              <div className="space-y-2">
                {bilans.map(b => (
                  <div key={b.id} className="flex items-center justify-between p-3 rounded-[5px] bg-muted/40">
                    <div className="grid grid-cols-5 gap-4 flex-1 text-sm">
                      <div><span className="text-muted-foreground">Année</span><br />{b.exercice_annee}</div>
                      <div><span className="text-muted-foreground">CA</span><br />{(Number(b.chiffre_affaires) || 0).toLocaleString('fr-FR')} €</div>
                      <div><span className="text-muted-foreground">Résultat</span><br />{(Number(b.resultat_net) || 0).toLocaleString('fr-FR')} €</div>
                      <div><span className="text-muted-foreground">Trésorerie</span><br />{(Number(b.tresorerie) || 0).toLocaleString('fr-FR')} €</div>
                      <div><span className="text-muted-foreground">Capitaux propres</span><br />{(Number(b.capitaux_propres) || 0).toLocaleString('fr-FR')} €</div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(b)}>Modifier</Button>
                      <Button size="sm" variant="ghost" onClick={async () => { await societeBilanService.delete(b.id); refetch(); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {editing && (
                <div className="mt-4 p-4 border border-border/60 rounded-[5px] space-y-3">
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
                    <Button onClick={handleSave}>Enregistrer</Button>
                    <Button variant="ghost" onClick={() => setEditing(null)}>Annuler</Button>
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
