import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { PanelTitle } from '@/components/layout/workspace-panel';
import { SectorsDonut, type DonutSector } from '@/components/ui/sectors-donut';
import { CITRON_INK, CITRON_MID, GREY, LAGON, LAGON_DEEP, LAGON_INK, LAGON_MID } from '@/components/budget/budgetColors';
import { ANNEE_IFI, FiscalOverview } from '@/hooks/useFiscalOverview';
import { cn } from '@/lib/utils';

// Imposition totale : chiffre principal et pastille TMI, détail des impôts calculés (lignes à 0 € ou non
// calculées repliées), puis composition du revenu imposable (anneau, taux moyen global au centre) avec
// ce que chaque catégorie coûte en IR et en prélèvements sociaux.

export const formatEuros = (valeur: number): string => `${Math.round(valeur).toLocaleString('fr-FR')} €`;

const formatPct = (valeur: number): string =>
  `${valeur.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`;

/** Ligne libellé / montant, pastille de couleur facultative (série de l'anneau) et précision sous le libellé. */
export function LigneDetail({ label, valeur, couleur, muted, note, sousLigne }: {
  label: string;
  valeur: string;
  couleur?: string;
  muted?: boolean;
  note?: string;
  sousLigne?: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 py-2 text-[13px]">
      <span className={cn('flex min-w-0 items-baseline gap-2', muted ? 'text-muted-foreground' : 'text-foreground')}>
        {couleur && <span className="inline-block h-2.5 w-2.5 shrink-0 translate-y-[1px] rounded-[2px] ring-1 ring-inset ring-black/10" style={{ backgroundColor: couleur }} />}
        <span className="min-w-0">
          {label}
          {note && <span className="ml-1.5 text-[12px] text-muted-foreground">{note}</span>}
          {sousLigne && <span className="mt-0.5 block text-[12px] text-muted-foreground">{sousLigne}</span>}
        </span>
      </span>
      <span className={cn('shrink-0 tabular-nums', muted ? 'text-muted-foreground' : 'font-medium text-foreground')}>{valeur}</span>
    </div>
  );
}

/** Lignes secondaires (0 €, non calculé) repliées sous un bouton « n autres lignes ». */
export function LignesRepliees({ nombre, children }: { nombre: number; children: ReactNode }) {
  const [ouvert, setOuvert] = useState(false);
  if (nombre === 0) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        className="flex w-full items-center gap-1.5 py-2 text-left text-[12.5px] text-muted-foreground hover:text-foreground"
      >
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', ouvert && 'rotate-180')} />
        {ouvert ? 'Masquer' : `${nombre} autre${nombre > 1 ? 's' : ''} ligne${nombre > 1 ? 's' : ''} à 0 € ou non calculée${nombre > 1 ? 's' : ''}`}
      </button>
      {ouvert && <div>{children}</div>}
    </>
  );
}

interface Ligne {
  label: string;
  /** null = non calculé. */
  valeur: number | null;
  texte?: string;
}

