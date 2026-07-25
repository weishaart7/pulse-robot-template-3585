import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus } from 'lucide-react';
import { useRecompenses } from '@/hooks/useRecompenses';
import { useAssets } from '@/hooks/useAssets';
import { Recompense, SensRecompense, EpouxConcerne, NatureDepense, ModeEvaluationConventionnel } from '@/types/recompense';

const SENS_LABELS: Record<SensRecompense, string> = {
  communaute_vers_epoux: 'La communauté doit récompense à l\'époux',
  epoux_vers_communaute: 'L\'époux doit récompense à la communauté',
};

const NATURE_LABELS: Record<NatureDepense, string> = {
  acquisition: 'Acquisition',
  conservation: 'Conservation',
  amelioration: 'Amélioration',
  autre: 'Autre',
};

export function RecompensesSection() {
  const { data: recompenses, saving, addRecompense, removeRecompense } = useRecompenses();
  const { assets } = useAssets();
  const [isAdding, setIsAdding] = useState(false);

  const [sens, setSens] = useState<SensRecompense>('epoux_vers_communaute');
  const [epoux, setEpoux] = useState<EpouxConcerne>('user');
  const [bienConcerneId, setBienConcerneId] = useState<string>('');
  const [depenseFaite, setDepenseFaite] = useState('');
  const [valeurBienAcquisition, setValeurBienAcquisition] = useState('');
  const [valeurBienLiquidation, setValeurBienLiquidation] = useState('');
  const [natureDepense, setNatureDepense] = useState<NatureDepense>('acquisition');
  const [modeEvaluation, setModeEvaluation] = useState<ModeEvaluationConventionnel>('profit_subsistant');

  const resetForm = () => {
    setSens('epoux_vers_communaute');
    setEpoux('user');
    setBienConcerneId('');
    setDepenseFaite('');
    setValeurBienAcquisition('');
    setValeurBienLiquidation('');
    setNatureDepense('acquisition');
    setModeEvaluation('profit_subsistant');
    setIsAdding(false);
  };

  const handleSubmit = async () => {
    const depense = Number(depenseFaite);
    if (!depense) return;

    await addRecompense({
      sens,
      epoux,
      bien_concerne_id: bienConcerneId || null,
      depense_faite: depense,
      valeur_bien_acquisition: valeurBienAcquisition ? Number(valeurBienAcquisition) : null,
      valeur_bien_liquidation: valeurBienLiquidation ? Number(valeurBienLiquidation) : null,
      nature_depense: natureDepense,
      mode_evaluation_conventionnel: modeEvaluation,
    });
    resetForm();
  };

  const assetLabel = (id?: string | null) => assets?.find(a => a.id === id)?.denomination || 'Bien sans nom';

  const describe = (r: Recompense) => `${SENS_LABELS[r.sens]} (${r.epoux === 'user' ? 'vous' : 'conjoint'})`;

  return (
    <div className="rounded-md border bg-card p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Récompenses</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Mouvements de valeur entre un patrimoine propre et la masse commune (art. 1468 à 1478 C. civ.), à régler à la liquidation.
      </p>

      {recompenses.length > 0 && (
        <div className="space-y-3 mb-5">
          {recompenses.map(r => (
            <div key={r.id} className="rounded-md border p-4 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">{describe(r)}</p>
                <p className="text-xs text-muted-foreground">
                  Dépense faite : {r.depense_faite.toLocaleString()}€ · {NATURE_LABELS[r.nature_depense]}
                  {r.bien_concerne_id && ` · ${assetLabel(r.bien_concerne_id)}`}
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon" className="shrink-0 h-7 w-7" onClick={() => removeRecompense(r.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {isAdding ? (
        <div className="rounded-md border p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Sens</Label>
              <Select value={sens} onValueChange={(v) => setSens(v as SensRecompense)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="epoux_vers_communaute">{SENS_LABELS.epoux_vers_communaute}</SelectItem>
                  <SelectItem value="communaute_vers_epoux">{SENS_LABELS.communaute_vers_epoux}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Époux concerné</Label>
              <Select value={epoux} onValueChange={(v) => setEpoux(v as EpouxConcerne)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Vous</SelectItem>
                  <SelectItem value="spouse">Conjoint</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Bien concerné (facultatif)</Label>
              <Select value={bienConcerneId || '__none__'} onValueChange={(v) => setBienConcerneId(v === '__none__' ? '' : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Aucun</SelectItem>
                  {assets?.map(a => (
                    <SelectItem key={a.id} value={a.id!}>{a.denomination || 'Bien sans nom'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Nature de la dépense</Label>
              <Select value={natureDepense} onValueChange={(v) => setNatureDepense(v as NatureDepense)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(NATURE_LABELS) as NatureDepense[]).map(n => (
                    <SelectItem key={n} value={n}>{NATURE_LABELS[n]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Dépense faite (€)</Label>
              <Input type="number" value={depenseFaite} onChange={(e) => setDepenseFaite(e.target.value)} placeholder="Ex : 100 000" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Valeur du bien à l'acquisition (€)</Label>
              <Input type="number" value={valeurBienAcquisition} onChange={(e) => setValeurBienAcquisition(e.target.value)} placeholder="Facultatif" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Valeur du bien à la liquidation (€)</Label>
              <Input type="number" value={valeurBienLiquidation} onChange={(e) => setValeurBienLiquidation(e.target.value)} placeholder="Facultatif" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Mode d'évaluation (clause du contrat de mariage)</Label>
            <Select value={modeEvaluation} onValueChange={(v) => setModeEvaluation(v as ModeEvaluationConventionnel)}>
              <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="profit_subsistant">Profit subsistant (défaut légal, art. 1469)</SelectItem>
                <SelectItem value="nominal">Nominal</SelectItem>
                <SelectItem value="plafonne">Plafonné</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={resetForm}>Annuler</Button>
            <Button type="button" onClick={handleSubmit} disabled={!depenseFaite || saving}>
              {saving ? 'Enregistrement...' : 'Ajouter la récompense'}
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={() => setIsAdding(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une récompense
        </Button>
      )}
    </div>
  );
}
