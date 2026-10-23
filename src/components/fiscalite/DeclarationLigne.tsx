import { useEffect, useState, type ReactNode } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Lignes de saisie communes aux formulaires 2042 (montant, case à cocher, texte libre), déclinées en
 * variante déclarant 1/2 ou case unique. Format panneau de travail, comme la 2044 et la 2042-IFI :
 * une ligne par case du Cerfa séparée par un filet, libellé à gauche, champs alignés dans les
 * colonnes « Déclarant 1 / Déclarant 2 » (en-tête unique, `DeclarantsHeader`), code de la case porté
 * par le champ lui-même plutôt que répété au-dessus.
 */
const GRILLE_DECLARANTS = 'sm:grid-cols-[minmax(0,1fr)_9rem_9rem] xl:grid-cols-[minmax(0,1fr)_10.5rem_10.5rem]';
const LIGNE = 'grid grid-cols-1 items-center gap-x-4 gap-y-2 border-b border-border/50 py-2.5';

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
  <div className={cn('hidden gap-x-4 border-b border-foreground/20 pb-2.5 text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground sm:grid', GRILLE_DECLARANTS)}>
    <span>Case</span>
    <span className="text-right">Déclarant 1</span>
    <span className="text-right">Déclarant 2</span>
  </div>
);

const LigneLabel = ({ label, extra, aide }: { label: string; extra?: string; aide?: string }) => (
  <div className="flex min-w-0 items-start gap-1.5">
    <span className="text-[13px] leading-5 text-foreground">
      {label}
      {extra && <span className="text-muted-foreground"> · {extra}</span>}
    </span>
    {aide && <span className="mt-0.5"><AideTooltip texte={aide} /></span>}
  </div>
);

const formater = (v: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(v);
const lire = (raw: string): number | null => {
  const propre = raw.replace(/[\s\u00a0\u202f]/g, '').replace(',', '.');
  if (propre === '') return null;
  const n = Number(propre);
  return Number.isNaN(n) ? null : n;
};

/** Code de la case du Cerfa, porté à gauche du champ. */
const CodeChamp = ({ code }: { code: string }) => (
  <span className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 rounded-[2px] bg-lagon-soft px-1 text-[11px] font-medium tabular-nums text-lagon-ink">
    {code}
  </span>
);

const champClass = cn(
  'h-9 w-full rounded-[2px] border border-border bg-background pl-12 pr-7 text-right text-[13px] tabular-nums text-foreground',
  'placeholder:text-muted-foreground/50 hover:border-foreground/30 focus:border-lagon focus:outline-none',
);

/** Champ montant d'une case : code à gauche, séparateur de milliers hors saisie, vide = NULL. */
export const CaseMontant = ({ code, value, onChange, ariaLabel }: {
  code: string;
  value: number | null;
  onChange: (value: number | null) => void;
  ariaLabel?: string;
}) => {
  const [focus, setFocus] = useState(false);
  const [brouillon, setBrouillon] = useState(value === null ? '' : String(value));
  useEffect(() => { if (!focus) setBrouillon(value === null ? '' : String(value)); }, [value, focus]);

  return (
    <div className="relative">
      <CodeChamp code={code} />
      <input
        id={`case-${code}`}
        type="text"
        inputMode="decimal"
        aria-label={ariaLabel ?? `Case ${code}`}
        placeholder="0"
        value={focus ? brouillon : value === null ? '' : formater(value)}
        onFocus={() => setFocus(true)}
        onChange={(ev) => { setBrouillon(ev.target.value); onChange(lire(ev.target.value)); }}
        onBlur={() => setFocus(false)}
        className={cn(champClass, value !== null && value !== 0 && 'font-medium')}
      />
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground">€</span>
    </div>
  );
};

/** Case à cocher d'une case du Cerfa, alignée à droite de sa colonne. */
const CaseCocher = ({ code, checked, onChange, libelle }: { code: string; checked: boolean; onChange: (v: boolean) => void; libelle?: string }) => (
  <label htmlFor={`case-${code}`} className="flex h-9 cursor-pointer items-center justify-end gap-2 font-normal">
    {libelle && <span className="text-[12px] text-muted-foreground sm:hidden">{libelle}</span>}
    <span className="rounded-[2px] bg-lagon-soft px-1 text-[11px] font-medium tabular-nums text-lagon-ink">{code}</span>
    <Checkbox id={`case-${code}`} checked={checked} onCheckedChange={(c) => onChange(!!c)} />
  </label>
);

/** Libellé de colonne visible seulement sur mobile (l'en-tête de colonnes est masqué). */
const ColonneMobile = ({ children }: { children: ReactNode }) => (
  <span className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground sm:hidden">{children}</span>
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
export const MontantLigne = ({ label, extra, aide, code1, code2, value1, value2, onChange1, onChange2 }: MontantLigneProps) => (
  <div className={cn(LIGNE, GRILLE_DECLARANTS)}>
    <LigneLabel label={label} extra={extra} aide={aide} />
    <div className="space-y-1"><ColonneMobile>Déclarant 1</ColonneMobile><CaseMontant code={code1} value={value1} onChange={onChange1} ariaLabel={`${label} — déclarant 1 (${code1})`} /></div>
    <div className="space-y-1"><ColonneMobile>Déclarant 2</ColonneMobile><CaseMontant code={code2} value={value2} onChange={onChange2} ariaLabel={`${label} — déclarant 2 (${code2})`} /></div>
  </div>
);

interface SingleMontantLigneProps {
  label: string;
  extra?: string;
  aide?: string;
  code: string;
  value: number | null;
  onChange: (value: number | null) => void;
}

/** Ligne montant à case unique, sans colonne déclarant 2 (ex. 1TZ) : le champ occupe la colonne Déclarant 1. */
export const SingleMontantLigne = ({ label, extra, aide, code, value, onChange }: SingleMontantLigneProps) => (
  <div className={cn(LIGNE, GRILLE_DECLARANTS)}>
    <LigneLabel label={label} extra={extra} aide={aide} />
    <CaseMontant code={code} value={value} onChange={onChange} ariaLabel={`${label} (${code})`} />
    <span className="hidden sm:block" />
  </div>
);

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
  <div className={cn(LIGNE, GRILLE_DECLARANTS)}>
    <LigneLabel label={label} extra={extra} aide={aide} />
    <CaseCocher code={code1} checked={checked1} onChange={onChange1} libelle="Déclarant 1" />
    <CaseCocher code={code2} checked={checked2} onChange={onChange2} libelle="Déclarant 2" />
  </div>
);

interface SingleCaseLigneProps {
  label: string;
  extra?: string;
  aide?: string;
  code: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

/** Ligne case à cocher unique, sans colonne déclarant 2 (ex. 2OP). */
export const SingleCaseLigne = ({ label, extra, aide, code, checked, onChange }: SingleCaseLigneProps) => (
  <div className={cn(LIGNE, GRILLE_DECLARANTS)}>
    <LigneLabel label={label} extra={extra} aide={aide} />
    <CaseCocher code={code} checked={checked} onChange={onChange} />
    <span className="hidden sm:block" />
  </div>
);

interface SousGroupeProps {
  titre: string;
  aide?: string;
  children: React.ReactNode;
}

/** Regroupement de plusieurs lignes sous un intertitre en bande taupe (ex. catégories du cadre 2). */
export const SousGroupe = ({ titre, aide, children }: SousGroupeProps) => (
  <div className="pt-4 first:pt-0">
    <div className="flex items-center gap-1.5 border-y border-border bg-[#ebe6e0] px-2 py-2.5">
      <p className="text-[13px] font-medium text-foreground">{titre}</p>
      {aide && <AideTooltip texte={aide} />}
    </div>
    <div>{children}</div>
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

/** Grille de sous-cases sous un libellé (tranches d'âge, années d'origine…). */
const LigneEclatee = ({ label, aide, items }: { label: string; aide?: string; items: { label: string; code: string; value: number | null; onChange: (v: number | null) => void }[] }) => (
  <div className="space-y-2.5 border-b border-border/50 py-3">
    <LigneLabel label={label} aide={aide} />
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.code} className="space-y-1">
          <span className="block text-[11.5px] text-muted-foreground">{item.label}</span>
          <CaseMontant code={item.code} value={item.value} onChange={item.onChange} ariaLabel={`${label} — ${item.label} (${item.code})`} />
        </div>
      ))}
    </div>
  </div>
);