const FiscalOverviewCard = ({ overview }: { overview: FiscalOverview }) => {
  const {
    impot, revenuSalaires, gainsActionnariat, pensionsRetraitesRentes, revenuCapitauxMobiliers, plusValuesGainsDivers, revenuExonereTauxEffectif,
    prelevementsSociauxCapitauxMobiliers, prelevementsSociauxPensionsRetraitesRentes, prelevementsSociauxGainsActionnariat,
    revenusFonciers, revenusFonciers2042, revenusNonSalaries, deficitAgricoleImpute, chargesDeductibles, alertesChargesDeductibles, prelevementSourceDivers, reductionPrelevementsSociaux, prelevementsSociauxTotal, cehr, solde, ifi, comparaisonOptionBareme,
  } = overview;

  // PS sur les salaires (prélevés en paie) restent hors total : seules les impositions calculées sont sommées.
  // PFL de 2DH : déjà prélevé à la source, compté dans l'imposition mais pas dans le solde à payer.
  const impositionRevenus = impot.impotNet + cehr + prelevementsSociauxTotal
    + prelevementsSociauxCapitauxMobiliers.prelevementLiberatoire2DH;
  const impositionTotale = impositionRevenus + (ifi?.ifiNet ?? 0);

  const noteImpot = [
    impot.decote > 0 ? `après décote de ${formatEuros(impot.decote)}` : null,
    impot.reductionsImpot > 0 ? `réductions ${formatEuros(impot.reductionsImpot)}` : null,
    impot.creditsImpotCadre7 > 0 ? `crédit services à la personne ${formatEuros(impot.creditsImpotCadre7)}` : null,
  ].filter(Boolean).join(' · ') || undefined;

  const impots: Ligne[] = [
    { label: 'Impôt sur le revenu (IR)', valeur: impot.impotNet },
    { label: 'Contribution exceptionnelle sur les hauts revenus', valeur: cehr },
    { label: 'Prélèvements sociaux (capitaux mobiliers)', valeur: prelevementsSociauxCapitauxMobiliers.prelevementsSociaux },
    ...(prelevementsSociauxCapitauxMobiliers.prelevementLiberatoire2DH > 0
      ? [{ label: 'Prélèvement libératoire 2DH (7,5 %, déjà prélevé)', valeur: prelevementsSociauxCapitauxMobiliers.prelevementLiberatoire2DH }]
      : []),
    { label: 'Prélèvements sociaux (pensions, retraites, rentes)', valeur: prelevementsSociauxPensionsRetraitesRentes.prelevementsSociaux },
    { label: "Prélèvements sociaux (gains d'actionnariat salarié)", valeur: prelevementsSociauxGainsActionnariat.prelevementsSociaux },
    { label: 'Prélèvements sociaux (plus-values)', valeur: plusValuesGainsDivers.prelevementsSociaux },
    revenusFonciers
      ? { label: 'Prélèvements sociaux (revenus fonciers, 2044)', valeur: revenusFonciers.prelevementsSociaux }
      : { label: 'Prélèvements sociaux (revenus fonciers, 2044)', valeur: null, texte: 'Pas de 2044' },
    { label: 'Prélèvements sociaux (fonciers hors 2044)', valeur: revenusFonciers2042.prelevementsSociaux },
    { label: 'Prélèvements sociaux (locations meublées et non salariés)', valeur: revenusNonSalaries.prelevementsSociaux },
    { label: "Contributions sociales (revenus d'activité étrangers)", valeur: prelevementSourceDivers.contributionsSocialesRevenusActivite },
    { label: 'Exonération de CSG et CRDS (8RF à 8RM)', valeur: reductionPrelevementsSociaux === 0 ? 0 : -reductionPrelevementsSociaux },
    { label: 'Prélèvements sociaux (salaires)', valeur: null, texte: 'Prélevés en paie' },
    ifi
      ? { label: `IFI ${ANNEE_IFI} (2042-IFI)`, valeur: ifi.ifiNet }
      : { label: 'IFI', valeur: null, texte: 'Pas de 2042-IFI' },
  ];
  // L'IR reste toujours visible, même à 0 €.
  const impotsVisibles = impots.filter((l, i) => i === 0 || (l.valeur ?? 0) !== 0);
  const impotsReplies = impots.filter((l, i) => i !== 0 && (l.valeur ?? 0) === 0);

  // Ce que chaque catégorie coûte : IR au barème réparti au prorata des revenus imposés au barème (le
  // barème est progressif : répartition indicative), plus l'impôt à taux forfaitaire propre à la
  // catégorie ; prélèvements sociaux calculés de la catégorie. Crédits d'impôt non répartis.
  const revenus = [
    { label: 'Salaires (net imposable)', valeur: revenuSalaires.totalNetImposable, couleur: LAGON_DEEP, forfaitaire: 0, ps: null as number | null },
    { label: "Gains d'actionnariat salarié", valeur: gainsActionnariat.totalNetImposable, couleur: CITRON_MID, forfaitaire: gainsActionnariat.impotForfaitaire, ps: prelevementsSociauxGainsActionnariat.prelevementsSociaux },
    { label: 'Pensions, retraites et rentes', valeur: pensionsRetraitesRentes.totalNetImposable, couleur: LAGON, forfaitaire: pensionsRetraitesRentes.impotForfaitaire, ps: prelevementsSociauxPensionsRetraitesRentes.prelevementsSociaux },
    { label: 'Capitaux mobiliers', valeur: revenuCapitauxMobiliers.totalNetImposable, couleur: GREY, forfaitaire: revenuCapitauxMobiliers.impotForfaitaire, ps: prelevementsSociauxCapitauxMobiliers.prelevementsSociaux },
    { label: 'Plus-values et gains divers', valeur: plusValuesGainsDivers.totalNetImposable, couleur: CITRON_INK, forfaitaire: plusValuesGainsDivers.impotForfaitaire, ps: plusValuesGainsDivers.prelevementsSociaux },
    { label: 'Revenus non salariés (BIC, BNC, BA)', valeur: revenusNonSalaries.totalNetImposable - deficitAgricoleImpute, couleur: LAGON_MID, forfaitaire: revenusNonSalaries.impotForfaitaire + impot.impotTauxMarginal + impot.taxesAnnexes, ps: revenusNonSalaries.prelevementsSociaux },
    {
      label: 'Revenus fonciers',
      valeur: (revenusFonciers?.revenuFoncierNetImposable ?? 0) - revenusFonciers2042.deductionReel4BL + revenusFonciers2042.totalNetImposable,
      couleur: LAGON_INK, forfaitaire: 0,
      ps: (revenusFonciers?.prelevementsSociaux ?? 0) + revenusFonciers2042.prelevementsSociaux,
    },
  ];
  const baseBareme = revenus.reduce((s, r) => s + r.valeur, 0);
  const irBareme = Math.max(0, impot.impotApresDecote - impot.creditImpotFrancais);
  const revenusAvecCout = revenus.map((r) => ({
    ...r,
    ir: (baseBareme > 0 ? (irBareme * r.valeur) / baseBareme : 0) + r.forfaitaire,
  }));
  const revenusVisibles = revenusAvecCout.filter((r) => r.valeur > 0 || r.ir > 0 || (r.ps ?? 0) > 0);
  const revenusReplies = revenusAvecCout.filter((r) => !(r.valeur > 0 || r.ir > 0 || (r.ps ?? 0) > 0));

  const secteurs: DonutSector[] = revenus
    .filter((r) => r.valeur > 0)
    .map((r) => ({ label: r.label, value: r.valeur, color: r.couleur, pct: impot.revenuImposable > 0 ? (r.valeur / impot.revenuImposable) * 100 : 0 }));
  const tauxMoyenGlobal = impot.revenuImposable > 0 ? formatPct((impositionRevenus / impot.revenuImposable) * 100) : '—';

  const coutCategorie = (r: (typeof revenusAvecCout)[number]) =>
    `IR ≈ ${formatEuros(r.ir)} · PS ${r.ps === null ? 'prélevés en paie' : formatEuros(r.ps)}`;

  return (
    <div className="border-b border-border px-8 py-6">
      <PanelTitle>Imposition totale</PanelTitle>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-[34px] font-medium leading-none tracking-[-0.03em] tabular-nums">{formatEuros(impositionTotale)}</p>
        <span className="inline-flex h-6 items-center rounded-[2px] bg-lagon-soft px-2 text-[12.5px] font-medium tabular-nums text-lagon-ink">
          TMI {Math.round(impot.tmi * 100)} %
        </span>
      </div>
      <p className="mt-2 text-[12.5px] text-muted-foreground">
        IR, prélèvements sociaux et IFI calculés ; prélèvements sociaux sur les salaires non inclus.
      </p>

      <div className="mt-4">
        {impotsVisibles.map((l) => (
          <LigneDetail
            key={l.label}
            label={l.label}
            valeur={l.valeur === null ? l.texte! : formatEuros(l.valeur)}
            note={l.label.startsWith('Impôt sur le revenu') ? noteImpot : undefined}
          />
        ))}
        <LignesRepliees nombre={impotsReplies.length}>
          {impotsReplies.map((l) => (
            <LigneDetail key={l.label} label={l.label} valeur={l.valeur === null ? l.texte! : formatEuros(l.valeur)} muted />
          ))}
        </LignesRepliees>
      </div>

      {solde && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="text-[11.5px] font-medium uppercase tracking-[0.04em] text-muted-foreground">Après prélèvement à la source</p>
          <LigneDetail
            label={solde.soldeImpot >= 0 ? 'Impôt sur le revenu restant à payer' : 'Impôt sur le revenu à rembourser'}
            valeur={formatEuros(Math.abs(solde.soldeImpot))}
          />
          <LigneDetail
            label={solde.soldePrelevementsSociaux >= 0 ? 'Prélèvements sociaux restant à payer' : 'Prélèvements sociaux à rembourser'}
            valeur={formatEuros(Math.abs(solde.soldePrelevementsSociaux))}
          />
        </div>
      )}

      {comparaisonOptionBareme && (() => {
        const { optionActuelle, impotAvecOption, impotSansOption } = comparaisonOptionBareme;
        const baremePlusFavorable = impotAvecOption < impotSansOption;
        const choixOptimal = baremePlusFavorable === optionActuelle;
        return (
          <div className="mt-4 border-t border-border pt-3">
            <p className="text-[11.5px] font-medium uppercase tracking-[0.04em] text-muted-foreground">Option pour le barème (2OP)</p>
            <LigneDetail label={`Impôt au barème (2OP cochée)${optionActuelle ? ' · option actuelle' : ''}`} valeur={formatEuros(impotAvecOption)} />
            <LigneDetail label={`Impôt au prélèvement forfaitaire (2OP décochée)${optionActuelle ? '' : ' · option actuelle'}`} valeur={formatEuros(impotSansOption)} />
            <p className="mt-1 text-[11.5px] leading-snug text-muted-foreground">
              {choixOptimal
                ? 'Le choix actuel est le plus favorable cette année.'
                : `${baremePlusFavorable ? 'Cocher' : 'Décocher'} 2OP réduirait l'impôt de ${formatEuros(Math.abs(impotAvecOption - impotSansOption))}.`}
              {' '}Option globale (capitaux mobiliers et plus-values) ; prélèvements sociaux inchangés ; CSG déductible des années suivantes non comptée.
            </p>
          </div>
        );
      })()}

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-start">
        <div className="flex justify-center">
          {secteurs.length > 0 ? (
            <SectorsDonut sectors={secteurs} formatValue={formatEuros} centerLabel={tauxMoyenGlobal} centerCaption="Taux moyen (IR + PS)" showLegend={false} />
          ) : (
            <p className="py-8 text-center text-[13px] text-muted-foreground">Aucun revenu imposable saisi pour l'instant.</p>
          )}
        </div>
        <div>
          <p className="text-[11.5px] font-medium uppercase tracking-[0.04em] text-muted-foreground">Revenu imposable et ce qu'il coûte</p>
          <div className="mt-1">
            {revenusVisibles.map((r) => (
              <LigneDetail key={r.label} label={r.label} valeur={formatEuros(r.valeur)} couleur={r.couleur} sousLigne={coutCategorie(r)} />
            ))}
            {revenusFonciers && revenusFonciers.deficitImputableRevenuGlobal > 0 && (
              <LigneDetail label="Déficit foncier imputable (4BC)" valeur={`− ${formatEuros(revenusFonciers.deficitImputableRevenuGlobal)}`} />
            )}
            {chargesDeductibles.sommesAAjouter > 0 && (
              <LigneDetail label="Sommes à ajouter au revenu imposable (6GH)" valeur={formatEuros(chargesDeductibles.sommesAAjouter)} />
            )}
            {chargesDeductibles.deficitsAnterieursImputes > 0 && (
              <LigneDetail label="Déficits globaux antérieurs imputés" valeur={`− ${formatEuros(chargesDeductibles.deficitsAnterieursImputes)}`} />
            )}
            {chargesDeductibles.chargesImputees > 0 && (
              <LigneDetail label="Charges déductibles (cadre 6)" valeur={`− ${formatEuros(chargesDeductibles.chargesImputees)}`} />
            )}
            {chargesDeductibles.csgDeductibleAutomatique > 0 && (
              <LigneDetail label="dont CSG déductible sur 2BH/2DF (calculée d'office)" valeur={formatEuros(chargesDeductibles.csgDeductibleAutomatique)} />
            )}
            {chargesDeductibles.gainMutualisation > 0 && (
              <LigneDetail label="Mutualisation des plafonds épargne retraite (6QR)" note="non cochée" valeur={`− ${formatEuros(chargesDeductibles.gainMutualisation)} possible`} muted />
            )}
            {(() => {
              const er1 = chargesDeductibles.epargneRetraiteDeclarant1;
              const er2 = chargesDeductibles.epargneRetraiteDeclarant2;
              const pac = chargesDeductibles.epargneRetraitePersonneCharge;
              const perdues = er1.cotisationsPerdues + er2.cotisationsPerdues + pac.cotisationsPerdues;
              const reportable = er1.plafondNonUtilise + er2.plafondNonUtilise + pac.plafondNonUtilise;
              return (perdues > 0 || reportable > 0) && (
                <LigneDetail
                  label="Épargne retraite : plafond non utilisé"
                  valeur={formatEuros(reportable)}
                  sousLigne={`Estimation du report (D1 ${formatEuros(er1.plafondNonUtilise)} · D2 ${formatEuros(er2.plafondNonUtilise)}${pac.plafondNonUtilise > 0 ? ` · PAC ${formatEuros(pac.plafondNonUtilise)}` : ''})${perdues > 0 ? ` · ${formatEuros(perdues)} de cotisations au-delà du plafond, perdues` : ''}`}
                  muted
                />
              );
            })()}
            {chargesDeductibles.deficitsReportables.length > 0 && (
              <LigneDetail
                label="Déficits globaux reportables"
                valeur={formatEuros(chargesDeductibles.deficitsReportables.reduce((t, r) => t + r.montant, 0))}
                sousLigne={chargesDeductibles.deficitsReportables.map(r => `${r.annee} : ${formatEuros(r.montant)}`).join(' · ')}
                muted
              />
            )}
            {chargesDeductibles.deficitPerdu > 0 && (
              <LigneDetail label="Déficit 2019 (6FA) non imputé" note="expiré" valeur={formatEuros(chargesDeductibles.deficitPerdu)} muted />
            )}
            {chargesDeductibles.grossesReparationsReportables.length > 0 && (
              <LigneDetail
                label="Grosses réparations reportables"
                valeur={formatEuros(chargesDeductibles.grossesReparationsReportables.reduce((t, r) => t + r.montant, 0))}
                sousLigne={chargesDeductibles.grossesReparationsReportables.map(r => `${r.annee} : ${formatEuros(r.montant)}`).join(' · ')}
                muted
              />
            )}
            {alertesChargesDeductibles.map(alerte => (
              <p key={alerte} className="border-b border-border/60 py-2 text-[12px] text-muted-foreground">{alerte}</p>
            ))}
            {chargesDeductibles.grossesReparationsPerdues > 0 && (
              <LigneDetail label="Grosses réparations 2015 (6HP) non imputées" note="expiré" valeur={formatEuros(chargesDeductibles.grossesReparationsPerdues)} muted />
            )}
            {revenuExonereTauxEffectif.totalRetenu > 0 && (
              <LigneDetail
                label="Revenus exonérés retenus (taux effectif)"
                valeur={`${formatEuros(revenuExonereTauxEffectif.totalRetenu)} · ${formatPct(impot.tauxEffectif * 100)}`}
              />
            )}
            <LignesRepliees nombre={revenusReplies.length + 2}>
              {revenusReplies.map((r) => (
                <LigneDetail key={r.label} label={r.label} valeur={formatEuros(r.valeur)} couleur={r.couleur} muted />
              ))}
              <LigneDetail label="Revenus exceptionnels (quotient)" valeur="Non calculé" muted />
              <LigneDetail label="Contribution différentielle sur les hauts revenus" valeur="Non calculé" muted />
            </LignesRepliees>
          </div>
          <p className="mt-2 text-[11.5px] leading-snug text-muted-foreground">
            IR réparti au prorata des revenus soumis au barème (le barème étant progressif, répartition indicative),
            plus l'impôt à taux forfaitaire de la catégorie ; crédits d'impôt non répartis.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-[2px]">
            {[
              { label: 'Revenu fiscal de référence', valeur: impot.revenuFiscalReference },
              { label: 'Décote appliquée', valeur: impot.decote },
              { label: 'Impôt net à payer (IR)', valeur: impot.impotNet },
            ].map((s) => (
              <div key={s.label} className="rounded-[2px] bg-secondary/50 p-3">
                <p className="text-[11.5px] text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-[16px] font-medium tabular-nums">{formatEuros(s.valeur)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FiscalOverviewCard;
