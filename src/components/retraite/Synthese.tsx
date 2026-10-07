import React, { useState } from 'react';
import { Download, PiggyBank, Landmark, Wallet, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DashCard,
  DashEyebrow,
  DashFigure,
  DashRow,
  DashTickStrip,
  DashOrbit,
  DashSoonChip,
  DashInset,
  DASH_INK,
  DASH_MUTED,
} from '@/components/ui/dash-card';
import { usePensionConsolidee } from '@/hooks/usePensionConsolidee';
import { Personne } from '@/hooks/useRetraiteData';
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
  remplacement,
  lignesRevenuNet,
} from '@/lib/retraite/revenuNetFoyer';
import { reversionPourSurvivant, statutCoupleDepuisLibelle, StatutCouple, DetailReversion } from '@/lib/retraite/calculReversion';

const formatEuro0 = (valeur: number) =>
  valeur.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

interface SyntheseProps {
  hasConjoint: boolean;
  nomUtilisateur: string;
  nomConjoint: string;
  /** Libellé `marital_status.statut_couple` (réversion : mariage seul). */
  statutCouple?: string;
}

interface CartePensionFoyerProps {
  hasConjoint: boolean;
  nomUtilisateur: string;
  nomConjoint: string;
}

// Une seule carte pour les deux pensions (utilisateur, conjoint) + le total
// du foyer — remplace les deux cartes séparées d'origine (cf. consigne).
const CartePensionFoyer = ({ hasConjoint, nomUtilisateur, nomConjoint }: CartePensionFoyerProps) => {
  const utilisateur = usePensionConsolidee('utilisateur');
  const conjoint = usePensionConsolidee('conjoint');

  const loading = utilisateur.loading || (hasConjoint && conjoint.loading);
  // Même règle d'affichage que précédemment pour le conjoint : sa ligne
  // n'apparaît que si son profil existe et contient des données retraite.
  const afficherConjoint = hasConjoint && !conjoint.loading && conjoint.aDesDonnees;

  const pensionCumulee =
    (utilisateur.aDesDonnees ? utilisateur.pensionTotaleConsolidee : 0) +
    (afficherConjoint ? conjoint.pensionTotaleConsolidee : 0);

  const totalAffiche = afficherConjoint ? pensionCumulee : utilisateur.pensionTotaleConsolidee;

  return (
    <DashCard
      title="Pension au départ à l'âge légal"
      tag="Brut / an"
      className="lg:col-span-2"
    >
      {loading ? (
        <p className="text-[12px] text-muted-foreground">Chargement…</p>
      ) : !utilisateur.aDesDonnees ? (
        <p className="text-[12px] text-muted-foreground">
          Aucune donnée de carrière saisie pour l'instant (onglet Carrière).
        </p>
      ) : (
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="flex flex-col justify-between gap-4">
            <div>
              <DashEyebrow>{afficherConjoint ? 'Pension cumulée du foyer' : nomUtilisateur}</DashEyebrow>
              <div className="mt-2"><DashFigure value={totalAffiche} suffix="/ an" /></div>
              <p className="mt-2 text-[11px] text-ash">
                Euros constants {MILLESIME_COURANT.annee} (barèmes et revenus projetés au niveau de {MILLESIME_COURANT.annee}).
              </p>
            </div>
            {utilisateur.repartitionParRegime.rafpCapital > 0 && (
              <DashInset className="w-fit">
                <div className="flex items-center justify-between gap-6">
                  <span className="text-muted-foreground">Capital RAFP au départ</span>
                  <span className="font-medium tabular-nums">{formatEuro0(utilisateur.repartitionParRegime.rafpCapital)}</span>
                </div>
              </DashInset>
            )}
          </div>

          <div className="space-y-4">
            <BlocPersonnePension
              nom={nomUtilisateur}
              resultat={utilisateur}
              dot={DASH_INK}
              part={afficherConjoint && pensionCumulee > 0 ? utilisateur.pensionTotaleConsolidee / pensionCumulee : null}
            />
            {afficherConjoint && (
              <BlocPersonnePension
                nom={nomConjoint}
                resultat={conjoint}
                dot={DASH_MUTED}
                part={pensionCumulee > 0 ? conjoint.pensionTotaleConsolidee / pensionCumulee : null}
              />
            )}
            {utilisateur.dateCarriereLongue && utilisateur.dateEffet &&
              utilisateur.dateCarriereLongue.getTime() < utilisateur.dateEffet.getTime() && (
                <p className="text-[11px] text-positive">
                  Carrière longue : départ anticipé à taux plein possible dès le{' '}
                  {utilisateur.dateCarriereLongue.toLocaleDateString('fr-FR', { timeZone: 'UTC' })} (onglet Optimisation)
                </p>
              )}
            {utilisateur.salaireComplementaireEstPlafonne && (
              <p className="text-[11px] text-spark">
                Agirc-Arrco projeté sur un revenu plafonné au PASS (salaire brut total non renseigné).
              </p>
            )}
          </div>
        </div>
      )}
    </DashCard>
  );
};