/**
 * Ligne montant ventilée par tranche d'âge du foyer (ex. rentes viagères à titre onéreux, art. 158 6
 * CGI), pas par déclarant 1/2 — libellé au-dessus des tranches plutôt qu'à côté.
 */
export const MontantParTrancheAgeLigne = ({ label, aide, tranches }: MontantParTrancheAgeLigneProps) => (
  <LigneEclatee label={label} aide={aide} items={tranches.map((t) => ({ label: t.ageLabel, code: t.code, value: t.value, onChange: t.onChange }))} />
);

export interface MontantEclateItem {
  label: string;
  code: string;
  value: number | null;
  onChange: (value: number | null) => void;
}

interface MontantEclateLigneProps {
  label: string;
  aide?: string;
  /** Une entrée par sous-case affichée côte à côte (ex. par année), pas par déclarant. */
  items: MontantEclateItem[];
}

/** Ligne montant éclatée en sous-cases côte à côte (ex. déficits non imputés par année d'origine). */
export const MontantEclateLigne = ({ label, aide, items }: MontantEclateLigneProps) => (
  <LigneEclatee label={label} aide={aide} items={items} />
);

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
  const texte = (code: string, value: string | null, onChange: (v: string | null) => void) => (
    <div className="relative">
      <CodeChamp code={code} />
      <input
        id={`case-${code}`}
        type="text"
        aria-label={`${label} (${code})`}
        value={value ?? ''}
        onChange={(ev) => onChange(parse(ev.target.value))}
        className={cn(champClass, 'pr-2 text-left')}
      />
    </div>
  );
  return (
    <div className={cn(LIGNE, GRILLE_DECLARANTS)}>
      <LigneLabel label={label} />
      {texte(code1, value1, onChange1)}
      {texte(code2, value2, onChange2)}
    </div>
  );
};

/** Ligne en lecture seule à case unique : montant repris d'une autre déclaration (ex. 4BA depuis la 2044). */
export const LectureLigne = ({ label, extra, aide, code, value }: { label: string; extra?: string; aide?: string; code: string; value: number | null }) => (
  <div className={cn(LIGNE, GRILLE_DECLARANTS)}>
    <LigneLabel label={label} extra={extra} aide={aide} />
    <div className="flex items-center justify-between gap-2 rounded-[2px] border border-border/50 bg-muted/40 px-2 py-1.5 text-sm tabular-nums">
      <span className="rounded-[2px] bg-lagon-soft px-1 text-[11px] font-medium text-lagon-ink">{code}</span>
      <span>{value === null ? '—' : `${Math.round(value).toLocaleString('fr-FR')} €`}</span>
    </div>
    <span className="hidden sm:block" />
  </div>
);
