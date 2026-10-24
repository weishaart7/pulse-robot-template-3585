import type { ReactNode } from 'react';
import { AlertTriangle, EyeOff, RotateCcw, Trash2 } from 'lucide-react';
import { AddButton } from '@/components/layout/workspace-panel';
import { PanelCard, PanelCardDescription, PanelCardHeader, PanelCardTitle, panelInsetClass } from '@/components/layout/panel-section';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AideTooltip } from '@/components/fiscalite/DeclarationLigne';
import { cn } from '@/lib/utils';
import { SEUIL_EXONERATION_RURALE, type CategorieBienIFI, type DeclarationIFIResultat } from '@/lib/fiscalite/calculerDeclarationIFI';
import type { useDeclarationIFI } from '@/hooks/useDeclarationIFI';
import { formatEuros, MontantCellule } from '../2044/Grille2044';

// Sections de la 2042-IFI. L'actif est groupé par case du Cerfa (sous-total déclaré et imposable),
// chaque ligne montre ce qui est réellement imposé ; les points à vérifier sont portés par la ligne
// concernée plutôt que listés à part.

type EtatIFI = ReturnType<typeof useDeclarationIFI>;

/** Structure teintée sur page blanche : en-têtes de groupe en taupe soutenu, totaux en taupe clair. */
const fondGroupe = 'bg-[#ebe6e0]';
const fondTotal = 'bg-secondary';

/** Valeur stockée en base pour la catégorie d'un actif ('indirect' = 9CA), dans l'ordre du Cerfa. */
const CATEGORIES = [
  { value: 'residencePrincipale', code: '9AA', label: 'Résidence principale', regle: 'abattement de 30 %' },
  { value: 'autreBati', code: '9AB', label: 'Autres immeubles bâtis' },
  { value: 'boisForets', code: '9AC', label: 'Bois, forêts, groupements forestiers', regle: 'exonérés à 75 %' },
  { value: 'biensRurauxBailLongTerme', code: '9AD', label: 'Biens ruraux loués à long terme', regle: `75 % jusqu’à ${formatEuros(SEUIL_EXONERATION_RURALE)}, 50 % au-delà` },
  { value: 'partsGfaGaf', code: '9BA', label: 'Parts de GFA et de GAF', regle: `75 % jusqu’à ${formatEuros(SEUIL_EXONERATION_RURALE)}, 50 % au-delà` },
  { value: 'autreNonBati', code: '9BB', label: 'Autres biens non bâtis' },
  { value: 'indirect', code: '9CA', label: 'Biens détenus indirectement', regle: 'seule la fraction représentative d’immeubles est imposable, 100 % retenu par défaut' },
] as const;

const enBase = (categorie: string | undefined) => categorie ?? 'indirect';

function CodeCase({ children, attenue }: { children: ReactNode; attenue?: boolean }) {
  return (
    <span className={cn(
      'inline-flex h-5 shrink-0 items-center rounded-[2px] px-1.5 text-[11.5px] font-medium tabular-nums',
      attenue ? 'bg-secondary text-muted-foreground' : 'bg-lagon-soft text-lagon-ink',
    )}>
      {children}
    </span>
  );
}

