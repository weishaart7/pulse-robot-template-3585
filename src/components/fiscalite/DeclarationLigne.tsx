import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';

/**
 * Lignes de saisie communes aux formulaires 2042 (montant, case à cocher,
 * texte libre), déclinées en variante déclarant 1/2 ou case unique.
 *
 * `items-start` (pas `items-end`) est déterminant : la colonne libellé n'a
 * qu'une ligne quand les colonnes de saisie en ont deux (petit libellé de
 * code + champ), et `items-end` alignait donc le libellé principal en bas —
 * visuellement collé aux champs plutôt qu'au-dessus, avec les libellés de
 * code livrés seuls en haut.
 */
const LIGNE_CLASSNAME = 'grid grid-cols-1 sm:grid-cols-[1fr_8rem_8rem] items-start gap-2 sm:gap-3 rounded-md border border-border/50 bg-muted/40 px-2.5 py-1.5';
const LIGNE_UNIQUE_CLASSNAME = 'flex flex-wrap items-start gap-2 sm:gap-3 rounded-md border border-border/50 bg-muted/40 px-2.5 py-1.5';

export const AideTooltip = ({ texte }: { texte: string }) => (
  <Tooltip>
    <TooltipTrigger type="button" className="text-muted-foreground hover:text-foreground">
      <HelpCircle className="h-3.5 w-3.5" />
    </TooltipTrigger>
    <TooltipContent className="max-w-xs">{texte}</TooltipContent>
  </Tooltip>
);

/** En-tête de colonnes « Déclarant 1 / Déclarant 2 », affiché une fois au-dessus de la liste des lignes. */
export const DeclarantsHeader = () => (
  <div className="hidden sm:grid grid-cols-[1fr_8rem_8rem] gap-4 px-3 text-xs font-medium text-muted-foreground">
    <span />
    <span className="text-center">Déclarant 1</span>
    <span className="text-center">Déclarant 2</span>
  </div>
);

const LigneLabel = ({ label, extra, aide }: { label: string; extra?: string; aide?: string }) => (
  <div className="flex items-center gap-1.5 pt-1.5 sm:pt-1">
    <Label className="text-sm">
      {label}
      {extra && <span className="text-muted-foreground font-normal"> ({extra})</span>}
    </Label>
    {aide && <AideTooltip texte={aide} />}
  </div>
);

interface MontantLigneProps {
  label: string;
  extra?: string;
  aide?: string;
  code1: string;
  code2: string;
  value1: number | null;
  value2: number | null;
  onChange1: (value: number | null) => void;
  onChange2: (value: number | null) => void;
}

/** Ligne montant déclarant 1/déclarant 2 (ex. 1AJ/1BJ). */
export const MontantLigne = ({ label, extra, aide, code1, code2, value1, value2, onChange1, onChange2 }: MontantLigneProps) => {
  const parse = (raw: string): number | null => (raw === '' ? null : Number(raw));

  return (
    <div className={LIGNE_CLASSNAME}>
      <LigneLabel label={label} extra={extra} aide={aide} />
      <div className="space-y-0.5">
        <Label className="text-xs text-muted-foreground">Déclarant 1 · {code1}</Label>
        <Input
          id={`case-${code1}`}
          type="number"
          className="w-full sm:w-28"
          value={value1 ?? ''}
          onChange={ev => onChange1(parse(ev.target.value))}
        />
      </div>
      <div className="space-y-0.5">
        <Label className="text-xs text-muted-foreground">Déclarant 2 · {code2}</Label>
        <Input
          id={`case-${code2}`}
          type="number"
          className="w-full sm:w-28"
          value={value2 ?? ''}
          onChange={ev => onChange2(parse(ev.target.value))}
        />
      </div>
    </div>
  );
};

interface SingleMontantLigneProps {
  label: string;
  extra?: string;
  aide?: string;
  code: string;
  value: number | null;
  onChange: (value: number | null) => void;
}

/** Ligne montant à case unique, sans colonne déclarant 2 (ex. 1TZ). */
export const SingleMontantLigne = ({ label, extra, aide, code, value, onChange }: SingleMontantLigneProps) => {
  const parse = (raw: string): number | null => (raw === '' ? null : Number(raw));

  return (
    <div className={LIGNE_UNIQUE_CLASSNAME}>
      <div className="flex-1 min-w-[180px]">
        <LigneLabel label={label} extra={extra} aide={aide} />
      </div>
      <div className="space-y-0.5">
        <Label className="text-xs text-muted-foreground">{code}</Label>
        <Input
          id={`case-${code}`}
          type="number"
          className="w-36"
          value={value ?? ''}
          onChange={ev => onChange(parse(ev.target.value))}
        />
      </div>
    </div>
  );
};

