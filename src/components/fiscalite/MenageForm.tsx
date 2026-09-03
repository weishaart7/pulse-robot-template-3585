import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { useFoyerFiscal } from '@/hooks/useFoyerFiscal';
import { FoyerFiscal } from '@/services/foyerFiscalService';
import { EnfantCharge, FoyerFiscalInput, PersonneInvalideCharge } from '@/lib/fiscalite';

const SITUATION_FAMILLE_OPTIONS: { value: FoyerFiscalInput['situationFamille']; label: string }[] = [
  { value: 'marie', label: 'Marié(e)' },
  { value: 'pacse', label: 'Pacsé(e)' },
  { value: 'celibataire', label: 'Célibataire' },
  { value: 'divorce', label: 'Divorcé(e)' },
  { value: 'veuf', label: 'Veuf(ve)' },
];

const LIEU_RESIDENCE_OPTIONS: { value: FoyerFiscalInput['lieuResidence']; label: string }[] = [
  { value: 'metropole', label: 'Métropole' },
  { value: 'guadeloupe_martinique_reunion', label: 'Guadeloupe, Martinique, La Réunion' },
  { value: 'guyane_mayotte', label: 'Guyane, Mayotte' },
];

const FOYER_VIDE: FoyerFiscalInput = {
  situationFamille: 'celibataire',
  lieuResidence: 'metropole',
  enfantsCharge: [],
  personnesInvalidesCharge: [],
  enfantsMajeursRattaches: 0,
  parentIsole: false,
  ancienParentIsole: false,
  invaliditeDeclarant1: false,
  invaliditeDeclarant2: false,
  ancienCombattantDeclarant1: false,
  ancienCombattantDeclarant2: false,
  veufAncienCombattant: false,
  veuveDeGuerre: false,
};

function enfantVide(): EnfantCharge {
  return { anneeNaissance: new Date().getFullYear(), invalide: false, residenceAlternee: false };
}

function personneInvalideVide(): PersonneInvalideCharge {
  return { anneeNaissance: new Date().getFullYear() };
}

interface MenageFormProps {
  onSaved?: (foyer: FoyerFiscal) => void;
}