// Ligne de personne : nom, part dans le foyer, bande en traits, montant, puis
// âge du taux plein et date de départ simulée.
const BlocPersonnePension = ({
  nom,
  resultat,
  dot,
  part,
}: {
  nom: string;
  resultat: ReturnType<typeof usePensionConsolidee>;
  dot: string;
  part: number | null;
}) => (
  <div className="space-y-1.5">
    <div className="flex items-baseline justify-between gap-3 text-[12px]">
      <span className="flex min-w-0 items-baseline gap-2">
        <span className="truncate">{nom}</span>
        {part !== null && <span className="tabular-nums text-ash">{Math.round(part * 100)} %</span>}
      </span>
      <span className="font-medium tabular-nums">{formatEuro0(resultat.pensionTotaleConsolidee)}</span>
    </div>
    {part !== null && <DashTickStrip ratio={part} lead={dot === DASH_INK} />}
    <div>
      <DashRow dot={dot} label="Âge du taux plein" value={resultat.ageTauxPlein} />
      {resultat.dateEffet && (
        <DashRow
          label="Départ simulé"
          value={resultat.dateEffet.toLocaleDateString('fr-FR', { timeZone: 'UTC' })}
        />
      )}
    </div>
  </div>
);

const LIBELLE_TRANCHE_CSG: Record<TrancheCSGPension, string> = {
  exoneration: 'exonéré de CSG',
  tauxReduit: 'CSG à 3,8 %',
  tauxMedian: 'CSG à 6,6 %',
  tauxNormal: 'CSG à 8,3 %',
};

const formatPct = (valeur: number) => `${(valeur * 100).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} %`;

type ResultatPersonne = ReturnType<typeof usePensionConsolidee>;

const LigneNet = ({ titre, resultat, tauxRemplacement }: { titre: string; resultat: ResultatNetRetraiteFoyer; tauxRemplacement: number | null }) => (
  <div>
    <DashEyebrow>{titre}</DashEyebrow>
    <div className="mt-2"><DashFigure value={resultat.netMensuel} size={30} suffix="net / mois" /></div>
    <div className="mt-3">
      <DashRow dot={DASH_INK} label="Pensions brutes" value={`${formatEuro0(resultat.pensionsBrutes)} / an`} />
      <DashRow
        label={`Prélèvements sociaux (${LIBELLE_TRANCHE_CSG[resultat.tranche]})`}
        value={`− ${formatEuro0(resultat.prelevementsSociaux)}`}
      />
      <DashRow label={`Impôt sur le revenu (TMI ${formatPct(resultat.tmi)})`} value={`− ${formatEuro0(resultat.impot)}`} />
      <DashRow dot={DASH_MUTED} label="Net annuel" value={`${formatEuro0(resultat.netAnnuel)} / an`} />
      {tauxRemplacement !== null && (
        <DashRow label="Taux de remplacement brut" value={formatPct(tauxRemplacement)} />
      )}
    </div>
  </div>
);

