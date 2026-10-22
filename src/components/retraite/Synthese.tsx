import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PanelTitle, SummaryRow, Chip, panelButtonClass } from '@/components/layout/workspace-panel';
import { PanelCardTitle } from '@/components/layout/panel-section';
import { LAGON, CITRON_MID, DISPONIBLE } from '@/components/budget/budgetColors';
import { usePensionConsolidee } from '@/hooks/usePensionConsolidee';
import { AGE_TAUX_PLEIN_AUTOMATIQUE, DroitCumulRegime, PointsCles } from '@/lib/retraite/pointsCles';
import { resumeDroitsCumul } from '@/components/retraite/DroitsCumulEmploiRetraite';
import { exporterSyntheseRetraitePDF, DonneesPersonneExportPDF } from '@/lib/retraite/exportSyntheseRetraitePDF';
import { useEcartRevenuRetraite } from '@/hooks/useEcartRevenuRetraite';
import { analyserEcartRevenu } from '@/lib/retraite/calculEpargneRetraite';
import { PARAMETRES_EPARGNE_RETRAITE } from '@/lib/retraite/parametres';
import { useFoyerFiscal } from '@/hooks/useFoyerFiscal';
import { calculerPartsFiscales, FoyerFiscalInput } from '@/lib/fiscalite';
import {
  calculerNetRetraiteFoyer,
  ResultatNetRetraiteFoyer,
} from '@/lib/retraite/calculNetRetraite';
import { TrancheCSGPension } from '@/lib/retraite/parametres';
import { MILLESIME_COURANT } from '@/lib/retraite/parametres';
import {
  pensionsBrutes,
  foyerSansEnfantsACharge,
  FOYER_PAR_DEFAUT,
  lignesRevenuNet,
  LigneRevenuNet,
} from '@/lib/retraite/revenuNetFoyer';
import { reversionPourSurvivant, statutCoupleDepuisLibelle, StatutCouple, DetailReversion } from '@/lib/retraite/calculReversion';

const formatEuro0 = (valeur: number) =>
  valeur.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const formatPct = (valeur: number) => `${(valeur * 100).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} %`;

const LIBELLE_TRANCHE_CSG: Record<TrancheCSGPension, string> = {
  exoneration: 'exonéré de CSG',
  tauxReduit: 'CSG à 3,8 %',
  tauxMedian: 'CSG à 6,6 %',
  tauxNormal: 'CSG à 8,3 %',
};

// Couleurs des personnes : lagon pour le client, citron pour le conjoint (Composition du Foyer).
const COULEUR_UTILISATEUR = LAGON;
const COULEUR_CONJOINT = CITRON_MID;

type ResultatPersonne = ReturnType<typeof usePensionConsolidee>;

interface SyntheseProps {
  hasConjoint: boolean;
  nomUtilisateur: string;
  nomConjoint: string;
  /** Libellé `marital_status.statut_couple` (réversion : mariage seul). */
  statutCouple?: string;
}

interface PersonnesProps {
  hasConjoint: boolean;
  nomUtilisateur: string;
  nomConjoint: string;
}

/** Ligne libellé / montant aligné à droite (décompositions de revenu). */
const LigneMontant = ({
  label,
  value,
  strong = false,
  muted = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}) => (
  <div className={`flex items-baseline justify-between gap-4 py-1.5 text-[13px] leading-5 ${strong ? 'border-t border-border mt-1 pt-2.5' : ''}`}>
    <dt className="min-w-0 text-muted-foreground">{label}</dt>
    <dd className={`shrink-0 tabular-nums ${muted ? 'text-muted-foreground' : 'font-medium text-foreground'}`}>{value}</dd>
  </div>
);

const Notes = ({ children }: { children: React.ReactNode }) => (
  <div className="mt-5 space-y-1 border-t border-border pt-3 text-[12px] leading-[1.45] text-muted-foreground">{children}</div>
);