export const MenageForm = ({ onSaved }: MenageFormProps) => {
  const { data, loading, saving, saveData } = useFoyerFiscal();
  const [foyer, setFoyer] = useState<FoyerFiscalInput>(FOYER_VIDE);
  const [foyerId, setFoyerId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (data) {
      const { id, ...input } = data;
      setFoyer(input);
      setFoyerId(id);
    }
  }, [data]);

  const estCouple = foyer.situationFamille === 'marie' || foyer.situationFamille === 'pacse';

  const update = <K extends keyof FoyerFiscalInput>(key: K, value: FoyerFiscalInput[K]) => {
    setFoyer(prev => ({ ...prev, [key]: value }));
  };

  const updateEnfant = (index: number, patch: Partial<EnfantCharge>) => {
    setFoyer(prev => ({
      ...prev,
      enfantsCharge: prev.enfantsCharge.map((e, i) => (i === index ? { ...e, ...patch } : e)),
    }));
  };

  const ajouterEnfant = () => {
    setFoyer(prev => ({ ...prev, enfantsCharge: [...prev.enfantsCharge, enfantVide()] }));
  };

  const supprimerEnfant = (index: number) => {
    setFoyer(prev => ({ ...prev, enfantsCharge: prev.enfantsCharge.filter((_, i) => i !== index) }));
  };

  const updatePersonneInvalide = (index: number, patch: Partial<PersonneInvalideCharge>) => {
    setFoyer(prev => ({
      ...prev,
      personnesInvalidesCharge: prev.personnesInvalidesCharge.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    }));
  };

  const ajouterPersonneInvalide = () => {
    setFoyer(prev => ({ ...prev, personnesInvalidesCharge: [...prev.personnesInvalidesCharge, personneInvalideVide()] }));
  };

  const supprimerPersonneInvalide = (index: number) => {
    setFoyer(prev => ({
      ...prev,
      personnesInvalidesCharge: prev.personnesInvalidesCharge.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    const saved = await saveData({ ...foyer, id: foyerId });
    setFoyerId(saved.id);
    onSaved?.(saved);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Chargement du foyer fiscal...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Votre foyer fiscal</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Votre situation familiale</Label>
            <Select value={foyer.situationFamille} onValueChange={v => update('situationFamille', v as FoyerFiscalInput['situationFamille'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SITUATION_FAMILLE_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Lieu de résidence fiscale</Label>
            <Select value={foyer.lieuResidence} onValueChange={v => update('lieuResidence', v as FoyerFiscalInput['lieuResidence'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LIEU_RESIDENCE_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Enfants à charge */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Enfants à charge</Label>
            <Button type="button" variant="outline" size="sm" onClick={ajouterEnfant}>
              <Plus className="h-4 w-4 mr-1" /> Ajouter un enfant
            </Button>
          </div>

          {foyer.enfantsCharge.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun enfant à charge saisi.</p>
          )}

          {foyer.enfantsCharge.map((e, index) => (
            <div key={index} className="flex flex-wrap items-end gap-4 p-3 rounded-lg bg-muted/50">
              <div className="space-y-1">
                <Label className="text-xs">Année de naissance</Label>
                <Input
                  type="number"
                  className="w-28"
                  value={e.anneeNaissance}
                  onChange={ev => updateEnfant(index, { anneeNaissance: Number(ev.target.value) })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`enfant-${index}-invalide`}
                  checked={e.invalide}
                  onCheckedChange={c => updateEnfant(index, { invalide: !!c })}
                />
                <Label htmlFor={`enfant-${index}-invalide`} className="text-sm font-normal">
                  Enfant en situation d'invalidité
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`enfant-${index}-alternee`}
                  checked={e.residenceAlternee}
                  onCheckedChange={c => updateEnfant(index, { residenceAlternee: !!c })}
                />
                <Label htmlFor={`enfant-${index}-alternee`} className="text-sm font-normal">
                  Garde alternée (résidence alternée)
                </Label>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => supprimerEnfant(index)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Label>Nombre d'enfants majeurs rattachés à votre foyer fiscal</Label>
          <p className="text-xs text-muted-foreground">
            Un enfant majeur qui demande son rattachement à votre déclaration plutôt que de déclarer ses propres revenus.
          </p>
          <Input
            type="number"
            min={0}
            className="w-28"
            value={foyer.enfantsMajeursRattaches}
            onChange={ev => update('enfantsMajeursRattaches', Math.max(0, Number(ev.target.value)))}
          />
        </div>

        <Separator />

        {/* Personnes invalides à charge (hors enfant) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Autres personnes invalides à votre charge (hors enfants)</Label>
            <Button type="button" variant="outline" size="sm" onClick={ajouterPersonneInvalide}>
              <Plus className="h-4 w-4 mr-1" /> Ajouter une personne
            </Button>
          </div>

          {foyer.personnesInvalidesCharge.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucune personne saisie.</p>
          )}

          {foyer.personnesInvalidesCharge.map((p, index) => (
            <div key={index} className="flex flex-wrap items-end gap-4 p-3 rounded-lg bg-muted/50">
              <div className="space-y-1">
                <Label className="text-xs">Année de naissance</Label>
                <Input
                  type="number"
                  className="w-28"
                  value={p.anneeNaissance}
                  onChange={ev => updatePersonneInvalide(index, { anneeNaissance: Number(ev.target.value) })}
                />
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => supprimerPersonneInvalide(index)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        <Separator />

        {/* Cases à cocher */}
        <div className="space-y-3">
          <CaseACocher
            id="parent-isole"
            checked={foyer.parentIsole}
            onCheckedChange={v => update('parentIsole', v)}
            label="Je vis seul(e) avec au moins un enfant à ma charge"
          />
          <CaseACocher
            id="ancien-parent-isole"
            checked={foyer.ancienParentIsole}
            onCheckedChange={v => update('ancienParentIsole', v)}
            label="J'ai élevé seul(e) un enfant pendant au moins 5 ans, mais ce n'est plus le cas aujourd'hui"
          />
          <CaseACocher
            id="invalidite-declarant1"
            checked={foyer.invaliditeDeclarant1}
            onCheckedChange={v => update('invaliditeDeclarant1', v)}
            label="Vous êtes en situation d'invalidité"
          />
          {estCouple && (
            <CaseACocher
              id="invalidite-declarant2"
              checked={foyer.invaliditeDeclarant2}
              onCheckedChange={v => update('invaliditeDeclarant2', v)}
              label="Votre conjoint(e) est en situation d'invalidité"
            />
          )}
          <CaseACocher
            id="ancien-combattant-declarant1"
            checked={foyer.ancienCombattantDeclarant1}
            onCheckedChange={v => update('ancienCombattantDeclarant1', v)}
            label="Vous êtes ancien(ne) combattant(e) ou titulaire d'une pension militaire d'invalidité, et âgé(e) de plus de 74 ans"
          />
          {estCouple && (
            <CaseACocher
              id="ancien-combattant-declarant2"
              checked={foyer.ancienCombattantDeclarant2}
              onCheckedChange={v => update('ancienCombattantDeclarant2', v)}
              label="Votre conjoint(e) est dans cette situation"
            />
          )}
          <CaseACocher
            id="veuf-ancien-combattant"
            checked={foyer.veufAncienCombattant}
            onCheckedChange={v => update('veufAncienCombattant', v)}
            label="Vous êtes veuf/veuve d'un(e) ancien(ne) combattant(e) décédé(e) après 74 ans"
          />
          <CaseACocher
            id="veuve-de-guerre"
            checked={foyer.veuveDeGuerre}
            onCheckedChange={v => update('veuveDeGuerre', v)}
            label="Vous êtes titulaire d'une pension de veuve de guerre"
          />
        </div>

        <Button type="button" onClick={handleSubmit} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Enregistrer
        </Button>
      </CardContent>
    </Card>
  );
};

interface CaseACocherProps {
  id: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  label: string;
}

const CaseACocher = ({ id, checked, onCheckedChange, label }: CaseACocherProps) => (
  <div className="flex items-center gap-2">
    <Checkbox id={id} checked={checked} onCheckedChange={c => onCheckedChange(!!c)} />
    <Label htmlFor={id} className="text-sm font-normal">{label}</Label>
  </div>
);

export default MenageForm;
