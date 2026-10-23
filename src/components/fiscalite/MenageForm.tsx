import { useEffect, useState, type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { AddButton } from '@/components/layout/workspace-panel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import { useFoyerFiscal } from '@/hooks/useFoyerFiscal';
import { FoyerFiscal } from '@/services/foyerFiscalService';
import { EnfantCharge, FoyerFiscalInput, PersonneInvalideCharge } from '@/lib/fiscalite';
import { AideTooltip, SousGroupe } from './DeclarationLigne';
import { Cadre2042, Cadre2042Chargement } from './Cadre2042';

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
  onChange?: (foyer: FoyerFiscalInput) => void;
}

export const MenageForm = ({ onSaved, onChange }: MenageFormProps) => {
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

  useEffect(() => {
    onChange?.(foyer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foyer]);

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
    return <Cadre2042Chargement texte="Chargement du foyer fiscal..." />;
  }

  return (
    <Cadre2042
      titre="Ménage — état civil et parts"
      description="Situation du foyer au 1er janvier : elle détermine le nombre de parts du quotient familial, recalculé en direct à droite."
      saving={saving}
      onSave={handleSubmit}
    >
      <SousGroupe titre="Situation du foyer">
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 py-4 sm:grid-cols-2">
          <ChampMenage label="Situation familiale">
            <Select value={foyer.situationFamille} onValueChange={v => update('situationFamille', v as FoyerFiscalInput['situationFamille'])}>
              <SelectTrigger className="rounded-[2px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SITUATION_FAMILLE_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ChampMenage>
          <ChampMenage label="Lieu de résidence fiscale">
            <Select value={foyer.lieuResidence} onValueChange={v => update('lieuResidence', v as FoyerFiscalInput['lieuResidence'])}>
              <SelectTrigger className="rounded-[2px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LIEU_RESIDENCE_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ChampMenage>
        </div>
      </SousGroupe>

      <SousGroupe titre="Enfants à charge">
        {foyer.enfantsCharge.length === 0 && <LigneVide>Aucun enfant à charge saisi.</LigneVide>}
        {foyer.enfantsCharge.map((e, index) => (
          <div key={index} className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border/50 py-2.5">
            <span className="w-16 text-[13px] font-medium text-foreground">Enfant {index + 1}</span>
            <ChampMenage label="Né(e) en" inline>
              <Input
                type="number"
                className="w-24 rounded-[2px] tabular-nums"
                value={e.anneeNaissance}
                onChange={ev => updateEnfant(index, { anneeNaissance: Number(ev.target.value) })}
              />
            </ChampMenage>
            <CaseACocher
              id={`enfant-${index}-invalide`}
              checked={e.invalide}
              onCheckedChange={c => updateEnfant(index, { invalide: c })}
              label="En situation d'invalidité"
            />
            <CaseACocher
              id={`enfant-${index}-alternee`}
              checked={e.residenceAlternee}
              onCheckedChange={c => updateEnfant(index, { residenceAlternee: c })}
              label="Résidence alternée"
            />
            <button type="button" aria-label={`Supprimer l'enfant ${index + 1}`} onClick={() => supprimerEnfant(index)} className="ml-auto rounded-[2px] p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-4 py-3">
          <ChampMenage label="Enfants majeurs rattachés" aide="Enfant majeur qui demande son rattachement à votre déclaration plutôt que de déclarer ses propres revenus." inline>
            <Input
              type="number"
              min={0}
              className="w-20 rounded-[2px] tabular-nums"
              value={foyer.enfantsMajeursRattaches}
              onChange={ev => update('enfantsMajeursRattaches', Math.max(0, Number(ev.target.value)))}
            />
          </ChampMenage>
          <AddButton tone="citron" onClick={ajouterEnfant}>Ajouter un enfant</AddButton>
        </div>
      </SousGroupe>

      <SousGroupe titre="Autres personnes invalides à charge (hors enfants)">
        {foyer.personnesInvalidesCharge.length === 0 && <LigneVide>Aucune personne saisie.</LigneVide>}
        {foyer.personnesInvalidesCharge.map((p, index) => (
          <div key={index} className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border/50 py-2.5">
            <span className="w-16 text-[13px] font-medium text-foreground">Personne {index + 1}</span>
            <ChampMenage label="Né(e) en" inline>
              <Input
                type="number"
                className="w-24 rounded-[2px] tabular-nums"
                value={p.anneeNaissance}
                onChange={ev => updatePersonneInvalide(index, { anneeNaissance: Number(ev.target.value) })}
              />
            </ChampMenage>
            <button type="button" aria-label={`Supprimer la personne ${index + 1}`} onClick={() => supprimerPersonneInvalide(index)} className="ml-auto rounded-[2px] p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <div className="flex justify-end py-3">
          <AddButton tone="citron" onClick={ajouterPersonneInvalide}>Ajouter une personne</AddButton>
        </div>
      </SousGroupe>

      <SousGroupe titre="Situations particulières">
        <CaseSituation code="T" id="parent-isole" checked={foyer.parentIsole} onCheckedChange={v => update('parentIsole', v)}
          label="Je vis seul(e) avec au moins un enfant à ma charge" />
        <CaseSituation code="L" id="ancien-parent-isole" checked={foyer.ancienParentIsole} onCheckedChange={v => update('ancienParentIsole', v)}
          label="J'ai élevé seul(e) un enfant pendant au moins 5 ans, ce n'est plus le cas aujourd'hui" />
        <CaseSituation code="P" id="invalidite-declarant1" checked={foyer.invaliditeDeclarant1} onCheckedChange={v => update('invaliditeDeclarant1', v)}
          label="Vous êtes en situation d'invalidité" />
        {estCouple && (
          <CaseSituation code="F" id="invalidite-declarant2" checked={foyer.invaliditeDeclarant2} onCheckedChange={v => update('invaliditeDeclarant2', v)}
            label="Votre conjoint(e) est en situation d'invalidité" />
        )}
        <CaseSituation code="W" id="ancien-combattant-declarant1" checked={foyer.ancienCombattantDeclarant1} onCheckedChange={v => update('ancienCombattantDeclarant1', v)}
          label="Vous êtes ancien(ne) combattant(e) ou titulaire d'une pension militaire d'invalidité, âgé(e) de plus de 74 ans" />
        {estCouple && (
          <CaseSituation code="S" id="ancien-combattant-declarant2" checked={foyer.ancienCombattantDeclarant2} onCheckedChange={v => update('ancienCombattantDeclarant2', v)}
            label="Votre conjoint(e) est dans cette situation" />
        )}
        <CaseSituation code="W" id="veuf-ancien-combattant" checked={foyer.veufAncienCombattant} onCheckedChange={v => update('veufAncienCombattant', v)}
          label="Vous êtes veuf/veuve d'un(e) ancien(ne) combattant(e) décédé(e) après 74 ans" />
        <CaseSituation code="G" id="veuve-de-guerre" checked={foyer.veuveDeGuerre} onCheckedChange={v => update('veuveDeGuerre', v)}
          label="Vous êtes titulaire d'une pension de veuve de guerre" />
      </SousGroupe>
    </Cadre2042>
  );
};

const ChampMenage = ({ label, aide, inline, children }: { label: string; aide?: string; inline?: boolean; children: ReactNode }) => (
  <div className={inline ? 'flex items-center gap-2.5' : 'space-y-1.5'}>
    <span className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
      {label}
      {aide && <AideTooltip texte={aide} />}
    </span>
    {children}
  </div>
);

const LigneVide = ({ children }: { children: ReactNode }) => (
  <p className="border-b border-border/50 py-3 text-[13px] text-muted-foreground">{children}</p>
);

interface CaseACocherProps {
  id: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  label: string;
}

const CaseACocher = ({ id, checked, onCheckedChange, label }: CaseACocherProps) => (
  <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-[13px] font-normal text-foreground">
    <Checkbox id={id} checked={checked} onCheckedChange={c => onCheckedChange(!!c)} />
    {label}
  </label>
);

/** Case du cadre A de la 2042 : libellé à gauche, lettre de la case et case à cocher à droite. */
const CaseSituation = ({ code, ...props }: CaseACocherProps & { code: string }) => (
  <label htmlFor={props.id} className="grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border/50 py-2.5 font-normal">
    <span className="text-[13px] leading-5 text-foreground">{props.label}</span>
    <span className="flex items-center gap-2">
      <span className="rounded-[2px] bg-lagon-soft px-1.5 text-[11px] font-medium text-lagon-ink">{code}</span>
      <Checkbox id={props.id} checked={props.checked} onCheckedChange={c => props.onCheckedChange(!!c)} />
    </span>
  </label>
);

export default MenageForm;
