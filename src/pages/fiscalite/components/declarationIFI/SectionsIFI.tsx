import type { ReactNode } from 'react';
import { EyeOff, RotateCcw, Trash2 } from 'lucide-react';
import { AddButton } from '@/components/layout/workspace-panel';
import { PanelCard, PanelCardDescription, PanelCardHeader, PanelCardTitle, panelInsetClass } from '@/components/layout/panel-section';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AideTooltip } from '@/components/fiscalite/DeclarationLigne';
import { cn } from '@/lib/utils';
import { SEUIL_EXONERATION_RURALE, type DeclarationIFIResultat } from '@/lib/fiscalite/calculerDeclarationIFI';
import type { useDeclarationIFI } from '@/hooks/useDeclarationIFI';
import { ANNEE_IFI } from '@/hooks/useFiscalOverview';
import { formatEuros, MontantCellule } from '../2044/Grille2044';

type EtatIFI = ReturnType<typeof useDeclarationIFI>;

/** Valeur stockée en base pour la catégorie d'un actif ('indirect' = 9CA). */
const CATEGORIES = [
  { value: 'residencePrincipale', code: '9AA', label: 'Résidence principale (abattement de 30 %)' },
  { value: 'autreBati', code: '9AB', label: 'Autre immeuble bâti' },
  { value: 'boisForets', code: '9AC', label: 'Bois, forêts, groupements forestiers' },
  { value: 'biensRurauxBailLongTerme', code: '9AD', label: 'Biens ruraux loués à long terme' },
  { value: 'partsGfaGaf', code: '9BA', label: 'Parts de GFA et de GAF' },
  { value: 'autreNonBati', code: '9BB', label: 'Autre bien non bâti' },
  { value: 'indirect', code: '9CA', label: 'Parts ou actions (fraction immobilière)' },
] as const;

const enBase = (categorie: string | undefined) => categorie ?? 'indirect';