/** Barre de trimestres validés / requis, piste neutre. */
const BarreTrimestres = ({ ratio, couleur }: { ratio: number; couleur: string }) => (
  <div className="h-1.5 w-full overflow-hidden rounded-[1px]" style={{ backgroundColor: DISPONIBLE }}>
    <div className="h-full" style={{ width: `${Math.min(100, Math.max(0, ratio * 100))}%`, backgroundColor: couleur }} />
  </div>
);

// ── Bande 1 : pension du foyer (gauche) et détail par personne (droite) ──────────────

const BandePension = ({ hasConjoint, nomUtilisateur, nomConjoint }: PersonnesProps) => {
  const utilisateur = usePensionConsolidee('utilisateur');
  const conjoint = usePensionConsolidee('conjoint');

  const loading = utilisateur.loading || (hasConjoint && conjoint.loading);
  // Ligne du conjoint affichée seulement si son profil existe et contient des données retraite.
  const afficherConjoint = hasConjoint && !conjoint.loading && conjoint.aDesDonnees;

  const pensionCumulee =
    (utilisateur.aDesDonnees ? utilisateur.pensionTotaleConsolidee : 0) +
    (afficherConjoint ? conjoint.pensionTotaleConsolidee : 0);
  const totalAffiche = afficherConjoint ? pensionCumulee : utilisateur.pensionTotaleConsolidee;

  if (loading) {
    return <div className="border-b border-border px-8 py-6 text-[13px] text-muted-foreground">Chargement…</div>;
  }

  if (!utilisateur.aDesDonnees) {
    return (
      <div className="border-b border-border px-8 py-6">
        <p className="max-w-md text-[13px] text-muted-foreground">
          Aucune donnée de carrière saisie pour l'instant : renseignez l'onglet Carrière ou importez un relevé de
          carrière (RIS) pour estimer la pension.
        </p>
      </div>
    );
  }

  const personnes = [
    { nom: nomUtilisateur, resultat: utilisateur, couleur: COULEUR_UTILISATEUR },
    ...(afficherConjoint ? [{ nom: nomConjoint, resultat: conjoint, couleur: COULEUR_CONJOINT }] : []),
  ];

  return (
    <div className="grid grid-cols-1 divide-y divide-border border-b border-border lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:divide-x lg:divide-y-0">
      <div className="px-8 py-6">
        <p className="text-[12px] text-muted-foreground">
          {afficherConjoint ? 'Pension cumulée du foyer' : 'Pension'} au départ à l'âge légal
        </p>
        <p className="mt-2 flex items-baseline gap-2">
          <span className="text-[34px] font-medium leading-none tracking-[-0.03em] tabular-nums text-foreground">
            {formatEuro0(totalAffiche)}
          </span>
          <span className="text-[13px] text-muted-foreground">brut / an</span>
        </p>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
          <Chip tone="lagon">{formatEuro0(totalAffiche / 12)} / mois</Chip>
          <span>euros constants {MILLESIME_COURANT.annee}</span>
        </p>

        {afficherConjoint && pensionCumulee > 0 && (
          <div className="mt-5">
            <div className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-[1px]">
              {personnes.map((p) => (
                <div
                  key={p.nom}
                  className="h-full"
                  title={`${p.nom} · ${formatPct(p.resultat.pensionTotaleConsolidee / pensionCumulee)}`}
                  style={{ width: `${(p.resultat.pensionTotaleConsolidee / pensionCumulee) * 100}%`, backgroundColor: p.couleur }}
                />
              ))}
            </div>
          </div>
        )}

        <dl className="mt-4">
          {utilisateur.repartitionParRegime.rafpCapital > 0 && (
            <SummaryRow label="Capital RAFP">
              <span className="tabular-nums">{formatEuro0(utilisateur.repartitionParRegime.rafpCapital)}</span>
              <span className="ml-1.5 text-[12px] font-normal text-muted-foreground">versé au départ</span>
            </SummaryRow>
          )}
        </dl>

        {utilisateur.dateCarriereLongue && utilisateur.dateEffet &&
          utilisateur.dateCarriereLongue.getTime() < utilisateur.dateEffet.getTime() && (
            <p className="mt-3 text-[12px] text-positive">
              Carrière longue : départ anticipé à taux plein possible dès le{' '}
              {utilisateur.dateCarriereLongue.toLocaleDateString('fr-FR', { timeZone: 'UTC' })} (onglet Optimisation).
            </p>
          )}
        {utilisateur.salaireComplementaireEstPlafonne && (
          <p className="mt-2 text-[12px] text-spark">
            Agirc-Arrco projeté sur un revenu plafonné au PASS (salaire brut total non renseigné).
          </p>
        )}
      </div>

      <div className="px-8 py-6">
        <PanelTitle>{afficherConjoint ? 'Par personne' : 'Départ et trimestres'}</PanelTitle>
        <div className={`mt-3 grid grid-cols-1 gap-y-5 ${personnes.length > 1 ? 'sm:grid-cols-2 sm:gap-x-8' : ''}`}>
          {personnes.map((p) => (
            <BlocPersonne
              key={p.nom}
              nom={p.nom}
              resultat={p.resultat}
              couleur={p.couleur}
              part={afficherConjoint && pensionCumulee > 0 ? p.resultat.pensionTotaleConsolidee / pensionCumulee : null}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const BlocPersonne = ({
  nom,
  resultat,
  couleur,
  part,
}: {
  nom: string;
  resultat: ResultatPersonne;
  couleur: string;
  part: number | null;
}) => {
  const { trimestresRequis, trimestresValidesTousRegimes } = resultat;
  const manquants = Math.max(0, trimestresRequis - trimestresValidesTousRegimes);
  // 4 trimestres/an, en supposant une cotisation continue au rythme actuel.
  const anneesRestantes = manquants / 4;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
        <span className="flex min-w-0 items-center gap-2 text-[13px] font-medium text-foreground">
          <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-[2px] ring-1 ring-inset ring-black/10" style={{ backgroundColor: couleur }} />
          <span className="truncate">{nom}</span>
          {part !== null && <span className="font-normal tabular-nums text-muted-foreground">{formatPct(part)}</span>}
        </span>
        <span className="shrink-0 text-[13px] font-medium tabular-nums text-foreground">
          {formatEuro0(resultat.pensionTotaleConsolidee)}
          <span className="ml-1 font-normal text-muted-foreground">/ an</span>
        </span>
      </div>
      <dl className="mt-1">
        <SummaryRow label="Taux plein">{resultat.ageTauxPlein}</SummaryRow>
        {resultat.dateEffet && (
          <SummaryRow label="Départ simulé">
            <span className="tabular-nums">{resultat.dateEffet.toLocaleDateString('fr-FR', { timeZone: 'UTC' })}</span>
          </SummaryRow>
        )}
        <SummaryRow label="Trimestres">
          <span className="tabular-nums">{trimestresValidesTousRegimes}</span>
          <span className="font-normal text-muted-foreground"> / {trimestresRequis} requis</span>
        </SummaryRow>
        {resultat.trimestresEnfants.total > 0 && (
          <SummaryRow label="dont trimestres enfants">
            <span className="tabular-nums">{resultat.trimestresEnfants.total}</span>
          </SummaryRow>
        )}
      </dl>
      <div className="mt-2">
        <BarreTrimestres ratio={trimestresRequis > 0 ? trimestresValidesTousRegimes / trimestresRequis : 0} couleur={couleur} />
        <p className="mt-2 text-[12px] text-muted-foreground">
          {manquants <= 0
            ? 'Trimestres requis déjà atteints.'
            : `${manquants} trimestre${manquants > 1 ? 's' : ''} manquant${manquants > 1 ? 's' : ''}, soit environ ${anneesRestantes
                .toFixed(1)
                .replace('.0', '')} an${anneesRestantes >= 2 ? 's' : ''} de cotisation continue.`}
        </p>
      </div>
    </div>
  );
};

// ── Bande 0 : points clés (bilan Sapiendo p. 3) ─────────────────────────────────────

const formatDateCourte = (date: Date) =>
  date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

const ChiffreCle = ({ libelle, valeur, unite, date }: { libelle: string; valeur: string; unite: string; date?: Date }) => (
  <div className="min-w-0">
    <p className="text-[12px] text-muted-foreground">{libelle}</p>
    <p className="mt-1.5 flex items-baseline gap-1.5">
      <span className="text-[28px] font-medium leading-none tracking-[-0.03em] tabular-nums text-foreground">{valeur}</span>
      <span className="text-[12.5px] text-muted-foreground">{unite}</span>
    </p>
    {date && <p className="mt-1 text-[12px] tabular-nums text-muted-foreground">{formatDateCourte(date)}</p>}
  </div>
);

const ColonnePointsCles = ({
  nom,
  points,
  droitsCumul,
  afficherNom,
}: {
  nom: string;
  points: PointsCles;
  droitsCumul: DroitCumulRegime[];
  afficherNom: boolean;
}) => (
  <div className="min-w-0">
    {afficherNom && <p className="mb-3 text-[13px] font-medium text-foreground">{nom}</p>}
    <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
      <ChiffreCle
        libelle="Âge légal de départ"
        valeur={String(points.ageLegal.ans)}
        unite={points.ageLegal.mois > 0 ? `ans et ${points.ageLegal.mois} mois` : 'ans'}
        date={points.dateAgeLegal}
      />
      <ChiffreCle
        libelle={points.tauxPleinParAge ? 'Taux plein (par l\'âge)' : 'Taux plein'}
        valeur={String(points.ageTauxPlein.ans)}
        unite={points.ageTauxPlein.mois > 0 ? `ans et ${points.ageTauxPlein.mois} mois` : 'ans'}
        date={points.dateTauxPlein}
      />
      <ChiffreCle libelle="Trimestres requis" valeur={String(points.trimestresRequis)} unite="trimestres" />
      <ChiffreCle
        libelle="Acquis aujourd'hui"
        valeur={String(points.trimestresAcquis)}
        unite={points.trimestresManquantsAgeLegal > 0 ? `· ${points.trimestresManquantsAgeLegal} manquants à l'âge légal` : '· complet à l\'âge légal'}
      />
    </div>
    <dl className="mt-4">
      <SummaryRow label="Cumul emploi-retraite intégral">
        <span className="tabular-nums">dès le {formatDateCourte(points.dateCumulIntegral)}</span>
        <span className="ml-1.5 text-[12px] font-normal text-muted-foreground">
          {points.cumulSelonReforme ? `${AGE_TAUX_PLEIN_AUTOMATIQUE} ans, ` : 'taux plein, '}
          toutes pensions liquidées
        </span>
      </SummaryRow>
    </dl>
    {droitsCumul.length > 0 && <p className="mt-1.5 text-[12px] text-muted-foreground">{resumeDroitsCumul(droitsCumul)}.</p>}
    {points.dateCarriereLongue && (
      <p className="mt-2 text-[12px] text-positive">
        Carrière longue : départ anticipé à taux plein possible dès le {formatDateCourte(points.dateCarriereLongue)}.
      </p>
    )}
  </div>
);

const BandePointsCles = ({ hasConjoint, nomUtilisateur, nomConjoint }: PersonnesProps) => {
  const utilisateur = usePensionConsolidee('utilisateur');
  const conjoint = usePensionConsolidee('conjoint');
  if (utilisateur.loading || (hasConjoint && conjoint.loading) || !utilisateur.aDesDonnees || !utilisateur.pointsCles) {
    return null;
  }
  const colonnes = [
    { nom: nomUtilisateur, points: utilisateur.pointsCles, droitsCumul: utilisateur.droitsCumul },
    ...(hasConjoint && conjoint.aDesDonnees && conjoint.pointsCles
      ? [{ nom: nomConjoint, points: conjoint.pointsCles, droitsCumul: conjoint.droitsCumul }]
      : []),
  ];
  const reforme = colonnes.some((c) => c.points.cumulSelonReforme);

  return (
    <section className="border-b border-border px-8 py-6">
      <PanelCardTitle>Points clés</PanelCardTitle>
      <div className={`mt-4 grid grid-cols-1 gap-y-6 ${colonnes.length > 1 ? 'lg:grid-cols-2 lg:gap-x-0 lg:divide-x lg:divide-border [&>*:first-child]:lg:pr-8 [&>*:last-child]:lg:pl-8' : ''}`}>
        {colonnes.map((c) => (
          <ColonnePointsCles key={c.nom} {...c} afficherNom={colonnes.length > 1} />
        ))}
      </div>
      <Notes>
        <p>
          Taux plein : première date à partir de l'âge légal où les trimestres tous régimes (acquis, projetés en
          carrière continue et trimestres enfants) atteignent la durée requise, sinon 67 ans. Logique du régime
          général : l'âge d'annulation de la décote de la fonction publique (catégorie active) n'est pas retenu.
        </p>
        {reforme && (
          <p>
            Cumul intégral à compter du 01/01/2027 : 67 ans (art. 102 LFSS 2026, décrets d'application non publiés).
          </p>
        )}
      </Notes>
    </section>
  );
};

// ── Bande 2 : revenu net à la retraite ───────────────────────────────────────────────

const ColonneNet = ({ titre, resultat, tauxRemplacement, tauxRemplacementNet }: LigneRevenuNet) => (
  <div className="min-w-0">
    <p className="text-[12px] text-muted-foreground">{titre}</p>
    <p className="mt-1.5 flex items-baseline gap-2">
      <span className="text-[24px] font-medium leading-none tracking-[-0.02em] tabular-nums text-foreground">
        {formatEuro0(resultat.netMensuel)}
      </span>
      <span className="text-[12.5px] text-muted-foreground">net / mois</span>
    </p>
    <dl className="mt-3">
      <LigneMontant label="Pensions brutes" value={`${formatEuro0(resultat.pensionsBrutes)} / an`} />
      <LigneMontant
        label={`Prélèvements sociaux (${LIBELLE_TRANCHE_CSG[resultat.tranche]})`}
        value={`− ${formatEuro0(resultat.prelevementsSociaux)}`}
      />
      <LigneMontant label={`Impôt sur le revenu (TMI ${formatPct(resultat.tmi)})`} value={`− ${formatEuro0(resultat.impot)}`} />
      <LigneMontant label="Net annuel" value={`${formatEuro0(resultat.netAnnuel)} / an`} strong />
      {tauxRemplacement !== null && <LigneMontant label="Taux de remplacement brut" value={formatPct(tauxRemplacement)} />}
      {tauxRemplacementNet !== null && (
        <LigneMontant label="Taux de remplacement net (avant impôt)" value={formatPct(tauxRemplacementNet)} />
      )}
    </dl>
  </div>
);

const BandeRevenuNet = ({ hasConjoint, nomUtilisateur, nomConjoint }: PersonnesProps) => {
  const utilisateur = usePensionConsolidee('utilisateur');
  const conjoint = usePensionConsolidee('conjoint');
  const { data: foyerFiscal, loading: loadingFoyer } = useFoyerFiscal();

  if (utilisateur.loading || (hasConjoint && conjoint.loading) || loadingFoyer || !utilisateur.aDesDonnees) {
    return null;
  }

  const avecConjoint = hasConjoint && conjoint.aDesDonnees;
  const foyerSaisi = foyerFiscal ?? null;
  const impositionCommune =
    avecConjoint && (foyerSaisi?.situationFamille === 'marie' || foyerSaisi?.situationFamille === 'pacse');
  const lignes = lignesRevenuNet(utilisateur, avecConjoint ? conjoint : null, foyerSaisi, nomUtilisateur, nomConjoint);

  return (
    <section className="border-b border-border px-8 py-6">
      <PanelCardTitle>Revenu net à la retraite</PanelCardTitle>
      <div className={`mt-4 grid grid-cols-1 gap-y-6 ${lignes.length > 1 ? 'md:grid-cols-2 md:gap-x-0 md:divide-x md:divide-border [&>*:first-child]:md:pr-8 [&>*:last-child]:md:pl-8' : 'max-w-xl'}`}>
        {lignes.map((l) => (
          <ColonneNet key={l.titre} {...l} />
        ))}
      </div>
      {impositionCommune && lignes[0].parPersonne && (
        <p className="mt-3 text-[12.5px] text-muted-foreground">
          Taux de remplacement brut / net :{' '}
          {[nomUtilisateur, nomConjoint]
            .map((nom, i) => {
              const { brut, net } = lignes[0].parPersonne![i];
              const pct = (v: number | null) => (v !== null ? formatPct(v) : 'non calculable');
              return `${nom} ${pct(brut)} / ${pct(net)}`;
            })
            .join(' · ')}
        </p>
      )}
      <Notes>
        {!foyerSaisi && (
          <p className="text-spark">
            Foyer fiscal non renseigné dans le module Fiscalité : chaque personne est imposée séparément, sur 1 part.
          </p>
        )}
        <p>
          Régime de croisière : la CSG est calculée sur le revenu fiscal des seules pensions. Les deux premières années,
          le revenu fiscal de référence (N-2) contient encore des salaires : taux de CSG souvent plus élevé.
        </p>
        <p>
          Revenus du foyer limités aux pensions (loyers, dividendes et rachats d'assurance-vie non inclus : tranche
          d'imposition possiblement sous-estimée) ; enfants à charge non retenus dans les parts.
          {avecConjoint && ' Les deux conjoints sont supposés retraités.'}
        </p>
      </Notes>
    </section>
  );
};

// ── Bande 3 : protection du conjoint survivant ───────────────────────────────────────

// Revenu du survivant : sa pension propre + la réversion, imposé seul (veuf
// si marié, célibataire sinon — 1 part, sans enfant à charge).
const revenuSurvivant = (survivant: ResultatPersonne, defunt: ResultatPersonne, statut: StatutCouple) => {
  const propres = pensionsBrutes(survivant);
  const reversion = reversionPourSurvivant(defunt.assietteReversion, survivant.pensionTotaleConsolidee, statut);
  const situation: FoyerFiscalInput['situationFamille'] = statut === 'marie' ? 'veuf' : 'celibataire';
  const net = calculerNetRetraiteFoyer(
    [
      {
        base:
          propres.base +
          reversion.regimeGeneral +
          reversion.cnavpl +
          reversion.fonctionPublique +
          reversion.rafp +
          reversion.cnbf,
        complementaires: propres.complementaires + reversion.agircArrco + reversion.caissesPoints,
      },
    ],
    calculerPartsFiscales(foyerSansEnfantsACharge(FOYER_PAR_DEFAUT, situation)),
    situation
  );
  return { reversion, net };
};

const DetailSurvivant = ({
  titre,
  pensionPropre,
  reversion,
  net,
  netCoupleMensuel,
}: {
  titre: string;
  pensionPropre: number;
  reversion: DetailReversion;
  net: ResultatNetRetraiteFoyer;
  netCoupleMensuel: number;
}) => {
  const perte = netCoupleMensuel - net.netMensuel;
  const detail = (
    [
      ['Régime général', reversion.regimeGeneral],
      ['Agirc-Arrco', reversion.agircArrco],
      ['Fonction publique', reversion.fonctionPublique],
      ['RAFP', reversion.rafp],
      ['CNAVPL', reversion.cnavpl],
      ['Caisses à points (CARMF…)', reversion.caissesPoints],
      ['CNBF', reversion.cnbf],
    ] as [string, number][]
  )
    .filter(([, montant]) => montant > 0)
    .map(([libelle, montant]) => `${libelle} ${formatEuro0(montant)}`)
    .join(', ');
  return (
    <div className="min-w-0">
      <p className="text-[12px] text-muted-foreground">{titre}</p>
      <p className="mt-1.5 flex items-baseline gap-2">
        <span className="text-[24px] font-medium leading-none tracking-[-0.02em] tabular-nums text-foreground">
          {formatEuro0(net.netMensuel)}
        </span>
        <span className="text-[12.5px] text-muted-foreground">net / mois</span>
        {netCoupleMensuel > 0 && (
          <span className="ml-auto inline-flex h-6 items-center rounded-[2px] bg-destructive/10 px-2 text-[12px] font-medium tabular-nums text-destructive">
            −{formatEuro0(perte)} / mois · {formatPct(perte / netCoupleMensuel)}
          </span>
        )}
      </p>
      <dl className="mt-3">
        <LigneMontant label="Pension propre" value={`${formatEuro0(pensionPropre)} / an`} />
        <LigneMontant label="Réversion" value={`${formatEuro0(reversion.total)} / an`} muted={reversion.total === 0} />
      </dl>
      {detail && <p className="mt-1 text-[12px] text-muted-foreground">{detail}</p>}
      {reversion.reduiteParPlafondRessources && (
        <p className="mt-1 text-[12px] text-muted-foreground">
          Réversion du régime général réduite par le plafond de ressources (25 001,60 €/an pour une personne seule).
        </p>
      )}
    </div>
  );
};

const BandeConjointSurvivant = ({ hasConjoint, nomUtilisateur, nomConjoint, statutCouple }: SyntheseProps) => {
  const utilisateur = usePensionConsolidee('utilisateur');
  const conjoint = usePensionConsolidee('conjoint');
  const { data: foyerFiscal, loading: loadingFoyer } = useFoyerFiscal();
  const statut = statutCoupleDepuisLibelle(statutCouple);

  if (
    !hasConjoint ||
    !statut ||
    utilisateur.loading ||
    conjoint.loading ||
    loadingFoyer ||
    !utilisateur.aDesDonnees ||
    !conjoint.aDesDonnees
  ) {
    return null;
  }

  const netCoupleMensuel = lignesRevenuNet(utilisateur, conjoint, foyerFiscal ?? null, nomUtilisateur, nomConjoint).reduce(
    (total, l) => total + l.resultat.netMensuel,
    0
  );
  const survivantConjoint = revenuSurvivant(conjoint, utilisateur, statut);
  const survivantUtilisateur = revenuSurvivant(utilisateur, conjoint, statut);

  return (
    <section className="border-b border-border px-8 py-6">
      <PanelTitle
        action={
          <span className="text-[12.5px] text-muted-foreground">
            Couple retraité : <span className="font-medium tabular-nums text-foreground">{formatEuro0(netCoupleMensuel)}</span> net / mois
          </span>
        }
      >
        <span className="flex items-center gap-2">
          <span aria-hidden className="h-3 w-[3px] shrink-0 rounded-full bg-lagon" />
          Protection du conjoint survivant
        </span>
      </PanelTitle>
      {statut !== 'marie' && (
        <p className="mt-4 rounded-[2px] border border-destructive/40 p-3 text-[12.5px] text-destructive">
          {statut === 'pacse' ? 'PACS' : 'Concubinage'} : aucune pension de réversion n'est versée, dans aucun régime.
          Seul le mariage ouvre ce droit — le survivant ne garde que sa propre pension.
        </p>
      )}
      <div className="mt-4 grid grid-cols-1 gap-y-6 md:grid-cols-2 md:divide-x md:divide-border [&>*:first-child]:md:pr-8 [&>*:last-child]:md:pl-8">
        <DetailSurvivant
          titre={`Décès de ${nomUtilisateur} — revenu de ${nomConjoint}`}
          pensionPropre={conjoint.pensionTotaleConsolidee}
          reversion={survivantConjoint.reversion}
          net={survivantConjoint.net}
          netCoupleMensuel={netCoupleMensuel}
        />
        <DetailSurvivant
          titre={`Décès de ${nomConjoint} — revenu de ${nomUtilisateur}`}
          pensionPropre={utilisateur.pensionTotaleConsolidee}
          reversion={survivantUtilisateur.reversion}
          net={survivantUtilisateur.net}
          netCoupleMensuel={netCoupleMensuel}
        />
      </div>
      <Notes>
        <p>
          Hypothèses : les deux conjoints sont retraités ; le survivant a au moins 55 ans, vit seul et ne se remarie
          pas. Ressources prises en compte pour le plafond du régime général : ses seules pensions (revenus du
          patrimoine ignorés — réversion possiblement surestimée).
        </p>
        <p>
          Non modélisés : majoration de 11,1 % des petites pensions après 65 ans, partage entre ex-conjoints,
          réversion des régimes à points non paramétrés. Réversion CNAVPL alignée sur le régime général, à
          confirmer.
        </p>
      </Notes>
    </section>
  );
};

export const BoutonExportPDF = ({ hasConjoint, nomUtilisateur, nomConjoint }: PersonnesProps) => {
  const utilisateur = usePensionConsolidee('utilisateur');
  const conjoint = usePensionConsolidee('conjoint');
  const ecartRevenu = useEcartRevenuRetraite(hasConjoint, nomUtilisateur, nomConjoint);
  const [exportEnCours, setExportEnCours] = useState(false);

  const loading = utilisateur.loading || (hasConjoint && conjoint.loading) || ecartRevenu.loading;
  const afficherConjoint = hasConjoint && !conjoint.loading && conjoint.aDesDonnees;

  const handleExport = async () => {
    setExportEnCours(true);
    try {
      const donneesUtilisateur: DonneesPersonneExportPDF = { ...utilisateur, nom: nomUtilisateur };
      const donneesConjoint: DonneesPersonneExportPDF | null = afficherConjoint
        ? { ...conjoint, nom: nomConjoint }
        : null;

      // Épargne complémentaire : hypothèses par défaut de la carte « Écart de
      // revenu » (budget calculé, aucun versement futur, rendements par défaut).
      const d = ecartRevenu.donnees;
      const ecart = d
        ? {
            analyse: analyserEcartRevenu({
              netMensuel: d.netMensuel,
              revenusActifsMensuels: d.revenusActifsMensuels,
              budgetMensuel: d.budgetCalculeMensuel,
              encoursPER: d.encoursPER,
              encoursAssuranceVie: d.encoursAssuranceVie,
              versementAnnuel: 0,
              anneesAvantDepart: d.anneesAvantDepart,
              ageDepart: d.ageDepart,
              ageReference: d.ageReference,
              rendements: PARAMETRES_EPARGNE_RETRAITE.rendementsHypotheses,
            }),
            netMensuel: d.netMensuel,
            revenusActifsMensuels: d.revenusActifsMensuels,
            budgetMensuel: d.budgetCalculeMensuel,
            dateDepart: d.dateDepart,
          }
        : null;

      await exporterSyntheseRetraitePDF({
        utilisateur: donneesUtilisateur,
        conjoint: donneesConjoint,
        dateGeneration: new Date(),
        ecart,
      });
    } finally {
      setExportEnCours(false);
    }
  };

  return (
    <Button
      variant="outline"
      className={`gap-2 ${panelButtonClass}`}
      disabled={loading || !utilisateur.aDesDonnees || exportEnCours}
      onClick={handleExport}
    >
      <Download className="h-3.5 w-3.5" />
      {exportEnCours ? 'Génération en cours…' : 'Exporter en PDF'}
    </Button>
  );
};

// Synthèse en « panneau de travail » : bandes bord à bord séparées par des filets (pension et
// trimestres, revenu net, conjoint survivant). L'export PDF est porté par la barre d'en-tête
// (RetraiteSection).
export const Synthese = ({ hasConjoint, nomUtilisateur, nomConjoint, statutCouple }: SyntheseProps) => {
  const personnes = { hasConjoint, nomUtilisateur, nomConjoint };
  return (
    <>
      <BandePointsCles {...personnes} />
      <BandePension {...personnes} />
      <BandeRevenuNet {...personnes} />
      <BandeConjointSurvivant {...personnes} statutCouple={statutCouple} />
    </>
  );
};
