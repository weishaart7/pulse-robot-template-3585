import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, AlertTriangle } from 'lucide-react';
import { useCreancesEntreEpoux } from '@/hooks/useCreancesEntreEpoux';
import { useAssets } from '@/hooks/useAssets';
import { CreanceEntreEpoux, EpouxConcerne, NatureDepense, ModeEvaluationConventionnel } from '@/types/creanceEntreEpoux';

const NATURE_LABELS: Record<NatureDepense, string> = {
  acquisition: 'Acquisition',
  conservation: 'Conservation',
  amelioration: 'Amélioration',
  autre: 'Autre',
};

export function CreancesEntreEpouxSection() {
  const { data: creances, saving, addCreance, removeCreance } = useCreancesEntreEpoux();
  const { assets } = useAssets();
  const [isAdding, setIsAdding] = useState(false);

  const [epouxCreancier, setEpouxCreancier] = useState<EpouxConcerne>('user');
  const [epouxDebiteur, setEpouxDebiteur] = useState<EpouxConcerne>('spouse');
  const [bienConcerneId, setBienConcerneId] = useState<string>('');
  const [depenseFaite, setDepenseFaite] = useState('');
  const [valeurBienAvant, setValeurBienAvant] = useState('');
  const [valeurBienApres, setValeurBienApres] = useState('');
  const [natureDepense, setNatureDepense] = useState<NatureDepense>('amelioration');
  const [modeEvaluation, setModeEvaluation] = useState<ModeEvaluationConventionnel>('profit_subsistant');

  const resetForm = () => {
    setEpouxCreancier('user');
    setEpouxDebiteur('spouse');
    setBienConcerneId('');
    setDepenseFaite('');
    setValeurBienAvant('');
    setValeurBienApres('');
    setNatureDepense('amelioration');
    setModeEvaluation('profit_subsistant');
    setIsAdding(false);
  };

  const handleSubmit = async () => {
    const depense = Number(depenseFaite);
    if (!depense || epouxCreancier === epouxDebiteur) return;

    await addCreance({
      epoux_creancier: epouxCreancier,
      epoux_debiteur: epouxDebiteur,
      bien_concerne_id: bienConcerneId || null,
      depense_faite: depense,
      valeur_bien_avant: valeurBienAvant ? Number(valeurBienAvant) : null,
      valeur_bien_apres: valeurBienApres ? Number(valeurBienApres) : null,
      nature_depense: natureDepense,
      mode_evaluation_conventionnel: modeEvaluation,
    });
    resetForm();
  };

  const assetLabel = (id?: string | null) => assets?.find(a => a.id === id)?.denomination || 'Bien sans nom';
  const epouxLabel = (e: EpouxConcerne) => (e === 'user' ? 'vous' : 'conjoint');

  const describe = (c: CreanceEntreEpoux) =>
    `Créance de ${epouxLabel(c.epoux_creancier)} sur ${epouxLabel(c.epoux_debiteur)}`;

  const valeursManquantes = modeEvaluation !== 'nominal' && (!valeurBienAvant || !valeurBienApres);

  return (
    <div className="rounded-md border bg-card p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Créances entre époux</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Mouvements de valeur entre patrimoines propres, exigibles pendant le mariage (art. 1479, 1543 C. civ.).
      </p>

      {creances.length > 0 && (
        <div className="space-y-3 mb-5">
          {creances.map(c => (
            <div key={c.id} className="rounded-md border p-4 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">{describe(c)}</p>
                <p className="text-xs text-muted-foreground">
                  Dépense faite : {c.depense_faite.toLocaleString()}€ · {NATURE_LABELS[c.nature_depense]}
                  {c.bien_concerne_id && ` · ${assetLabel(c.bien_concerne_id)}`}
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon" className="shrink-0 h-7 w-7" onClick={() => removeCreance(c.id)}>
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
              <Label className="text-xs">Époux créancier</Label>
              <Select value={epouxCreancier} onValueChange={(v) => setEpouxCreancier(v as EpouxConcerne)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Vous</SelectItem>
                  <SelectItem value="spouse">Conjoint</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Époux débiteur</Label>
              <Select value={epouxDebiteur} onValueChange={(v) => setEpouxDebiteur(v as EpouxConcerne)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Vous</SelectItem>
                  <SelectItem value="spouse">Conjoint</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {epouxCreancier === epouxDebiteur && (
            <p className="text-xs text-destructive">Le créancier et le débiteur doivent être différents.</p>
          )}

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
              <Input type="number" value={depenseFaite} onChange={(e) => setDepenseFaite(e.target.value)} placeholder="Ex : 40 000" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Valeur du bien avant (€)</Label>
              <Input type="number" value={valeurBienAvant} onChange={(e) => setValeurBienAvant(e.target.value)} placeholder="Facultatif" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Valeur du bien après (€)</Label>
              <Input type="number" value={valeurBienApres} onChange={(e) => setValeurBienApres(e.target.value)} placeholder="Facultatif" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Mode d'évaluation (convention contraire des parties)</Label>
            <Select value={modeEvaluation} onValueChange={(v) => setModeEvaluation(v as ModeEvaluationConventionnel)}>
              <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="profit_subsistant">Profit subsistant (défaut légal, art. 1479 al. 2)</SelectItem>
                <SelectItem value="nominal">Nominal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {valeursManquantes && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 text-xs">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                Il manque la valeur du bien avant et/ou après la dépense. Sans ces deux montants, le calcul retiendra la dépense telle quelle (montant nominal), même si vous avez choisi un autre mode d'évaluation ci-dessus.
              </span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={resetForm}>Annuler</Button>
            <Button type="button" onClick={handleSubmit} disabled={!depenseFaite || epouxCreancier === epouxDebiteur || valeursManquantes || saving}>
              {saving ? 'Enregistrement...' : 'Ajouter la créance'}
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={() => setIsAdding(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une créance
        </Button>
      )}
    </div>
  );
}
