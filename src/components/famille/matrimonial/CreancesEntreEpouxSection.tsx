import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, AlertTriangle, ChevronDown } from 'lucide-react';
import { useCreancesEntreEpoux } from '@/hooks/useCreancesEntreEpoux';
import { useAssets } from '@/hooks/useAssets';
import { CreanceEntreEpoux, EpouxConcerne, NatureDepense, ModeEvaluationConventionnel } from '@/types/creanceEntreEpoux';

const NATURE_LABELS: Record<NatureDepense, string> = {
  acquisition: 'Acquisition',
  conservation: 'Conservation',
  amelioration: 'Amélioration',
  autre: 'Autre',
};

// Sous-choix de la question 1 (achat/amélioration/conservation d'un bien) —
// les 3 natures qualifiantes, hors 'autre'.
const NATURE_BIEN_OPTIONS: NatureDepense[] = ['acquisition', 'conservation', 'amelioration'];

type NatureChoice = 'bien' | 'autre' | null;
type OuiNon = 'oui' | 'non' | null;
type ModeOverride = 'nominal' | null;

export function CreancesEntreEpouxSection() {
  const { data: creances, saving, addCreance, removeCreance } = useCreancesEntreEpoux();
  const { assets } = useAssets();
  const [isAdding, setIsAdding] = useState(false);

  const [epouxCreancier, setEpouxCreancier] = useState<EpouxConcerne>('user');
  const [epouxDebiteur, setEpouxDebiteur] = useState<EpouxConcerne>('spouse');
  const [bienConcerneId, setBienConcerneId] = useState<string>('');

  // Question 1 : à quoi a servi la dépense (+ sous-question si "bien").
  const [natureChoice, setNatureChoice] = useState<NatureChoice>(null);
  const [natureDetail, setNatureDetail] = useState<NatureDepense | null>(null);

  const [depenseFaite, setDepenseFaite] = useState('');

  // Question : l'utilisateur connaît-il la valeur du bien avant/après ?
  // (Pas de question "dépense nécessaire" ici : depense_necessaire n'existe
  // que sur recompenses, art. 1479 al. 2 ne prévoit pas ce mécanisme pour les
  // créances entre époux — cf. Chantier 3.)
  const [connaitValeurs, setConnaitValeurs] = useState<OuiNon>(null);
  const [valeurBienAvant, setValeurBienAvant] = useState('');
  const [valeurBienApres, setValeurBienApres] = useState('');

  // Clause particulière (repliée par défaut) : seule alternative possible
  // pour une créance entre époux est le nominal (pas de mode 'plafonne').
  const [clauseOuverte, setClauseOuverte] = useState(false);
  const [modeOverride, setModeOverride] = useState<ModeOverride>(null);

  const resetForm = () => {
    setEpouxCreancier('user');
    setEpouxDebiteur('spouse');
    setBienConcerneId('');
    setNatureChoice(null);
    setNatureDetail(null);
    setDepenseFaite('');
    setConnaitValeurs(null);
    setValeurBienAvant('');
    setValeurBienApres('');
    setClauseOuverte(false);
    setModeOverride(null);
    setIsAdding(false);
  };

  const natureResolue: NatureDepense | null =
    natureChoice === 'autre' ? 'autre' : natureChoice === 'bien' ? natureDetail : null;

  const modeEvaluation: ModeEvaluationConventionnel =
    connaitValeurs === 'oui' ? (modeOverride ?? 'profit_subsistant') : 'nominal';

  const valeursManquantes = modeEvaluation !== 'nominal' && (!valeurBienAvant || !valeurBienApres);

  const peutSoumettre = !!depenseFaite && epouxCreancier !== epouxDebiteur && !!natureResolue && !!connaitValeurs && !valeursManquantes;

  const handleSubmit = async () => {
    const depense = Number(depenseFaite);
    if (!depense || epouxCreancier === epouxDebiteur || !natureResolue || !connaitValeurs) return;

    await addCreance({
      epoux_creancier: epouxCreancier,
      epoux_debiteur: epouxDebiteur,
      bien_concerne_id: bienConcerneId || null,
      depense_faite: depense,
      valeur_bien_avant: connaitValeurs === 'oui' && valeurBienAvant ? Number(valeurBienAvant) : null,
      valeur_bien_apres: connaitValeurs === 'oui' && valeurBienApres ? Number(valeurBienApres) : null,
      nature_depense: natureResolue,
      mode_evaluation_conventionnel: modeEvaluation,
    });
    resetForm();
  };

  const assetLabel = (id?: string | null) => assets?.find(a => a.id === id)?.denomination || 'Bien sans nom';
  const epouxLabel = (e: EpouxConcerne) => (e === 'user' ? 'vous' : 'conjoint');

  const describe = (c: CreanceEntreEpoux) =>
    `Créance de ${epouxLabel(c.epoux_creancier)} sur ${epouxLabel(c.epoux_debiteur)}`;

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

          <div className="space-y-1">
            <Label className="text-xs">Bien concerné (facultatif)</Label>
            <Select value={bienConcerneId || '__none__'} onValueChange={(v) => setBienConcerneId(v === '__none__' ? '' : v)}>
              <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Aucun</SelectItem>
                {assets?.map(a => (
                  <SelectItem key={a.id} value={a.id!}>{a.denomination || 'Bien sans nom'}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Question 1 */}
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-sm font-medium">
              Cette dépense a-t-elle servi à acheter, améliorer ou conserver un bien, ou s'agit-il d'une autre dépense (dette du ménage, etc.) ?
            </Label>
            <RadioGroup
              value={natureChoice ?? undefined}
              onValueChange={(v) => {
                setNatureChoice(v as NatureChoice);
                if (v === 'autre') setNatureDetail(null);
              }}
              className="gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bien" id="creance-nature-choice-bien" />
                <Label htmlFor="creance-nature-choice-bien" className="text-sm font-normal cursor-pointer">
                  Achat, amélioration ou conservation d'un bien
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="autre" id="creance-nature-choice-autre" />
                <Label htmlFor="creance-nature-choice-autre" className="text-sm font-normal cursor-pointer">
                  Autre dépense (dette du ménage, etc.)
                </Label>
              </div>
            </RadioGroup>

            {natureChoice === 'bien' && (
              <div className="pl-6 pt-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Laquelle ?</Label>
                <Select value={natureDetail ?? undefined} onValueChange={(v) => setNatureDetail(v as NatureDepense)}>
                  <SelectTrigger className="max-w-xs"><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>
                    {NATURE_BIEN_OPTIONS.map(n => (
                      <SelectItem key={n} value={n}>{NATURE_LABELS[n]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Dépense faite, une fois la nature résolue */}
          {natureResolue && (
            <div className="space-y-1 max-w-xs">
              <Label className="text-xs">Dépense faite (€)</Label>
              <Input type="number" value={depenseFaite} onChange={(e) => setDepenseFaite(e.target.value)} placeholder="Ex : 40 000" />
            </div>
          )}

          {/* Question suivante, une fois la dépense faite renseignée */}
          {natureResolue && !!depenseFaite && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Connaissez-vous la valeur du bien avant et après la dépense ?
              </Label>
              <RadioGroup value={connaitValeurs ?? undefined} onValueChange={(v) => setConnaitValeurs(v as OuiNon)} className="gap-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="oui" id="creance-connait-valeurs-oui" />
                  <Label htmlFor="creance-connait-valeurs-oui" className="text-sm font-normal cursor-pointer">Oui</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="non" id="creance-connait-valeurs-non" />
                  <Label htmlFor="creance-connait-valeurs-non" className="text-sm font-normal cursor-pointer">Non</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {connaitValeurs === 'oui' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Valeur du bien avant (€)</Label>
                <Input type="number" value={valeurBienAvant} onChange={(e) => setValeurBienAvant(e.target.value)} placeholder="Ex : 200 000" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Valeur du bien après (€)</Label>
                <Input type="number" value={valeurBienApres} onChange={(e) => setValeurBienApres(e.target.value)} placeholder="Ex : 260 000" />
              </div>
            </div>
          )}

          {/* Clause particulière, repliée par défaut */}
          {connaitValeurs === 'oui' && (
            <Collapsible open={clauseOuverte} onOpenChange={setClauseOuverte}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="h-auto p-0 text-xs text-muted-foreground hover:bg-transparent">
                  <ChevronDown className={`h-3 w-3 mr-1 transition-transform ${clauseOuverte ? 'rotate-180' : ''}`} />
                  Convention contraire des parties
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 space-y-1">
                <Label className="text-xs">Les parties ont-elles convenu d'une évaluation nominale plutôt que le profit subsistant ?</Label>
                <Select value={modeOverride ?? '__defaut__'} onValueChange={(v) => setModeOverride(v === '__defaut__' ? null : v as ModeOverride)}>
                  <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__defaut__">Non, profit subsistant (défaut légal, art. 1479 al. 2)</SelectItem>
                    <SelectItem value="nominal">Oui, évaluation nominale</SelectItem>
                  </SelectContent>
                </Select>
              </CollapsibleContent>
            </Collapsible>
          )}

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
            <Button type="button" onClick={handleSubmit} disabled={!peutSoumettre || saving}>
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