interface CaseLigneProps {
  label: string;
  extra?: string;
  aide?: string;
  code1: string;
  code2: string;
  checked1: boolean;
  checked2: boolean;
  onChange1: (value: boolean) => void;
  onChange2: (value: boolean) => void;
}

/** Ligne case à cocher déclarant 1/déclarant 2 (ex. 1AV/1BV). */
export const CaseLigne = ({ label, extra, aide, code1, code2, checked1, checked2, onChange1, onChange2 }: CaseLigneProps) => (
  <div className="grid grid-cols-1 sm:grid-cols-[1fr_8rem_8rem] items-center gap-2 sm:gap-3 rounded-md border border-border/50 bg-muted/40 px-2.5 py-1.5">
    <div className="flex items-center gap-1.5">
      <Label className="text-sm font-normal">
        {label}
        {extra && <span className="text-muted-foreground"> ({extra})</span>}
      </Label>
      {aide && <AideTooltip texte={aide} />}
    </div>
    <div className="flex items-center gap-2">
      <Checkbox id={`case-${code1}`} checked={checked1} onCheckedChange={c => onChange1(!!c)} />
      <Label htmlFor={`case-${code1}`} className="text-xs text-muted-foreground">Déclarant 1 · {code1}</Label>
    </div>
    <div className="flex items-center gap-2">
      <Checkbox id={`case-${code2}`} checked={checked2} onCheckedChange={c => onChange2(!!c)} />
      <Label htmlFor={`case-${code2}`} className="text-xs text-muted-foreground">Déclarant 2 · {code2}</Label>
    </div>
  </div>
);

export interface TrancheAge {
  ageLabel: string;
  code: string;
  value: number | null;
  onChange: (value: number | null) => void;
}

interface MontantParTrancheAgeLigneProps {
  label: string;
  aide?: string;
  /** Une entrée par tranche d'âge (ordre d'affichage), pas par déclarant — ex. rentes viagères à titre onéreux. */
  tranches: TrancheAge[];
}

/**
 * Ligne montant ventilée par tranche d'âge du foyer (ex. rentes viagères à
 * titre onéreux, art. 158 6 CGI), pas par déclarant 1/2 — structure propre à
 * ce mécanisme, distincte de MontantLigne. Le libellé principal est sur sa
 * propre ligne au-dessus des tranches plutôt qu'à côté (4 colonnes ne
 * laisseraient pas assez de place pour un libellé souvent long).
 */
export const MontantParTrancheAgeLigne = ({ label, aide, tranches }: MontantParTrancheAgeLigneProps) => {
  const parse = (raw: string): number | null => (raw === '' ? null : Number(raw));

  return (
    <div className="space-y-2 rounded-md border border-border/50 bg-muted/40 px-2.5 py-1.5">
      <div className="flex items-center gap-1.5">
        <Label className="text-sm">{label}</Label>
        {aide && <AideTooltip texte={aide} />}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {tranches.map(tranche => (
          <div key={tranche.code} className="space-y-0.5">
            <Label className="text-xs text-muted-foreground">{tranche.ageLabel} · {tranche.code}</Label>
            <Input
              id={`case-${tranche.code}`}
              type="number"
              className="w-full"
              value={tranche.value ?? ''}
              onChange={ev => tranche.onChange(parse(ev.target.value))}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

interface TexteLigneProps {
  label: string;
  code1: string;
  code2: string;
  value1: string | null;
  value2: string | null;
  onChange1: (value: string | null) => void;
  onChange2: (value: string | null) => void;
}

/** Ligne texte libre déclarant 1/déclarant 2 (ex. RSE/RSF). */
export const TexteLigne = ({ label, code1, code2, value1, value2, onChange1, onChange2 }: TexteLigneProps) => {
  const parse = (raw: string): string | null => (raw === '' ? null : raw);

  return (
    <div className={LIGNE_CLASSNAME}>
      <LigneLabel label={label} />
      <div className="space-y-0.5">
        <Label className="text-xs text-muted-foreground">Déclarant 1 · {code1}</Label>
        <Input
          id={`case-${code1}`}
          type="text"
          className="w-full"
          value={value1 ?? ''}
          onChange={ev => onChange1(parse(ev.target.value))}
        />
      </div>
      <div className="space-y-0.5">
        <Label className="text-xs text-muted-foreground">Déclarant 2 · {code2}</Label>
        <Input
          id={`case-${code2}`}
          type="text"
          className="w-full"
          value={value2 ?? ''}
          onChange={ev => onChange2(parse(ev.target.value))}
        />
      </div>
    </div>
  );
};