function ChoixCellule({ value, options, onChange, ariaLabel }: {
  value: string;
  options: readonly { value: string; code: string; label: string }[];
  onChange: (v: string) => void;
  ariaLabel: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label={ariaLabel}
        className="rounded-[2px] border-transparent bg-transparent px-2 text-[13px] text-muted-foreground shadow-none hover:border-border hover:text-foreground hover:bg-background data-[state=open]:border-lagon data-[state=open]:bg-background [&>svg]:opacity-40 hover:[&>svg]:opacity-100"
      >
        <SelectValue>{options.find((o) => o.value === value)?.label}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            <span className="mr-1.5 tabular-nums text-muted-foreground">{o.code}</span>{o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Dénomination éditable, pastille « relié à Patrimoine », points à vérifier sous le nom. */
function Denomination({ value, relie, notes, onCommit }: { value: string; relie: boolean; notes: string[]; onCommit: (v: string) => void }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5" title={relie ? 'Relié à Patrimoine : montants préremplis' : 'Saisie libre'}>
        <span aria-hidden className={cn('h-1.5 w-1.5 shrink-0 rounded-full', relie ? 'bg-lagon' : 'bg-border')} />
        <input
          aria-label="Dénomination"
          defaultValue={value}
          key={value}
          onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== value) onCommit(v); }}
          className="h-7 min-w-0 flex-1 rounded-[2px] border border-transparent bg-transparent px-1.5 text-[13px] font-medium text-foreground hover:border-border focus:border-lagon focus:outline-none"
        />
      </div>
      {notes.map((n, i) => (
        <p key={i} className="ml-3 mt-1 flex w-fit items-start gap-1.5 rounded-[2px] bg-citron-soft px-1.5 py-1 text-[11.5px] leading-4 text-citron-ink">
          <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
          <span>{n}</span>
        </p>
      ))}
    </div>
  );
}

/** Ligne préremplie : l'écarter (réversible) ; saisie libre : la supprimer. */
function ActionLigne({ relie, exclu, libelle, onExclure, onSupprimer }: {
  relie: boolean;
  exclu: boolean;
  libelle: string;
  onExclure: (exclu: boolean) => void;
  onSupprimer: () => void;
}) {
  const cls = 'rounded-[2px] p-1 text-muted-foreground hover:bg-secondary hover:text-foreground';
  if (!relie) {
    return (
      <button type="button" aria-label={`Supprimer ${libelle}`} title="Supprimer" onClick={onSupprimer} className={cn(cls, 'hover:text-destructive')}>
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    );
  }
  return exclu ? (
    <button type="button" aria-label={`Réintégrer ${libelle}`} title="Réintégrer dans la déclaration" onClick={() => onExclure(false)} className={cls}>
      <RotateCcw className="h-3.5 w-3.5" />
    </button>
  ) : (
    <button type="button" aria-label={`Écarter ${libelle}`} title="Écarter de la déclaration" onClick={() => onExclure(true)} className={cls}>
      <EyeOff className="h-3.5 w-3.5" />
    </button>
  );
}

function EnTete({ colonnes }: { colonnes: { label: ReactNode; className?: string }[] }) {
  return (
    <thead>
      <tr className="border-b border-foreground/20">
        {colonnes.map((c, i) => (
          <th key={i} className={cn('pb-2.5 whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground', i === 0 ? 'pl-2 text-left' : 'px-1 text-right', c.className)}>
            {c.label}
          </th>
        ))}
        <th className="w-8" />
      </tr>
    </thead>
  );
}

/** Pied de tableau : total en gras sur filet foncé. */
function LignePied({ libelle, valeur, colSpan, aide, fort }: { libelle: ReactNode; valeur: number; colSpan: number; aide?: string; fort?: boolean }) {
  return (
    <tr className={cn(fondTotal, fort ? 'border-y border-foreground/20' : 'border-t border-border/60')}>
      <td colSpan={colSpan} className={cn('px-2 py-2.5 text-[13px]', fort ? 'font-medium text-foreground' : 'text-muted-foreground')}>
        <span className="inline-flex items-center gap-1.5">{libelle}{aide && <AideTooltip texte={aide} />}</span>
      </td>
      <td className={cn('px-1 py-2.5 pr-3 text-right tabular-nums', fort ? 'text-[14px] font-medium text-foreground' : 'text-[13px] text-muted-foreground')}>
        {formatEuros(valeur)}
      </td>
      <td />
    </tr>
  );
}

/** Numéro d'étape dans le titre de section. */
function Etape({ n, children }: { n: number; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="text-muted-foreground tabular-nums">{n}.</span>
      {children}
    </span>
  );
}