const CarteRevenuNet = ({ hasConjoint, nomUtilisateur, nomConjoint }: CartePensionFoyerProps) => {
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
    <DashCard title="Revenu net à la retraite" tag="Par mois" className="lg:col-span-2">
      <div className="space-y-5">
        <div className={lignes.length > 1 ? 'grid gap-5 md:grid-cols-2' : ''}>
          {lignes.map((l) => (
            <LigneNet key={l.titre} {...l} />
          ))}
        </div>
        {impositionCommune && (
          <p className="text-[11px] text-muted-foreground">
            Taux de remplacement brut : {nomUtilisateur}{' '}
            {remplacement(utilisateur) !== null ? formatPct(remplacement(utilisateur)!) : 'non calculable'} · {nomConjoint}{' '}
            {remplacement(conjoint) !== null ? formatPct(remplacement(conjoint)!) : 'non calculable'}
          </p>
        )}
        <div className="space-y-1 border-t border-border pt-3 text-[11px] text-ash">
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
        </div>
      </div>
    </DashCard>
  );
};

interface CarteConjointSurvivantProps extends CartePensionFoyerProps {
  statutCouple?: string;
}

// Revenu du survivant : sa pension propre + la réversion, imposé seul (veuf
// si marié, célibataire sinon — 1 part, sans enfant à charge).
const revenuSurvivant = (survivant: ResultatPersonne, defunt: ResultatPersonne, statut: StatutCouple) => {
  const propres = pensionsBrutes(survivant);
  const reversion = reversionPourSurvivant(defunt.assietteReversion, survivant.pensionTotaleConsolidee, statut);
  const situation: FoyerFiscalInput['situationFamille'] = statut === 'marie' ? 'veuf' : 'celibataire';
  const net = calculerNetRetraiteFoyer(
    [
      {
        base: propres.base + reversion.regimeGeneral + reversion.cnavpl + reversion.fonctionPublique + reversion.rafp,
        complementaires: propres.complementaires + reversion.agircArrco,
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
    ] as [string, number][]
  )
    .filter(([, montant]) => montant > 0)
    .map(([libelle, montant]) => `${libelle} ${formatEuro0(montant)}`)
    .join(', ');
  return (
    <DashInset className="px-4 py-4">
      <DashEyebrow>{titre}</DashEyebrow>
      <div className="mt-2"><DashFigure value={net.netMensuel} size={30} suffix="net / mois" /></div>
      <div className="mt-3">
        <DashRow dot={DASH_INK} label="Pension propre" value={`${formatEuro0(pensionPropre)} / an`} />
        <DashRow dot={DASH_MUTED} label="Réversion" value={`${formatEuro0(reversion.total)} / an`} muted={reversion.total === 0} />
      </div>
      {detail && <p className="mt-1 text-[11px] text-ash">{detail}</p>}
      {reversion.reduiteParPlafondRessources && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          Réversion du régime général réduite par le plafond de ressources (25 001,60 €/an pour une personne seule).
        </p>
      )}
      {netCoupleMensuel > 0 && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-full bg-destructive/10 px-3 py-1.5 text-[11px]">
          <span className="text-muted-foreground">Baisse du revenu du foyer</span>
          <span className="font-medium tabular-nums text-destructive">
            −{formatEuro0(perte)} / mois · {formatPct(perte / netCoupleMensuel)}
          </span>
        </div>
      )}
    </DashInset>
  );
};

const CarteConjointSurvivant = ({ hasConjoint, nomUtilisateur, nomConjoint, statutCouple }: CarteConjointSurvivantProps) => {
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
    <DashCard title="Protection du conjoint survivant" tag="Si décès" className="sm:col-span-2 lg:col-span-4">
      <div className="space-y-4">
        {statut !== 'marie' && (
          <p className="rounded-2xl border border-destructive/40 bg-background p-3 text-[12px] text-destructive">
            {statut === 'pacse' ? 'PACS' : 'Concubinage'} : aucune pension de réversion n'est versée, dans aucun régime.
            Seul le mariage ouvre ce droit — le survivant ne garde que sa propre pension.
          </p>
        )}
        <div>
          <DashEyebrow>Revenu net du couple retraité</DashEyebrow>
          <div className="mt-2"><DashFigure value={netCoupleMensuel} size={30} suffix="/ mois" /></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
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
        <div className="space-y-1 border-t border-border pt-3 text-[11px] text-ash">
          <p>
            Hypothèses : les deux conjoints sont retraités ; le survivant a au moins 55 ans, vit seul et ne se remarie
            pas. Ressources prises en compte pour le plafond du régime général : ses seules pensions (revenus du
            patrimoine ignorés — réversion possiblement surestimée).
          </p>
          <p>
            Non modélisés : majoration de 11,1 % des petites pensions après 65 ans, partage entre ex-conjoints,
            réversion des autres régimes à points (RCI, Ircantec…). Réversion CNAVPL alignée sur le régime général, à
            confirmer.
          </p>
        </div>
      </div>
    </DashCard>
  );
};