function ChoixCellule({ value, options, onChange, ariaLabel }: {
  value: string;
  options: readonly { value: string; code: string; label: string }[];
  onChange: (v: string) => void;
  ariaLabel: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={ariaLabel} className="h-7 rounded-[2px] border-transparent bg-transparent px-2 text-[12.5px] hover:border-border">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            <span className="tabular-nums text-muted-foreground">{o.code}</span> {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Denomination({ value, relie, onCommit }: { value: string; relie: boolean; onCommit: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1.5" title={relie ? 'Relié à Patrimoine : montants préremplis' : undefined}>
      {relie && <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-lagon" />}
      <input
        aria-label="Dénomination"
        defaultValue={value}
        key={value}
        onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== value) onCommit(v); }}
        className="h-7 min-w-0 flex-1 rounded-[2px] border border-transparent bg-transparent px-2 text-[13px] hover:border-border focus:border-lagon focus:outline-none"
      />
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
  const cls = 'rounded-[2px] p-1 text-muted-foreground hover:text-foreground';
  if (!relie) {
    return (
      <button type="button" aria-label={`Supprimer ${libelle}`} onClick={onSupprimer} className={cn(cls, 'hover:text-destructive')}>
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

function EnTete({ colonnes }: { colonnes: string[] }) {
  return (
    <thead>
      <tr className="border-b border-border">
        {colonnes.map((c, i) => (
          <th key={i} className={cn('py-2 text-[11.5px] font-medium text-muted-foreground', i === 0 ? 'text-left' : 'px-1 text-right')}>{c}</th>
        ))}
        <th className="w-8" />
      </tr>
    </thead>
  );
}

function LigneTotal({ code, libelle, valeur, fort }: { code: string; libelle: ReactNode; valeur: number; fort?: boolean }) {
  return (
    <div className={cn('grid grid-cols-[3rem_1fr_auto] items-baseline gap-2 border-b border-border/60 py-1.5 text-[13px]', fort && 'font-medium')}>
      <span className="tabular-nums text-muted-foreground">{code}</span>
      <span>{libelle}</span>
      <span className="tabular-nums">{formatEuros(valeur)}</span>
    </div>
  );
}

function Notes({ titre, lignes }: { titre: string; lignes: string[] }) {
  if (lignes.length === 0) return null;
  return (
    <div className={cn(panelInsetClass, 'mt-4 text-[12.5px] text-muted-foreground')}>
      <p className="font-medium text-foreground">{titre}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-4">{lignes.map((l, i) => <li key={i}>{l}</li>)}</ul>
    </div>
  );
}

export function ActifSection({ etat, annee }: { etat: EtatIFI; annee: number }) {
  const { actifs, lignes, resultat: r, modifierActif, supprimerActif, ajouterActif } = etat;
  const notes = lignes.actifs.filter((l) => !l.exclu).flatMap((l) => l.aVerifier.map((n) => `${l.denomination} : ${n}`));

  return (
    <PanelCard>
      <PanelCardHeader className="flex items-start justify-between gap-4">
        <div>
          <PanelCardTitle>Actif imposable au 1er janvier {annee}</PanelCardTitle>
          <PanelCardDescription>
            Annexes 2 et 3. Les biens immobiliers de Patrimoine sont préremplis (en grisé) à la part du foyer et à leur valeur estimée ; une saisie remplace la valeur préremplie. Les bois, forêts, biens ruraux et GFA/GAF se déclarent avant exonération.
          </PanelCardDescription>
        </div>
        <AddButton onClick={ajouterActif}>Ajouter un bien</AddButton>
      </PanelCardHeader>

      {actifs.length === 0 ? (
        <p className={cn(panelInsetClass, 'text-[13px] text-muted-foreground')}>Aucun bien immobilier dans Patrimoine.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[13px]">
            <EnTete colonnes={['Bien', 'Case', 'Valeur vénale', 'Fraction taxable']} />
            <tbody>
              {actifs.map((record, i) => {
                const l = lignes.actifs[i];
                const p = etat.prerempliActifs[record.id];
                const relie = !!record.asset_id;
                return (
                  <tr key={record.id} className={cn('border-b border-border/60', l.exclu && 'opacity-50')}>
                    <td className="py-0.5 pr-2">
                      <Denomination value={l.denomination} relie={relie} onCommit={(v) => modifierActif(record.id, { denomination: v })} />
                    </td>
                    <td className="w-72 px-1 py-0.5">
                      <ChoixCellule
                        ariaLabel={`Case — ${l.denomination}`}
                        value={enBase(l.categorie)}
                        options={CATEGORIES}
                        onChange={(v) => modifierActif(record.id, { categorie: p && v === enBase(p.categorie) ? null : v })}
                      />
                    </td>
                    <td className="w-40 px-1 py-0.5">
                      <MontantCellule
                        ariaLabel={`Valeur — ${l.denomination}`}
                        value={record.valeur === null ? null : Number(record.valeur)}
                        prerempli={p?.valeur}
                        suffixe="€"
                        onCommit={(v) => modifierActif(record.id, { valeur: v })}
                      />
                    </td>
                    <td className="w-28 px-1 py-0.5">
                      <MontantCellule
                        ariaLabel={`Fraction taxable — ${l.denomination}`}
                        value={record.fraction_taxable === null ? null : Number(record.fraction_taxable)}
                        prerempli={100}
                        suffixe="%"
                        onCommit={(v) => modifierActif(record.id, { fraction_taxable: v === null ? null : Math.min(100, v) })}
                      />
                    </td>
                    <td className="w-8 text-right">
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
          </table>
        </div>
      )}

      <div className="mt-4 max-w-xl">
        <LigneTotal code="9AA" libelle="Résidence principale, après abattement" valeur={r.case9AA} />
        <LigneTotal code="9AB" libelle="Autres immeubles bâtis" valeur={r.case9AB} />
        <LigneTotal code="9AC" libelle="Bois, forêts, groupements forestiers (avant exonération)" valeur={r.case9AC} />
        <LigneTotal code="9AD" libelle="Biens ruraux loués à long terme (avant exonération)" valeur={r.case9AD} />
        <LigneTotal code="9BA" libelle="Parts de GFA et de GAF (avant exonération)" valeur={r.case9BA} />
        <LigneTotal code="9BB" libelle="Autres biens non bâtis" valeur={r.case9BB} />
        <LigneTotal code="9CA" libelle="Biens détenus indirectement" valeur={r.case9CA} />
        {r.exonerationsPartielles > 0 && (
          <LigneTotal
            code=""
            libelle={<span className="inline-flex items-center gap-1.5">Exonérations partielles<AideTooltip texte={`Bois et forêts : 75 %. Biens ruraux loués à long terme et GFA/GAF : 75 % jusqu’à ${formatEuros(SEUIL_EXONERATION_RURALE)}, 50 % au-delà.`} /></span>}
            valeur={-r.exonerationsPartielles}
          />
        )}
        <LigneTotal code="" libelle="Actif imposable" valeur={r.actifBrut} fort />
      </div>
      <Notes titre="À vérifier" lignes={notes} />
    </PanelCard>
  );
}

const LIGNES_DETTE = [
  { value: '9GH', code: '9GH', label: 'Autres dettes' },
  { value: '9GF', code: '9GF', label: 'Dettes afférentes aux travaux' },
] as const;

export function PassifSection({ etat, annee }: { etat: EtatIFI; annee: number }) {
  const { dettes, lignes, declaration, resultat: r, modifierDette, supprimerDette, ajouterDette, modifierDeclaration } = etat;
  const notes = lignes.dettes.filter((l) => !l.exclue).flatMap((l) => l.aVerifier.map((n) => `${l.denomination} : ${n}`));

  return (
    <PanelCard>
      <PanelCardHeader className="flex items-start justify-between gap-4">
        <div>
          <PanelCardTitle>Passif et autres déductions</PanelCardTitle>
          <PanelCardDescription>
            Annexe 4. Les emprunts de Patrimoine reliés à un bien imposable sont préremplis au capital restant dû au 1er janvier {annee}, à la part du foyer. Une dette sur un bien partiellement exonéré n’est déduite qu’à proportion de sa fraction imposable ; un prêt in fine est déduit de façon dégressive.
          </PanelCardDescription>
        </div>
        <AddButton onClick={ajouterDette}>Ajouter une dette</AddButton>
      </PanelCardHeader>

      {dettes.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[13px]">
            <EnTete colonnes={['Dette', 'Ligne', 'Bien financé', 'Restant dû']} />
            <tbody>
              {dettes.map((record, i) => {
                const l = lignes.dettes[i];
                const p = etat.prerempliDettes[record.id];
                const relie = !!record.emprunt_id;
                return (
                  <tr key={record.id} className={cn('border-b border-border/60', l.exclue && 'opacity-50')}>
                    <td className="py-0.5 pr-2">
                      <Denomination value={l.denomination} relie={relie} onCommit={(v) => modifierDette(record.id, { denomination: v })} />
                    </td>
                    <td className="w-48 px-1 py-0.5">
                      <ChoixCellule
                        ariaLabel={`Ligne — ${l.denomination}`}
                        value={l.ligne}
                        options={LIGNES_DETTE}
                        onChange={(v) => modifierDette(record.id, { ligne: p && v === p.ligne ? null : v })}
                      />
                    </td>
                    <td className="w-64 px-1 py-0.5">
                      <ChoixCellule
                        ariaLabel={`Bien financé — ${l.denomination}`}
                        value={enBase(l.categorieBien)}
                        options={CATEGORIES}
                        onChange={(v) => modifierDette(record.id, { categorie_bien: p && v === enBase(p.categorieBien) ? null : v })}
                      />
                    </td>
                    <td className="w-40 px-1 py-0.5">
                      <MontantCellule
                        ariaLabel={`Restant dû — ${l.denomination}`}
                        value={record.montant === null ? null : Number(record.montant)}
                        prerempli={p ? (p.inFine ? undefined : p.montant) : undefined}
                        suffixe="€"
                        onCommit={(v) => modifierDette(record.id, { montant: v })}
                      />
                      {p?.inFine && record.montant === null && (
                        <div className="pr-2 text-right text-[11px] text-muted-foreground">
                          In fine : {p.inFine.anneesEcoulees} an(s) écoulé(s) sur {p.inFine.dureeAnnees}
                        </div>
                      )}
                    </td>
                    <td className="w-8 text-right">
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
            </tbody>
          </table>
        </div>
      )}

      <label className="mt-4 flex items-start gap-2 text-[13px]">
        <Checkbox
          checked={declaration?.deduire_ifi_theorique ?? true}
          onCheckedChange={(v) => modifierDeclaration({ deduire_ifi_theorique: v === true })}
          className="mt-0.5"
        />
        <span>
          Déduire l’IFI théorique en 9GH
          <span className="block text-[12px] text-muted-foreground">
            Impôt calculé sur l’actif net des autres dettes, avant sa propre déduction : {formatEuros(r.ifiTheorique)}.
          </span>
        </span>
      </label>

      <div className="mt-4 max-w-xl">
        <LigneTotal code="9GF" libelle="Dettes afférentes aux travaux" valeur={r.case9GF} />
        <LigneTotal code="9GH" libelle="Autres dettes, dont IFI théorique" valeur={r.case9GH} />
        {r.plafonnementDettes > 0 && (
          <LigneTotal
            code=""
            libelle={<span className="inline-flex items-center gap-1.5">dont réduction pour plafonnement des dettes<AideTooltip texte="Actif supérieur à 5 M€ : les dettes au-delà de 60 % de l’actif ne sont déductibles qu’à moitié (art. 974 III)." /></span>}
            valeur={-r.plafonnementDettes}
          />
        )}
      </div>
      <Notes titre="À vérifier" lignes={notes} />
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
    <div className="grid grid-cols-[3rem_1fr_10rem] items-center gap-2 border-b border-border/60 py-0.5 text-[13px]">
      <span className="tabular-nums text-muted-foreground">{code}</span>
      <span className="inline-flex items-center gap-1.5">{libelle}{aide && <AideTooltip texte={aide} />}</span>
      <MontantCellule ariaLabel={`${code} — ${libelle}`} value={value} prerempli={prerempli} suffixe="€" onCommit={onCommit} />
    </div>
  );
}

const nombre = (v: number | string | null | undefined) => (v === null || v === undefined ? null : Number(v));

export function ReductionsSection({ etat, annee }: { etat: EtatIFI; annee: number }) {
  const { declaration, depuis2042, modifierDeclaration } = etat;
  if (!declaration) return null;
  return (
    <PanelCard>
      <PanelCardHeader>
        <PanelCardTitle>Dons et plafonnement</PanelCardTitle>
        <PanelCardDescription>
          {depuis2042
            ? `9PR et 9PX sont repris du calcul de l’impôt sur les revenus ${annee - 1} (Vision générale) ; une saisie les remplace.`
            : annee === ANNEE_IFI
              ? 'Foyer non renseigné dans la 2042 : 9PR et 9PX ne sont pas préremplis, complétez la 2042 ou saisissez-les. Sans 9PX, pas de plafonnement.'
              : `La Vision générale calcule l’impôt d’une autre année : saisissez 9PR et 9PX d’après l’impôt sur les revenus ${annee - 1}.`}
        </PanelCardDescription>
      </PanelCardHeader>
      <div className="max-w-2xl">
        <ChampCase code="9NC" libelle="Dons à des organismes d’intérêt général établis en France" aide="Réduction de 75 % du don, plafonnée à 50 000 €."
          value={nombre(declaration.dons_france)} onCommit={(v) => modifierDeclaration({ dons_france: v })} />
        <ChampCase code="9NG" libelle="Dons à des organismes établis dans un autre État européen"
          value={nombre(declaration.dons_ue)} onCommit={(v) => modifierDeclaration({ dons_ue: v })} />
        <ChampCase code="9PR" libelle={`Impôts dus au titre des revenus ${annee - 1}`}
          aide="IR au barème avant crédits d’impôt représentatifs d’un impôt étranger, impôts à taux proportionnel et prélèvements sociaux. Sans l’IFI, ajouté automatiquement."
          value={nombre(declaration.impots_revenus_n1)} prerempli={depuis2042?.impots} onCommit={(v) => modifierDeclaration({ impots_revenus_n1: v })} />
        <ChampCase code="9PX" libelle={`Revenus ${annee - 1} déclarés sur la 2042`}
          aide="Revenus nets de frais professionnels, avant abattements (dividendes avant l’abattement de 40 %, plus-values avant abattements pour durée de détention). Repris du revenu fiscal de référence : à corriger notamment pour les pensions (avant abattement de 10 %)."
          value={nombre(declaration.revenus_n1)} prerempli={depuis2042?.revenus} onCommit={(v) => modifierDeclaration({ revenus_n1: v })} />
        <ChampCase code="" libelle="Revenus hors 2042 (ajoutés à 9PX)"
          aide="Revenus exonérés (livrets, plus-values exonérées…), revenus perçus à l’étranger nets de frais, produits soumis à prélèvement libératoire."
          value={nombre(declaration.revenus_hors_2042)} onCommit={(v) => modifierDeclaration({ revenus_hors_2042: v })} />
      </div>
    </PanelCard>
  );
}

export function LiquidationSection({ resultat: r }: { resultat: DeclarationIFIResultat }) {
  return (
    <PanelCard>
      <PanelCardHeader>
        <PanelCardTitle>Calcul de l’impôt</PanelCardTitle>
        <PanelCardDescription>
          {r.assujetti
            ? 'Barème progressif de l’article 977, décote entre 1,3 et 1,4 M€, réduction pour dons puis plafonnement à 75 % des revenus.'
            : 'Patrimoine net inférieur ou égal à 1 300 000 € : pas d’IFI à déclarer.'}
        </PanelCardDescription>
      </PanelCardHeader>
      <div className="max-w-xl">
        <LigneTotal code="" libelle="Actif imposable" valeur={r.actifBrut} />
        <LigneTotal code="" libelle="Passif déductible (9GF + 9GH)" valeur={-(r.case9GF + r.case9GH)} />
        <LigneTotal code="" libelle="Patrimoine net taxable" valeur={r.patrimoineNet} fort />
        {r.tranches.filter((t) => t.taux > 0).map((t) => (
          <div key={t.min} className="grid grid-cols-[3rem_1fr_auto] gap-2 border-b border-border/60 py-1 text-[12.5px] text-muted-foreground">
            <span className="tabular-nums">{(t.taux * 100).toLocaleString('fr-FR')} %</span>
            <span className="tabular-nums">
              {formatEuros(t.base)} entre {formatEuros(t.min)} et {Number.isFinite(t.max) ? formatEuros(t.max) : '…'}
            </span>
            <span className="tabular-nums">{formatEuros(Math.round(t.impot))}</span>
          </div>
        ))}
        {r.assujetti && <LigneTotal code="" libelle="Impôt selon le barème" valeur={r.impotBareme} />}
        {r.decote > 0 && <LigneTotal code="" libelle="Décote" valeur={-r.decote} />}
        {r.reductionDons > 0 && <LigneTotal code="" libelle="Réduction pour dons" valeur={-r.reductionDons} />}
        {r.seuilPlafonnement !== null && (
          <LigneTotal
            code=""
            libelle={<span className="inline-flex items-center gap-1.5">Plafonnement<AideTooltip texte={`IFI et impôts sur les revenus limités à 75 % des revenus, soit ${formatEuros(r.seuilPlafonnement)} ; impôts sur les revenus : ${formatEuros(r.case9PR)}.`} /></span>}
            valeur={-r.reductionPlafonnement}
          />
        )}
        <LigneTotal code="" libelle="IFI net à payer" valeur={r.ifiNet} fort />
      </div>
    </PanelCard>
  );
}
