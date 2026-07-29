import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Trash2, Plus, AlertTriangle, Info, ChevronDown, Wand2 } from 'lucide-react';
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

// Sous-choix de la question 1 (achat/amélioration/conservation d'un bien) —
// les 3 natures qualifiantes de l'art. 1469 al. 3, hors 'autre'.
const NATURE_BIEN_OPTIONS: NatureDepense[] = ['acquisition', 'conservation', 'amelioration'];

type NatureChoice = 'bien' | 'autre' | null;
type OuiNon = 'oui' | 'non' | null;
type ModeOverride = 'nominal' | 'plafonne' | null;

export function RecompensesSection() {
  const { data: recompenses, saving, addRecompense, removeRecompense } = useRecompenses();
  const { assets } = useAssets();
  const [isAdding, setIsAdding] = useState(false);

  const [sens, setSens] = useState<SensRecompense>('epoux_vers_communaute');
  const [epoux, setEpoux] = useState<EpouxConcerne>('user');
  const [bienConcerneId, setBienConcerneId] = useState<string>('');

  // Question 1 : à quoi a servi la dépense (+ sous-question si "bien").
  const [natureChoice, setNatureChoice] = useState<NatureChoice>(null);
  const [natureDetail, setNatureDetail] = useState<NatureDepense | null>(null);

  // Question 2 (Chantier 3) : dépense nécessaire, indépendante de la nature.
  const [depenseNecessaire, setDepenseNecessaire] = useState(false);

  const [depenseFaite, setDepenseFaite] = useState('');

  // Question 3 : l'utilisateur connaît-il les valeurs du bien ?
  const [connaitValeurs, setConnaitValeurs] = useState<OuiNon>(null);
  const [valeurBienAcquisition, setValeurBienAcquisition] = useState('');
  const [valeurBienLiquidation, setValeurBienLiquidation] = useState('');

  // Question 4 : clause particulière du contrat de mariage (repliée par défaut).
  const [clauseOuverte, setClauseOuverte] = useState(false);
  const [modeOverride, setModeOverride] = useState<ModeOverride>(null);

  const resetForm = () => {
    setSens('epoux_vers_communaute');
    setEpoux('user');
    setBienConcerneId('');
    setNatureChoice(null);
    setNatureDetail(null);
    setDepenseNecessaire(false);
    setDepenseFaite('');
    setConnaitValeurs(null);
    setValeurBienAcquisition('');
    setValeurBienLiquidation('');
    setClauseOuverte(false);
    setModeOverride(null);
    setIsAdding(false);
  };

  const natureResolue: NatureDepense | null =
    natureChoice === 'autre' ? 'autre' : natureChoice === 'bien' ? natureDetail : null;

  // Mode effectif : profit subsistant par défaut dès que les valeurs sont
  // connues (défaut légal, art. 1469), sauf clause contraire ouverte ;
  // nominal si les valeurs ne sont pas connues (cohérent avec la question 3).
  const modeEvaluation: ModeEvaluationConventionnel =
    connaitValeurs === 'oui' ? (modeOverride ?? 'profit_subsistant') : 'nominal';

  const valeursManquantes = modeEvaluation !== 'nominal' && (!valeurBienAcquisition || !valeurBienLiquidation);

  const peutSoumettre = !!depenseFaite && !!natureResolue && !!connaitValeurs && !valeursManquantes;

  const handleSubmit = async () => {
    const depense = Number(depenseFaite);
    if (!depense || !natureResolue || !connaitValeurs) return;

    await addRecompense({
      sens,
      epoux,
      bien_concerne_id: bienConcerneId || null,
      depense_faite: depense,
      valeur_bien_acquisition: connaitValeurs === 'oui' && valeurBienAcquisition ? Number(valeurBienAcquisition) : null,
      valeur_bien_liquidation: connaitValeurs === 'oui' && valeurBienLiquidation ? Number(valeurBienLiquidation) : null,
      nature_depense: natureResolue,
      depense_necessaire: depenseNecessaire,
      mode_evaluation_conventionnel: modeEvaluation,
    });
    resetForm();
  };

  const assetLabel = (id?: string | null) => assets?.find(a => a.id === id)?.denomination || 'Bien sans nom';

  const describe = (r: Recompense) => `${SENS_LABELS[r.sens]} (${r.epoux === 'user' ? 'vous' : 'conjoint'})`;

  // Chantier 2 : biens avec financement mixte déclaré (assets.financement_mixte_apport_propre)
  // sans récompense déjà enregistrée pour ce bien — comparaison purement
  // côté client, assets et recompenses sont déjà chargés par les hooks
  // ci-dessus, aucune requête supplémentaire nécessaire.
  const biensFinancementMixteNonCouverts = (assets || []).filter(a =>
    a.financement_mixte_apport_propre != null
    && a.financement_mixte_apport_propre > 0
    && !recompenses.some(r => r.bien_concerne_id === a.id)
  );

  // Pré-remplit uniquement le bien concerné et la dépense faite (hypothèse
  // nature_depense = 'acquisition', cf. résumé de chantier) ; tous les autres
  // champs (sens, époux, dépense nécessaire, valeurs du bien, mode
  // d'évaluation) restent à la charge de l'utilisateur via le flux habituel
  // du Chantier 4 — aucune ligne recompenses n'est créée avant sa validation
  // explicite du formulaire.
  const prefillFromAsset = (assetId: string, montant: number) => {
    setBienConcerneId(assetId);
    setDepenseFaite(String(montant));
    setNatureChoice('bien');
    setNatureDetail('acquisition');
    setIsAdding(true);
  };

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

      {!isAdding && biensFinancementMixteNonCouverts.length > 0 && (
        <div className="rounded-md border border-dashed p-4 mb-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Financement mixte déclaré sans récompense associée
          </p>
          <div className="flex flex-col gap-2">
            {biensFinancementMixteNonCouverts.map(a => (
              <Button
                key={a.id}
                type="button"
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => prefillFromAsset(a.id!, a.financement_mixte_apport_propre!)}
              >
                <Wand2 className="h-3.5 w-3.5 mr-2 shrink-0" />
                Créer la récompense correspondant à {a.denomination || 'ce bien'}
              </Button>
            ))}
          </div>
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
                <RadioGroupItem value="bien" id="nature-choice-bien" />
                <Label htmlFor="nature-choice-bien" className="text-sm font-normal cursor-pointer">
                  Achat, amélioration ou conservation d'un bien
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="autre" id="nature-choice-autre" />
                <Label htmlFor="nature-choice-autre" className="text-sm font-normal cursor-pointer">
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

          {/* Question 2 : dépense nécessaire (Chantier 3), une fois la nature résolue */}
          {natureResolue && (
            <div className="flex items-center gap-2">
              <Checkbox id="depense-necessaire" checked={depenseNecessaire} onCheckedChange={(v) => setDepenseNecessaire(v === true)} />
              <Label htmlFor="depense-necessaire" className="text-xs font-normal cursor-pointer">
                Cette dépense était-elle indispensable, indépendamment de son lien avec un bien ?
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p className="text-sm">
                      Par exemple : régler une dette alimentaire du ménage, ou une dépense d'urgence, avec des fonds propres. À cocher indépendamment du fait que la dépense concerne ou non un bien précis.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}

          {/* Dépense faite, une fois la nature résolue */}
          {natureResolue && (
            <div className="space-y-1 max-w-xs">
              <Label className="text-xs">Dépense faite (€)</Label>
              <Input type="number" value={depenseFaite} onChange={(e) => setDepenseFaite(e.target.value)} placeholder="Ex : 100 000" />
            </div>
          )}

          {/* Question 3, une fois la dépense faite renseignée */}
          {natureResolue && !!depenseFaite && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Connaissez-vous la valeur du bien à l'acquisition et à la liquidation (ou aujourd'hui) ?
              </Label>
              <RadioGroup value={connaitValeurs ?? undefined} onValueChange={(v) => setConnaitValeurs(v as OuiNon)} className="gap-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="oui" id="connait-valeurs-oui" />
                  <Label htmlFor="connait-valeurs-oui" className="text-sm font-normal cursor-pointer">Oui</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="non" id="connait-valeurs-non" />
                  <Label htmlFor="connait-valeurs-non" className="text-sm font-normal cursor-pointer">Non</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {connaitValeurs === 'oui' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Valeur du bien à l'acquisition (€)</Label>
                <Input type="number" value={valeurBienAcquisition} onChange={(e) => setValeurBienAcquisition(e.target.value)} placeholder="Ex : 200 000" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Valeur du bien à la liquidation (€)</Label>
                <Input type="number" value={valeurBienLiquidation} onChange={(e) => setValeurBienLiquidation(e.target.value)} placeholder="Ex : 500 000" />
              </div>
            </div>
          )}

          {/* Question 4 : clause particulière, repliée par défaut */}
          {connaitValeurs === 'oui' && (
            <Collapsible open={clauseOuverte} onOpenChange={setClauseOuverte}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="h-auto p-0 text-xs text-muted-foreground hover:bg-transparent">
                  <ChevronDown className={`h-3 w-3 mr-1 transition-transform ${clauseOuverte ? 'rotate-180' : ''}`} />
                  Clause particulière du contrat de mariage
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 space-y-1">
                <Label className="text-xs">Le contrat de mariage prévoit-il une évaluation différente (nominal, plafonnée) ?</Label>
                <Select value={modeOverride ?? '__defaut__'} onValueChange={(v) => setModeOverride(v === '__defaut__' ? null : v as ModeOverride)}>
                  <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__defaut__">Non, profit subsistant (défaut légal, art. 1469)</SelectItem>
                    <SelectItem value="nominal">Oui, évaluation nominale</SelectItem>
                    <SelectItem value="plafonne">Oui, évaluation plafonnée</SelectItem>
                  </SelectContent>
                </Select>
              </CollapsibleContent>
            </Collapsible>
          )}

          {valeursManquantes && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 text-xs">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                Il manque la valeur du bien à l'acquisition et/ou à la liquidation. Sans ces deux montants, le calcul retiendra la dépense telle quelle (montant nominal), même si vous avez choisi un autre mode d'évaluation ci-dessus.
              </span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={resetForm}>Annuler</Button>
            <Button type="button" onClick={handleSubmit} disabled={!peutSoumettre || saving}>
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