interface CarteTrimestresManquantsProps {
  personne: Personne;
  nom: string;
}

const CarteTrimestresManquants = ({ personne, nom }: CarteTrimestresManquantsProps) => {
  const { trimestresRequis, trimestresValidesTousRegimes, loading, aDesDonnees } = usePensionConsolidee(personne);

  // Même règle d'affichage que CartePension ci-dessus pour le conjoint.
  if (personne === 'conjoint' && !loading && !aDesDonnees) {
    return null;
  }

  const trimestresManquants = trimestresRequis - trimestresValidesTousRegimes;
  // 4 trimestres/an, en supposant une cotisation continue au rythme actuel —
  // pas de simulation d'interruption de carrière, cf. consigne.
  const anneesRestantes = trimestresManquants > 0 ? trimestresManquants / 4 : 0;

  return (
    <DashCard
      title="Trimestres"
      tag={nom}
      meta={!loading && aDesDonnees ? { count: trimestresValidesTousRegimes, label: `validés sur ${trimestresRequis} requis` } : undefined}
    >
      {loading ? (
        <p className="text-[12px] text-muted-foreground">Chargement…</p>
      ) : !aDesDonnees ? (
        <p className="text-[12px] text-muted-foreground">
          Aucune donnée de carrière saisie pour l'instant (onglet Carrière).
        </p>
      ) : (
        <div>
          <DashEyebrow>Trimestres manquants</DashEyebrow>
          <div className="mt-2">
            <DashFigure value={Math.max(0, trimestresManquants)} size={30} unit="trim." />
          </div>
          <div className="mt-4">
            <DashTickStrip ratio={trimestresRequis > 0 ? trimestresValidesTousRegimes / trimestresRequis : 0} />
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            {trimestresManquants <= 0
              ? 'Trimestres requis déjà atteints.'
              : `Soit environ ${anneesRestantes.toFixed(1).replace('.0', '')} an${anneesRestantes >= 2 ? 's' : ''} à cotisation continue au rythme actuel (4 trimestres/an).`}
          </p>
        </div>
      )}
    </DashCard>
  );
};

const CarteComplementsRetraite = () => (
  <DashCard title="Compléments de retraite" tag="PER, assurance-vie" variant="soon">
    <DashOrbit center={PiggyBank} satellites={[Landmark, Wallet, Shield]} />
    <DashSoonChip>Calcul détaillé à venir</DashSoonChip>
  </DashCard>
);

interface BoutonExportPDFProps {
  hasConjoint: boolean;
  nomUtilisateur: string;
  nomConjoint: string;
}

const BoutonExportPDF = ({ hasConjoint, nomUtilisateur, nomConjoint }: BoutonExportPDFProps) => {
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
      size="sm"
      className="gap-2"
      disabled={loading || !utilisateur.aDesDonnees || exportEnCours}
      onClick={handleExport}
    >
      <Download className="h-4 w-4" />
      {exportEnCours ? 'Génération en cours…' : 'Exporter en PDF'}
    </Button>
  );
};

export const Synthese = ({ hasConjoint, nomUtilisateur, nomConjoint, statutCouple }: SyntheseProps) => {
  const personnes = { hasConjoint, nomUtilisateur, nomConjoint };
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <BoutonExportPDF {...personnes} />
      </div>

      {/* Grille de la Vue d'ensemble (Dashboard.tsx) : 4 colonnes, plaques taupe. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CartePensionFoyer {...personnes} />
        <CarteTrimestresManquants personne="utilisateur" nom={nomUtilisateur} />
        {hasConjoint ? <CarteTrimestresManquants personne="conjoint" nom={nomConjoint} /> : <CarteComplementsRetraite />}

        <CarteRevenuNet {...personnes} />
        {hasConjoint && <CarteComplementsRetraite />}

        <CarteConjointSurvivant {...personnes} statutCouple={statutCouple} />
      </div>
    </div>
  );
};