export function ActifSection({ etat, annee }: { etat: EtatIFI; annee: number }) {
  const { actifs, lignes, resultat: r, modifierActif, supprimerActif, ajouterActif } = etat;
  const lignesActif = actifs.map((record, i) => ({ record, l: lignes.actifs[i], p: etat.prerempliActifs[record.id] }));
  const groupes = CATEGORIES.map((c) => {
    const membres = lignesActif.filter(({ l }) => enBase(l.categorie) === c.value);
    const taux = c.value === 'indirect' ? 1 : r.tauxImposable[c.value as CategorieBienIFI];
    const retenues = membres.filter(({ l }) => !l.exclu);
    const declare = retenues.reduce((s, { l }) => s + l.valeur * ((l.fractionTaxable ?? 100) / 100), 0);
    return { ...c, membres, taux, declare, imposable: declare * taux };
  }).filter((g) => g.membres.length > 0);
  const nbColonnes = 5;

  return (
    <PanelCard className="py-8">
      <PanelCardHeader className="mb-6 flex items-start justify-between gap-6">
        <div>
          <PanelCardTitle><Etape n={1}>Actif imposable au 1er janvier {annee}</Etape></PanelCardTitle>
          <PanelCardDescription className="max-w-3xl">
            Annexes 2 et 3. Biens de Patrimoine repris à la part du foyer et à leur valeur estimée : une saisie remplace la valeur reprise (en gras), la flèche y revient.
          </PanelCardDescription>
        </div>
        <AddButton onClick={ajouterActif}>Ajouter un bien</AddButton>
      </PanelCardHeader>

      {actifs.length === 0 ? (
        <p className={cn(panelInsetClass, 'text-[13px] text-muted-foreground')}>Aucun bien immobilier dans Patrimoine.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-[13px]">
            <EnTete colonnes={[
              { label: 'Bien' },
              { label: 'Case', className: 'w-72 text-left' },
              { label: 'Valeur vénale', className: 'w-36' },
              { label: 'Part taxable', className: 'w-28' },
              { label: 'Imposable', className: 'w-32 pr-3' },
            ]} />
            {groupes.map((g, gi) => (
              <tbody key={g.value}>
                {gi > 0 && <tr aria-hidden><td colSpan={nbColonnes + 1} className="h-4" /></tr>}
                <tr className={cn(fondGroupe, 'border-y border-border')}>
                  <td colSpan={4} className="px-2 py-2.5">
                    <span className="flex items-center gap-2">
                      <CodeCase>{g.code}</CodeCase>
                      <span className="font-medium text-foreground">{g.label}</span>
                      {'regle' in g && <span className="text-[12px] text-muted-foreground">· {g.regle}</span>}
                    </span>
                  </td>
                  <td className="px-1 py-2.5 pr-3 text-right font-medium tabular-nums text-foreground">{formatEuros(Math.round(g.imposable))}</td>
                  <td />
                </tr>
                {g.membres.map(({ record, l, p }) => {
                  const relie = !!record.asset_id;
                  const imposable = l.valeur * ((l.fractionTaxable ?? 100) / 100) * g.taux;
                  return (
                    <tr key={record.id} className={cn('border-b border-border/50 align-middle', l.exclu && 'opacity-45')}>
                      <td className="py-2 pl-2 pr-3">
                        <Denomination
                          value={l.denomination}
                          relie={relie}
                          notes={l.exclu ? [] : l.aVerifier}
                          onCommit={(v) => modifierActif(record.id, { denomination: v })}
                        />
                      </td>
                      <td className="px-1 py-2">
                        <ChoixCellule
                          ariaLabel={`Case — ${l.denomination}`}
                          value={enBase(l.categorie)}
                          options={CATEGORIES}
                          onChange={(v) => modifierActif(record.id, { categorie: p && v === enBase(p.categorie) ? null : v })}
                        />
                      </td>
                      <td className="px-1 py-2">
                        <MontantCellule
                          ariaLabel={`Valeur — ${l.denomination}`}
                          value={record.valeur === null ? null : Number(record.valeur)}
                          prerempli={p?.valeur}
                          suffixe="€"
                          onCommit={(v) => modifierActif(record.id, { valeur: v })}
                        />
                      </td>
                      <td className="px-1 py-2">
                        <MontantCellule
                          ariaLabel={`Part taxable — ${l.denomination}`}
                          value={record.fraction_taxable === null ? null : Number(record.fraction_taxable)}
                          prerempli={100}
                          discret
                          suffixe="%"
                          onCommit={(v) => modifierActif(record.id, { fraction_taxable: v === null ? null : Math.min(100, v) })}
                        />
                      </td>
                      <td className="px-1 py-2 pr-3 text-right font-medium tabular-nums text-foreground">
                        {l.exclu ? <span className="text-[12px] text-muted-foreground">Écarté</span> : formatEuros(Math.round(imposable))}
                      </td>
                      <td className="w-10 py-2 pr-1 text-right">
                        <ActionLigne
                          relie={relie}
                          exclu={record.exclu}
                          libelle={l.denomination}
                          onExclure={(exclu) => modifierActif(record.id, { exclu })}
                          onSupprimer={() => supprimerActif(record.id)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            ))}
            <tfoot>
              <tr aria-hidden><td colSpan={nbColonnes + 1} className="h-3" /></tr>
              {r.exonerationsPartielles > 0 && (
                <LignePied libelle="dont exonérations partielles (bois, forêts, biens ruraux, GFA/GAF)" valeur={-r.exonerationsPartielles} colSpan={nbColonnes - 1} />
              )}
              <LignePied libelle="Actif imposable" valeur={r.actifBrut} colSpan={nbColonnes - 1} fort />
            </tfoot>
          </table>
        </div>
      )}
    </PanelCard>
  );
}

const LIGNES_DETTE = [
  { value: '9GH', code: '9GH', label: 'Autres dettes' },
  { value: '9GF', code: '9GF', label: 'Dettes de travaux' },
] as const;

export function PassifSection({ etat, annee }: { etat: EtatIFI; annee: number }) {
  const { dettes, lignes, declaration, resultat: r, modifierDette, supprimerDette, ajouterDette, modifierDeclaration } = etat;
  const deduireTheorique = declaration?.deduire_ifi_theorique ?? true;
  const nbColonnes = 4;

  return (
    <PanelCard className="py-8">
      <PanelCardHeader className="mb-6 flex items-start justify-between gap-6">
        <div>
          <PanelCardTitle><Etape n={2}>Passif et autres déductions</Etape></PanelCardTitle>
          <PanelCardDescription className="max-w-3xl">
            Annexe 4. Emprunts reliés à un bien imposable, au capital restant dû au 1er janvier {annee} et à la part du foyer. Sur un bien partiellement exonéré, la dette n’est déduite qu’à proportion de la part imposable ; un prêt in fine est déduit de façon dégressive.
          </PanelCardDescription>
        </div>
        <AddButton onClick={ajouterDette}>Ajouter une dette</AddButton>
      </PanelCardHeader>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-[13px]">
          <EnTete colonnes={[
            { label: 'Dette' },
            { label: 'Ligne', className: 'w-44 text-left' },
            { label: 'Bien financé', className: 'w-60 text-left' },
            { label: 'Restant dû', className: 'w-36 pr-3' },
          ]} />
          <tbody>
            {dettes.map((record, i) => {
              const l = lignes.dettes[i];
              const p = etat.prerempliDettes[record.id];
              const relie = !!record.emprunt_id;
              const notes = [
                ...(l.exclue ? [] : l.aVerifier),
                ...(p?.inFine && record.montant === null
                  ? [`Prêt in fine : ${p.inFine.anneesEcoulees} an(s) écoulé(s) sur ${p.inFine.dureeAnnees}, déduction dégressive.`]
                  : []),
              ];
              return (
                <tr key={record.id} className={cn('border-b border-border/50 align-middle', l.exclue && 'opacity-45')}>
                  <td className="py-2 pl-2 pr-3">
                    <Denomination value={l.denomination} relie={relie} notes={notes} onCommit={(v) => modifierDette(record.id, { denomination: v })} />
                  </td>
                  <td className="px-1 py-2">
                    <ChoixCellule
                      ariaLabel={`Ligne — ${l.denomination}`}
                      value={l.ligne}
                      options={LIGNES_DETTE}
                      onChange={(v) => modifierDette(record.id, { ligne: p && v === p.ligne ? null : v })}
                    />
                  </td>
                  <td className="px-1 py-2">
                    <ChoixCellule
                      ariaLabel={`Bien financé — ${l.denomination}`}
                      value={enBase(l.categorieBien)}
                      options={CATEGORIES}
                      onChange={(v) => modifierDette(record.id, { categorie_bien: p && v === enBase(p.categorieBien) ? null : v })}
                    />
                  </td>
                  <td className="px-1 py-2">
                    <MontantCellule
                      ariaLabel={`Restant dû — ${l.denomination}`}
                      value={record.montant === null ? null : Number(record.montant)}
                      prerempli={p ? (p.inFine ? undefined : p.montant) : undefined}
                      suffixe="€"
                      onCommit={(v) => modifierDette(record.id, { montant: v })}
                    />
                  </td>
                  <td className="w-10 py-2 pr-1 text-right">
                    <ActionLigne
                      relie={relie}
                      exclu={record.exclue}
                      libelle={l.denomination}
                      onExclure={(exclue) => modifierDette(record.id, { exclue })}
                      onSupprimer={() => supprimerDette(record.id)}
                    />
                  </td>
                </tr>
              );
            })}
            <tr className={cn('border-b border-border/60', !deduireTheorique && 'opacity-60')}>
              <td colSpan={nbColonnes - 1} className="py-3 pl-2 pr-3">
                <label className="flex cursor-pointer items-start gap-2">
                  <Checkbox
                    checked={deduireTheorique}
                    onCheckedChange={(v) => modifierDeclaration({ deduire_ifi_theorique: v === true })}
                    className="mt-0.5"
                    aria-label="Déduire l’IFI théorique"
                  />
                  <span>
                    <span className="font-medium text-foreground">IFI théorique</span>
                    <span className="ml-1.5 text-muted-foreground">· 9GH</span>
                    <span className="block text-[11.5px] text-muted-foreground">
                      Impôt calculé sur l’actif net des autres dettes, avant sa propre déduction.
                    </span>
                  </span>
                </label>
              </td>
              <td className="px-1 py-3 pr-3 text-right font-medium tabular-nums text-foreground">{formatEuros(r.ifiTheorique)}</td>
              <td />
            </tr>
          </tbody>
          <tfoot>
            <tr aria-hidden><td colSpan={nbColonnes + 1} className="h-3" /></tr>
            {r.case9GF > 0 && <LignePied libelle="9GF · Dettes afférentes aux travaux" valeur={r.case9GF} colSpan={nbColonnes - 1} />}
            {r.plafonnementDettes > 0 && (
              <LignePied
                libelle="dont réduction pour plafonnement des dettes"
                aide="Actif supérieur à 5 M€ : les dettes au-delà de 60 % de l’actif ne sont déductibles qu’à moitié (art. 974 III)."
                valeur={-r.plafonnementDettes}
                colSpan={nbColonnes - 1}
              />
            )}
            <LignePied libelle="Passif déductible (9GF + 9GH)" valeur={r.case9GF + r.case9GH} colSpan={nbColonnes - 1} fort />
          </tfoot>
        </table>
      </div>
    </PanelCard>
  );
}

function ChampCase({ code, libelle, aide, value, prerempli, onCommit }: {
  code: string;
  libelle: string;
  aide?: string;
  value: number | null;
  prerempli?: number;
  onCommit: (v: number | null) => void;
}) {
  return (
    <div className="grid grid-cols-[3.25rem_1fr_11rem] items-center gap-3 border-b border-border/50 py-2 text-[13px]">
      {code ? <CodeCase>{code}</CodeCase> : <span />}
      <span className="inline-flex items-center gap-1.5 text-foreground">{libelle}{aide && <AideTooltip texte={aide} />}</span>
      <MontantCellule ariaLabel={`${code} — ${libelle}`} value={value} prerempli={prerempli} suffixe="€" onCommit={onCommit} />
    </div>
  );
}

const nombre = (v: number | string | null | undefined) => (v === null || v === undefined ? null : Number(v));

export function ReductionsSection({ etat, annee }: { etat: EtatIFI; annee: number }) {
  const { declaration, depuis2042, modifierDeclaration, resultat: r } = etat;
  if (!declaration) return null;
  const sansRevenus = r.case9PX === null;
  return (
    <PanelCard className="py-8">
      <PanelCardHeader className="mb-6">
        <PanelCardTitle><Etape n={3}>Dons et plafonnement</Etape></PanelCardTitle>
        <PanelCardDescription className="max-w-3xl">
          {depuis2042
            ? `9PR et 9PX sont repris du calcul de l’impôt sur les revenus ${annee - 1} (Vision générale) ; une saisie les remplace.`
            : `Impôts et revenus ${annee - 1} à saisir d’après l’avis d’impôt sur le revenu.`}
        </PanelCardDescription>
      </PanelCardHeader>
      {!depuis2042 && sansRevenus && (
        <div className="mb-4 flex max-w-2xl items-start gap-2 rounded-[2px] bg-citron-soft px-3 py-2.5 text-[12.5px] text-citron-ink">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Foyer non renseigné dans la 2042 : 9PR et 9PX ne sont pas repris. Complétez la 2042 ou saisissez-les ; sans 9PX, le plafonnement n’est pas calculé.
          </span>
        </div>
      )}
      <div className="max-w-2xl">
        <ChampCase code="9NC" libelle="Dons à des organismes d’intérêt général en France" aide="Réduction de 75 % du don, plafonnée à 50 000 €."
          value={nombre(declaration.dons_france)} onCommit={(v) => modifierDeclaration({ dons_france: v })} />
        <ChampCase code="9NG" libelle="Dons à des organismes d’un autre État européen"
          value={nombre(declaration.dons_ue)} onCommit={(v) => modifierDeclaration({ dons_ue: v })} />
        <ChampCase code="9PR" libelle={`Impôts dus au titre des revenus ${annee - 1}`}
          aide="IR au barème avant crédits d’impôt représentatifs d’un impôt étranger, impôts à taux proportionnel et prélèvements sociaux. Sans l’IFI, ajouté automatiquement."
          value={nombre(declaration.impots_revenus_n1)} prerempli={depuis2042?.impots} onCommit={(v) => modifierDeclaration({ impots_revenus_n1: v })} />
        <ChampCase code="9PX" libelle={`Revenus ${annee - 1} déclarés sur la 2042`}
          aide="Revenus nets de frais professionnels, avant abattements (dividendes avant l’abattement de 40 %, plus-values avant abattements pour durée de détention). Repris du revenu fiscal de référence : à corriger notamment pour les pensions (avant abattement de 10 %)."
          value={nombre(declaration.revenus_n1)} prerempli={depuis2042?.revenus} onCommit={(v) => modifierDeclaration({ revenus_n1: v })} />
        <ChampCase code="" libelle="Revenus hors 2042, ajoutés à 9PX"
          aide="Revenus exonérés (livrets, plus-values exonérées…), revenus perçus à l’étranger nets de frais, produits soumis à prélèvement libératoire."
          value={nombre(declaration.revenus_hors_2042)} onCommit={(v) => modifierDeclaration({ revenus_hors_2042: v })} />
      </div>
    </PanelCard>
  );
}

function LigneCalcul({ libelle, valeur, aide, fort, detail }: { libelle: ReactNode; valeur: number; aide?: string; fort?: boolean; detail?: boolean }) {
  return (
    <div className={cn(
      'grid grid-cols-[1fr_auto] items-baseline gap-4 border-b px-2 py-2',
      fort ? cn(fondTotal, 'border-foreground/20 font-medium text-foreground') : 'border-border/60',
      detail ? 'pl-4 text-[12.5px] text-muted-foreground' : 'text-[13px]',
    )}>
      <span className="inline-flex items-center gap-1.5">{libelle}{aide && <AideTooltip texte={aide} />}</span>
      <span className={cn('tabular-nums', valeur < 0 && !fort && 'text-muted-foreground')}>{formatEuros(valeur)}</span>
    </div>
  );
}

export function LiquidationSection({ resultat: r }: { resultat: DeclarationIFIResultat }) {
  return (
    <PanelCard className="py-8">
      <PanelCardHeader className="mb-6">
        <PanelCardTitle><Etape n={4}>Calcul de l’impôt</Etape></PanelCardTitle>
        <PanelCardDescription className="max-w-3xl">
          Barème de l’article 977, décote entre 1,3 et 1,4 M€, réduction pour dons, puis plafonnement à 75 % des revenus.
        </PanelCardDescription>
      </PanelCardHeader>
      <div className="max-w-xl">
        <LigneCalcul libelle="Actif imposable" valeur={r.actifBrut} />
        <LigneCalcul libelle="Passif déductible" valeur={-(r.case9GF + r.case9GH)} />
        <LigneCalcul libelle="Patrimoine net taxable" valeur={r.patrimoineNet} fort />
        {!r.assujetti ? (
          <p className={cn(panelInsetClass, 'mt-3 text-[12.5px] text-muted-foreground')}>
            Patrimoine net inférieur ou égal à 1 300 000 € : pas d’IFI à déclarer.
          </p>
        ) : (
          <>
            {r.tranches.filter((t) => t.taux > 0).map((t) => (
              <LigneCalcul
                key={t.min}
                detail
                libelle={`${(t.taux * 100).toLocaleString('fr-FR')} % sur ${formatEuros(t.base)} (de ${formatEuros(t.min)} à ${Number.isFinite(t.max) ? formatEuros(t.max) : '…'})`}
                valeur={Math.round(t.impot)}
              />
            ))}
            <LigneCalcul libelle="Impôt selon le barème" valeur={r.impotBareme} />
            {r.decote > 0 && <LigneCalcul libelle="Décote" valeur={-r.decote} />}
            {r.reductionDons > 0 && <LigneCalcul libelle="Réduction pour dons" valeur={-r.reductionDons} />}
            {r.seuilPlafonnement !== null && (
              <LigneCalcul
                libelle="Plafonnement"
                aide={`IFI et impôts sur les revenus limités à 75 % des revenus, soit ${formatEuros(r.seuilPlafonnement)} ; impôts sur les revenus : ${formatEuros(r.case9PR)}.`}
                valeur={-r.reductionPlafonnement}
              />
            )}
          </>
        )}
        <div className="mt-3 flex items-baseline justify-between rounded-[2px] bg-lagon-soft px-3 py-2.5 text-lagon-ink">
          <span className="text-[13px] font-medium">IFI net à payer</span>
          <span className="text-[18px] font-medium tabular-nums tracking-[-0.01em]">{formatEuros(r.ifiNet)}</span>
        </div>
      </div>
    </PanelCard>
  );
}
