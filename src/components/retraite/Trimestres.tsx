import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRetraiteData, Personne } from '@/hooks/useRetraiteData';
import { useCarriereDetail } from '@/hooks/useCarriereDetail';
import {
  revenuAnnuelHypotheseDerniereAnneeConnue,
  salaireProjectionComplementaire,
} from '@/lib/retraite/hypotheseRevenuFutur';
import {
  separerRegimesPoints,
  estRegimeAgircArrco,
} from '@/lib/retraite/calculAgircArrco';
import { useProfilFamilialRetraite } from '@/hooks/useProfilFamilialRetraite';
import { donneesAutresRegimesDepuisRetraiteData } from '@/hooks/usePensionConsolidee';
import { nombreEnfantsEligiblesMajorationTroisEnfants } from '@/lib/retraite/enfantsEligiblesMajoration';
import { computeAge } from '@/lib/patrimoine/bareme669CGI';
import {
  trimestresRequisPourGeneration,
  dateAnniversaireLegal,
  tauxProratisation,
  decoteSurTrimestres,
  decoteSurAge,
  decoteApplicable,
  pensionBase,
  pensionComplementaireAnnuelle,
  coutRachatTrimestre,
  pointMort,
  dateNaissanceDepuisISO,
  dateEffetSimuleeParAge,
  dateDepuisISO,
  dateEffetDepartAgeLegal,
  ageEnMois,
  OptionRachat,
} from '@/lib/retraite/calcul';
import { trimestresCotisesEtAssimilesDepuisCarriere } from '@/lib/retraite/calculTrimestres';
import { creerSimulateurDepart } from '@/lib/retraite/simulationDepart';
import { deciderDateDepart, sexeDepuisCivilite } from '@/lib/retraite/decisionDepart';
import { calculerNetRetraiteFoyer } from '@/lib/retraite/calculNetRetraite';
import { calculerPartsFiscales } from '@/lib/fiscalite';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MILLESIME_COURANT, PARAMETRES_ESPERANCE_VIE } from '@/lib/retraite/parametres';

// Format ISO ("YYYY-MM-DD") d'une date UTC-midnight, pour la valeur d'un
// <input type="date"> — .toISOString() ne décale pas ce cas puisque
// dateEffetSimuleeParAge()/dateDepuisISO() construisent déjà un instant UTC
// à minuit (aucune conversion de fuseau horaire local en jeu).
const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const formatDate = (date: Date) => date.toLocaleDateString('fr-FR', { timeZone: 'UTC' });
const formatAge = (age: number) => {
  const ans = Math.floor(age + 1e-9);
  const mois = Math.round((age - ans) * 12);
  return mois > 0 ? `${ans} ans ${mois} mois` : `${ans} ans`;
};
const formatEuro0 = (valeur: number) =>
  valeur.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 });

// Foyer fiscal « personne seule » (1 part) pour le net indicatif de la décision de départ.
const partsPersonneSeule = calculerPartsFiscales({
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
});

const AGE_MIN = 60;
const AGE_MAX = 70;
const AGES_COMPARATIF = [58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70];
const TRIMESTRES_RACHAT_MIN = 1;
const TRIMESTRES_RACHAT_MAX = 12;

type RegimeRachat = 'salarieIndependant' | 'professionLiberale';

const formatEuro2 = (valeur: number) =>
  valeur.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

interface TrimestresProps {
  // Colonne conjoint (cf. RetraiteSection.tsx / ColonnesPersonnes.tsx) — même
  // convention que Carriere.tsx.
  personne?: Personne;
}

export const Trimestres = ({ personne = 'utilisateur' }: TrimestresProps = {}) => {
  const { data: retraiteData, loading: loadingRetraite } = useRetraiteData(personne);
  // Détail de carrière par année (import RIS), même source que Carriere.tsx —
  // nécessaire aux trimestres de surcote (classique/parentale,
  // cf. docs/audit/branchement-surcote-optimisation.md §1.3) : sans cette
  // donnée, la surcote resterait figée à 0 ici alors qu'elle ne l'est pas sur
  // l'écran Carrière pour le même client, ce qui romprait la parité visée.
  const { periodes: detailCarriere, loading: loadingCarriereDetail } = useCarriereDetail(personne);
  // Date de naissance et liens familiaux (majoration enfants FP/CNAVPL) :
  // même source que Carrière et Synthèse.
  const {
    dateNaissanceISO: dateNaissance,
    familyLinks,
    civilite,
    loading: loadingProfile,
  } = useProfilFamilialRetraite(personne);
  // Date de liquidation envisagée : source de vérité du scénario simulé
  // (Option 2, docs/audit/conception-date-effet.md) — l'âge de départ n'est
  // plus qu'une valeur dérivée affichée, cf. `resultatSelection.ageAffiche`
  // plus bas. Stockée en chaîne ISO ("YYYY-MM-DD"), format natif de
  // <input type="date"> (même convention que PeriodeCarriereEditDialog.tsx).
  const [dateLiquidation, setDateLiquidation] = useState<string>('');
  const [dateLiquidationInitialisee, setDateLiquidationInitialisee] = useState(false);

  // Rachat de trimestres — sandbox éphémère, aucune persistance.
  const [regimeRachat, setRegimeRachat] = useState<RegimeRachat>('salarieIndependant');
  const [optionRachat, setOptionRachat] = useState<OptionRachat>('tauxSeul');
  const [revenuMoyen3Ans, setRevenuMoyen3Ans] = useState<string>('');
  const [nombreTrimestresRachat, setNombreTrimestresRachat] = useState<string>('1');

  // Retraite progressive — sandbox éphémère, aucune persistance.
  const [dateProgressive, setDateProgressive] = useState<string>('');
  const [quotiteTempsPartiel, setQuotiteTempsPartiel] = useState<string>('60');

  // Décision de départ : taux d'actualisation (0 % par défaut, euros constants).
  const [tauxActualisation, setTauxActualisation] = useState<string>('0');

  const ageActuel = computeAge(dateNaissance);
  // Date de naissance complète (année + mois), pas seulement l'année : le
  // barème légal a des découpages infra-annuels (1951, 1961, 1965 — cf.
  // trimestresRequisPourGeneration()) qu'une simple année ne peut pas
  // résoudre. Auparavant tronquée ici via `.getFullYear()` — écart #3 de
  // l'audit référentiel (docs/audit/audit-retraite.md §7).
  const dateNaissanceDetail = dateNaissance ? dateNaissanceDepuisISO(dateNaissance) : undefined;

  // Initialise la date de liquidation sur le départ à l'âge légal (ou le
  // mois prochain si l'âge légal est déjà atteint), une seule fois, pour ne
  // pas écraser une sélection déjà faite par l'utilisateur.
  useEffect(() => {
    if (dateNaissanceDetail && ageActuel !== null && !dateLiquidationInitialisee) {
      const dateEffetLegal = dateEffetDepartAgeLegal(dateNaissanceDetail, new Date());
      setDateLiquidation(
        isoDate(dateEffetLegal ?? dateEffetSimuleeParAge(dateNaissanceDetail, Math.min(AGE_MAX, Math.max(AGE_MIN, ageActuel))))
      );
      setDateLiquidationInitialisee(true);
    }
  }, [dateNaissanceDetail, ageActuel, dateLiquidationInitialisee]);

  const trimestresValidesActuels = retraiteData.trimestres_valides || 0;
  const salaireAnnuelMoyen = retraiteData.salaire_annuel_moyen || 0;
  const regimesPoints = retraiteData.regimes_points || [];
  // Condition n°1 (déclarative) de la surcote parentale — déjà chargée par
  // useRetraiteData(), simplement pas encore lue ici (même champ que
  // Carriere.tsx, cf. docs/audit/branchement-surcote-optimisation.md §1.3).
  const auMoinsUnTrimestreMajorationEnfant = retraiteData.au_moins_un_trimestre_majoration_enfant || false;

  const { aUnRegimeAgircArrco } = separerRegimesPoints(regimesPoints);

  // Fonction publique / CNAVPL (données persistées, même conversion que la
  // Synthèse) : leurs trimestres comptent dans la durée tous régimes (décote,
  // condition de durée de la surcote) et leurs pensions dans le total.
  const { fonctionPublique, cnavpl } = donneesAutresRegimesDepuisRetraiteData(retraiteData);
  const trimestresAutresRegimes =
    (fonctionPublique?.trimestresLiquidables ?? 0) + (cnavpl?.trimestresCNAVPL ?? 0);
  const nombreEnfantsEligibles = nombreEnfantsEligiblesMajorationTroisEnfants(familyLinks);

  const regimesPointsExclusCount = regimesPoints.filter(
    (regime) => !estRegimeAgircArrco(regime.nom) && pensionComplementaireAnnuelle(regime) === undefined
  ).length;

  // Trimestres cotisés par année, dérivés du détail de carrière (import RIS)
  // — même calcul que Carriere.tsx, réutilisé tel quel pour les trimestres de
  // surcote classique et parentale plus bas.
  const resultatTrimestresDetailCarriere = useMemo(
    () => trimestresCotisesEtAssimilesDepuisCarriere(detailCarriere),
    [detailCarriere]
  );

  const loading = loadingRetraite || loadingProfile || loadingCarriereDetail;

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="border border-border">
          <CardContent className="py-8 text-center text-muted-foreground">Chargement...</CardContent>
        </Card>
      </div>
    );
  }

  if (!dateNaissance || ageActuel === null || dateNaissanceDetail === undefined) {
    return (
      <div className="space-y-6">
        <Card className="border border-border">
          <CardHeader className="p-5">
            <CardTitle className="text-[15px] font-semibold tracking-tight">Simulation d'âge de départ</CardTitle>
            <CardDescription className="text-xs">
              Simulez l'impact de votre âge de départ sur votre pension
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <p className="text-xs text-muted-foreground">
              Votre date de naissance n'est pas renseignée. Elle est nécessaire pour déterminer le
              nombre de trimestres requis pour votre génération et calculer la décote ou la surcote
              selon votre âge de départ simulé. Renseignez-la dans{' '}
              <Link to="/dashboard/famille" className="text-primary underline">
                votre fiche famille
              </Link>{' '}
              (cliquez sur votre profil pour l'éditer), puis revenez sur cette page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Narrowing explicite : garantit que les closures ci-dessous capturent des
  // valeurs non nullables, indépendamment de l'inférence TS sur les closures.
  const ageActuelConfirme: number = ageActuel;
  const dateNaissanceConfirmee = dateNaissanceDetail;

  // Salaire de projection des points Agirc-Arrco : salaire brut total saisi,
  // sinon revenu de l'hypothèse de revenu futur (plafonné au PASS en mode RIS).
  const revenuHypothese =
    (retraiteData.mode_hypothese_revenu_futur ?? 'derniere_annee_connue') === 'derniere_annee_connue'
      ? revenuAnnuelHypotheseDerniereAnneeConnue(resultatTrimestresDetailCarriere.parAnnee)
      : retraiteData.revenu_hypothese_manuel ?? null;
  const salaireComplementaire = salaireProjectionComplementaire(retraiteData.salaire_brut_annuel, revenuHypothese);

  // Simulation par date de départ : moteur pur partagé avec la décision de
  // départ (simulationDepart.ts) — base, décote/surcote, départs anticipés,
  // Agirc-Arrco, fonction publique, CNAVPL.
  const simulateur = creerSimulateurDepart({
    dateNaissance: dateNaissanceConfirmee,
    aujourdHui: new Date(),
    trimestresValidesActuels,
    salaireAnnuelMoyen,
    regimesPoints,
    auMoinsUnTrimestreMajorationEnfant,
    trimestresCarriere: resultatTrimestresDetailCarriere,
    fonctionPublique,
    cnavpl,
    nombreEnfantsEligibles,
    salaireComplementaire: salaireComplementaire?.salaireAnnuel ?? null,
    ageDepartAnticipeConfirme: retraiteData.depart_anticipe_confirme_motif
      ? retraiteData.depart_anticipe_confirme_age ?? null
      : null,
  });
  const { carriereLongue, dateEffetAgeLegal, dateDepartAuPlusTot, departAnticipeOuvertA, complementairesPourDepart } =
    simulateur;
  const moisProchain = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 1));

  const dateLiquidationMin = isoDate(dateDepartAuPlusTot ?? dateEffetSimuleeParAge(dateNaissanceConfirmee, AGE_MIN));
  const dateLiquidationMax = isoDate(dateEffetSimuleeParAge(dateNaissanceConfirmee, AGE_MAX));
  // Repli avant que l'effet d'initialisation n'ait posé la valeur par défaut
  // (premier rendu, dateLiquidation encore vide).
  const dateLiquidationEffet = dateLiquidation
    ? dateDepuisISO(dateLiquidation)
    : dateEffetAgeLegal ?? dateEffetSimuleeParAge(dateNaissanceConfirmee, Math.min(AGE_MAX, Math.max(AGE_MIN, ageActuelConfirme)));

  const simulerPourDateEffet = (dateEffet: Date) => ({
    ...simulateur.simuler(dateEffet),
    ageAffiche: computeAge(dateNaissance, dateEffet) ?? ageActuelConfirme,
  });

  // Tableau comparatif par âge fixe (62-70 ans, cf. plus bas) : pas un
  // contrôle de saisie, seulement une liste de scénarios de référence —
  // reste piloté par âge via l'ancien proxy `dateEffetSimuleeParAge()`,
  // inchangé par cette session (point d'entrée interne, cf.
  // docs/audit/implementation-date-effet-ui.md §1).
  // Date d'effet d'une ligne « N ans » : 1er du mois suivant le mois
  // anniversaire (âge révolu de N ans 0 mois, cf. ageEnMois()) — et non le
  // 1er du mois anniversaire, qui ferait compter un trimestre de décote en
  // trop.
  const simulerPourAge = (age: number) =>
    simulerPourDateEffet(
      new Date(Date.UTC(dateNaissanceConfirmee.annee + age, dateNaissanceConfirmee.mois, 1))
    );

  const resultatSelection = simulerPourDateEffet(dateLiquidationEffet);
  // Pourcentage combiné affiché — même convention que Carriere.tsx (somme
  // décote + surcote pour l'indicateur unique), `decote` étant toujours ≤ 0
  // et `surcoteTotalePct` toujours ≥ 0 après l'écrêtage ci-dessus.
  const decoteOuSurcoteSelection = resultatSelection.decote + resultatSelection.surcoteTotalePct;

  // Rachat de trimestres : le coût dépend de l'âge actuel (âge auquel le
  // rachat serait effectué aujourd'hui), pas de la date de liquidation
  // simulée. Les trimestres rachetés viennent s'ajouter aux trimestres
  // projetés à la date de liquidation ci-dessus, pour recalculer la pension
  // de base.
  const revenuMoyen3AnsNum = parseFloat(revenuMoyen3Ans) || 0;
  const nombreTrimestresRachatNum = Math.min(
    TRIMESTRES_RACHAT_MAX,
    Math.max(0, parseInt(nombreTrimestresRachat) || 0)
  );

  const coutUnitaireRachat =
    regimeRachat === 'salarieIndependant'
      ? coutRachatTrimestre(ageActuelConfirme, revenuMoyen3AnsNum, optionRachat)
      : undefined;

  const coutTotalRachat =
    coutUnitaireRachat !== undefined ? coutUnitaireRachat * nombreTrimestresRachatNum : undefined;

  // Option « taux seul » : les trimestres rachetés ne comptent que pour la
  // décote, pas pour la durée d'assurance du régime général (proratisation).
  // Option « taux et durée » : les deux.
  const tauxAvecRachat = tauxProratisation(
    resultatSelection.trimestresValidesProjetes + (optionRachat === 'tauxEtDuree' ? nombreTrimestresRachatNum : 0),
    resultatSelection.trimestresRequis
  );
  // Même écrêtage de la branche fautive que dans simulerPourDateEffet()
  // ci-dessus (cf. commentaire associé). La surcote n'est pas recalculée ici
  // pour l'hypothèse « avec rachat » : le rachat porte uniquement sur des
  // trimestres manquants (réduction de la décote), il ne recrée pas de
  // trimestres cotisés dans l'année de référence de la surcote — le montant
  // de surcote (`resultatSelection.surcoteTotalePct`, gelé sur le scénario
  // sans rachat) est donc réutilisé tel quel plutôt que remodélisé, pour
  // éviter que "Gain de pension" ne paraisse faussement négatif si la
  // sélection sans rachat inclut déjà une surcote. Documenté comme
  // simplification assumée (sandbox éphémère, hors périmètre d'un modèle
  // rachat/surcote), cf. docs/audit/branchement-surcote-optimisation.md §2.
  const decoteAvecRachat = departAnticipeOuvertA(dateLiquidationEffet) !== null ? 0 : Math.min(
    decoteApplicable(
      decoteSurTrimestres(
        resultatSelection.trimestresTousRegimes + nombreTrimestresRachatNum,
        resultatSelection.trimestresRequis
      ),
      decoteSurAge(resultatSelection.ageDepartAnnees)
    ),
    0
  );
  const pensionBaseBruteAvecRachat = pensionBase(salaireAnnuelMoyen, tauxAvecRachat, 0);
  const pensionBaseAvecRachat =
    pensionBaseBruteAvecRachat * (1 + decoteAvecRachat / 100) +
    pensionBaseBruteAvecRachat * (resultatSelection.surcoteTotalePct / 100);
  // Le rachat supprime aussi tout ou partie de l'abattement Agirc-Arrco
  // (coefficient d'anticipation lié à la décote de la base) : gain inclus.
  const complementairesAvecRachat = complementairesPourDepart(
    decoteAvecRachat,
    resultatSelection.ageDepartAnnees,
    resultatSelection.trimestresRequis - resultatSelection.trimestresTousRegimes - nombreTrimestresRachatNum,
    resultatSelection.trimestresProjetes
  );
  const gainComplementairesRachat = complementairesAvecRachat - resultatSelection.pensionComplementaires;
  const gainPensionAnnuelRachat =
    pensionBaseAvecRachat - resultatSelection.pensionBaseValue + gainComplementairesRachat;
  const pointMortRachat =
    coutTotalRachat !== undefined && gainPensionAnnuelRachat > 0
      ? pointMort(coutTotalRachat, gainPensionAnnuelRachat)
      : undefined;

  // Décision « quand partir ? » (decisionDepart.ts).
  const sexe = sexeDepuisCivilite(civilite);
  const decision = deciderDateDepart({
    simulateur,
    dateNaissance: dateNaissanceConfirmee,
    sexe,
    tauxActualisation: Math.min(0.03, Math.max(0, (parseFloat(tauxActualisation) || 0) / 100)),
  });
  const donneesGraphique = decision.lignes.map((l) => ({ age: l.simulation.ageDepartAnnees, cumul: l.cumul }));

  // Retraite progressive : dès 60 ans, 150 trimestres tous régimes, temps
  // partiel de 40 à 80 % ; fraction de pension = 100 % − temps de travail,
  // appliquée à la pension provisoire calculée à la date de début.
  // Au plus tôt le 1er du mois suivant les 60 ans, et le mois prochain.
  const anniversaire60 = dateAnniversaireLegal(dateNaissanceConfirmee, { ans: 60, mois: 0 });
  const dateProgressiveMin = new Date(
    Math.max(
      moisProchain.getTime(),
      Date.UTC(anniversaire60.getUTCFullYear(), anniversaire60.getUTCMonth() + 1, 1)
    )
  );
  const dateProgressiveEffet = dateProgressive ? dateDepuisISO(dateProgressive) : dateProgressiveMin;
  const progressive = simulerPourDateEffet(dateProgressiveEffet);
  const quotiteProgressive = parseFloat(quotiteTempsPartiel) || 0;
  const fractionProgressive = Math.max(0, 1 - quotiteProgressive / 100);
  const progressiveEligible =
    progressive.ageDepartAnnees >= 60 &&
    progressive.trimestresTousRegimes >= 150 &&
    quotiteProgressive >= 40 &&
    quotiteProgressive <= 80;
  const salaireProgressive = salaireComplementaire ? salaireComplementaire.salaireAnnuel * (quotiteProgressive / 100) : 0;

  return (
    <div className="space-y-6">
      <Card className="border border-border">
        <CardHeader className="p-5">
          <CardTitle className="text-[15px] font-semibold tracking-tight">Simulation de départ à la retraite</CardTitle>
          <CardDescription className="text-xs">
            Simulation indicative, ne remplace pas un relevé officiel de l'Assurance retraite.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="date-liquidation" className="text-xs font-medium">
                Date de liquidation envisagée
              </label>
              <span className="text-sm font-semibold text-primary">
                {resultatSelection.ageAffiche} ans
              </span>
            </div>
            <Input
              id="date-liquidation"
              type="date"
              value={dateLiquidation || dateLiquidationEffet.toISOString().slice(0, 10)}
              min={dateLiquidationMin}
              max={dateLiquidationMax}
              onChange={(e) => setDateLiquidation(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Âge calculé automatiquement à partir de cette date et de votre date de naissance —
              simulation possible de l'âge légal à {AGE_MAX} ans.
            </p>
            {resultatSelection.avantAgeLegal && (
              <p className="text-xs text-destructive">
                Cette date précède l'âge légal de départ et aucun départ anticipé n'est ouvert à cette date.
              </p>
            )}
            {resultatSelection.departAnticipe && (
              <p className="text-xs text-positive">
                Départ avant l'âge légal au titre{' '}
                {resultatSelection.departAnticipe === 'carriere_longue'
                  ? 'de la carrière longue'
                  : "du départ anticipé confirmé par la caisse"}{' '}
                : pension du régime général à taux plein.
              </p>
            )}
            {dateEffetAgeLegal && dateDepartAuPlusTot && dateDepartAuPlusTot.getTime() < dateEffetAgeLegal.getTime() && (
              <p className="text-xs text-muted-foreground">
                Âge légal : départ au {formatDate(dateEffetAgeLegal)} ; départ anticipé possible dès le{' '}
                {formatDate(dateDepartAuPlusTot)}.
              </p>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="text-center p-3 border rounded-lg">
              <div className="text-xl font-bold text-primary">
                {resultatSelection.trimestresValidesProjetes}
              </div>
              <div className="text-xs text-muted-foreground">Trimestres validés projetés</div>
              {trimestresAutresRegimes > 0 && (
                <div className="text-xs text-muted-foreground">
                  {resultatSelection.trimestresTousRegimes} tous régimes
                </div>
              )}
            </div>

            <div className="text-center p-3 border rounded-lg">
              <div className="text-xl font-bold">{resultatSelection.trimestresRequis}</div>
              <div className="text-xs text-muted-foreground">Trimestres requis</div>
            </div>

            <div className="text-center p-3 border rounded-lg">
              <div
                className={`text-xl font-bold ${
                  decoteOuSurcoteSelection < 0
                    ? 'text-destructive'
                    : decoteOuSurcoteSelection > 0
                    ? 'text-positive'
                    : 'text-muted-foreground'
                }`}
              >
                {decoteOuSurcoteSelection > 0 ? '+' : ''}
                {decoteOuSurcoteSelection.toFixed(2)}%
              </div>
              <div className="text-xs text-muted-foreground">Décote / surcote applicable</div>
            </div>
          </div>

          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">
              Pension totale consolidée à {resultatSelection.ageAffiche} ans (base + complémentaire)
            </div>
            <div className="text-lg font-semibold text-primary">
              {formatEuro2(resultatSelection.pensionTotale)} / an
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pension de base : {formatEuro2(resultatSelection.pensionBaseValue)} + pensions
              complémentaires calculables : {formatEuro2(resultatSelection.pensionComplementaires)}
              {resultatSelection.pensionAutresRegimes > 0 && (
                <> + fonction publique / CNAVPL : {formatEuro2(resultatSelection.pensionAutresRegimes)}</>
              )}
            </p>
            {regimesPointsExclusCount > 0 && (
              <p className="text-xs text-spark mt-1">
                {regimesPointsExclusCount} régime{regimesPointsExclusCount > 1 ? 's' : ''} non
                inclus, valeur du point manquante
              </p>
            )}
            {resultatSelection.rafpCapital > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                RAFP versée en capital (moins de 5 125 points), hors pension annuelle :{' '}
                {formatEuro2(resultatSelection.rafpCapital)}
              </p>
            )}
            {aUnRegimeAgircArrco && salaireComplementaire?.estPlafonne && (
              <p className="text-xs text-spark mt-1">
                Points Agirc-Arrco futurs projetés sur un revenu plafonné au PASS : renseignez le salaire
                brut total dans l'onglet Carrière pour un cadre.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border">
        <CardHeader className="p-5">
          <CardTitle className="text-[15px] font-semibold tracking-tight">Quand partir ?</CardTitle>
          <CardDescription className="text-xs">
            Pensions cumulées jusqu'à {formatAge(decision.ageReference)} (espérance de vie INSEE{' '}
            {PARAMETRES_ESPERANCE_VIE.annee}
            {sexe ? (sexe === 'femme' ? ', femmes' : ', hommes') : ', moyenne hommes-femmes'}), selon la date de départ
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-4">
          {!decision.meilleure ? (
            <p className="text-xs text-muted-foreground">Aucune date de départ calculable.</p>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="p-3 border rounded-lg">
                  <div className="text-xs text-muted-foreground">Meilleur cumul</div>
                  <div className="text-lg font-semibold text-primary">
                    {formatDate(decision.meilleure.simulation.dateEffet)} ({formatAge(decision.meilleure.simulation.ageDepartAnnees)})
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatEuro0(decision.meilleure.cumul)} cumulés · {formatEuro0(decision.meilleure.simulation.pensionTotale)} / an
                  </div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="text-xs text-muted-foreground">Premier départ possible</div>
                  <div className="text-lg font-semibold">
                    {formatDate(decision.lignes[0].simulation.dateEffet)} ({formatAge(decision.lignes[0].simulation.ageDepartAnnees)})
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatEuro0(decision.lignes[0].cumul)} cumulés · {formatEuro0(decision.lignes[0].simulation.pensionTotale)} / an
                  </div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="text-xs text-muted-foreground">Taux plein</div>
                  <div className="text-lg font-semibold">
                    {decision.premiereDateTauxPlein ? formatDate(decision.premiereDateTauxPlein) : 'non atteint avant 70 ans'}
                  </div>
                </div>
              </div>

              <p className="text-xs">
                {decision.meilleureSiVieCourte?.getTime() === decision.meilleure.simulation.dateEffet.getTime() &&
                decision.meilleureSiVieLongue?.getTime() === decision.meilleure.simulation.dateEffet.getTime()
                  ? "Recommandation robuste : la meilleure date ne change pas avec une espérance de vie de ±5 ans."
                  : `Recommandation sensible à la longévité : meilleure date au ${
                      decision.meilleureSiVieCourte ? formatDate(decision.meilleureSiVieCourte) : '—'
                    } avec 5 ans de vie en moins, au ${
                      decision.meilleureSiVieLongue ? formatDate(decision.meilleureSiVieLongue) : '—'
                    } avec 5 ans de plus.`}
              </p>

              <div className="h-56" role="img" aria-label="Pensions cumulées selon l'âge de départ">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={donneesGraphique} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                    <XAxis dataKey="age" tickFormatter={(v: number) => `${Math.floor(v)} ans`} className="text-xs" />
                    <YAxis tickFormatter={(v: number) => `${Math.round(v / 1000)} k€`} className="text-xs" width={56} />
                    <Tooltip
                      formatter={(v: number) => [formatEuro0(v), 'Pensions cumulées']}
                      labelFormatter={(v: number) => `Départ à ${formatAge(v)}`}
                    />
                    <Line type="monotone" dataKey="cumul" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center gap-3">
                <Label htmlFor="taux-actualisation" className="text-xs">Taux d'actualisation (%/an)</Label>
                <Input
                  id="taux-actualisation"
                  type="number"
                  min={0}
                  max={3}
                  step={0.5}
                  value={tauxActualisation}
                  onChange={(e) => setTauxActualisation(e.target.value)}
                  className="max-w-[100px]"
                />
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Départ</TableHead>
                    <TableHead>Pension brute / an</TableHead>
                    <TableHead>Net indicatif / mois</TableHead>
                    <TableHead>Cumul</TableHead>
                    <TableHead>Rattrapage du 1er départ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {decision.lignes
                    .filter((_, i) => i % 4 === 0 || decision.lignes[i] === decision.meilleure)
                    .map((l) => (
                      <TableRow
                        key={l.simulation.dateEffet.toISOString()}
                        className={l === decision.meilleure ? 'bg-muted/50' : undefined}
                      >
                        <TableCell>
                          {formatDate(l.simulation.dateEffet)} ({formatAge(l.simulation.ageDepartAnnees)})
                        </TableCell>
                        <TableCell>{formatEuro0(l.simulation.pensionTotale)}</TableCell>
                        <TableCell>
                          {formatEuro0(
                            calculerNetRetraiteFoyer(
                              [
                                {
                                  base: l.simulation.pensionTotale - l.simulation.pensionComplementaires,
                                  complementaires: l.simulation.pensionComplementaires,
                                },
                              ],
                              partsPersonneSeule,
                              'celibataire'
                            ).netMensuel
                          )}
                        </TableCell>
                        <TableCell>{formatEuro0(l.cumul)}</TableCell>
                        <TableCell>
                          {l === decision.lignes[0]
                            ? '—'
                            : l.ageRecuperation === null
                            ? 'jamais'
                            : l.ageRecuperation > decision.ageReference
                            ? `${formatAge(l.ageRecuperation)} (après l'âge de référence)`
                            : formatAge(l.ageRecuperation)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>

              <div className="space-y-1 text-xs text-muted-foreground">
                <p>
                  Tableau : une date par an (et la meilleure) ; le graphique couvre chaque trimestre. Pensions brutes tous
                  régimes, en euros constants, capital RAFP compris. Net indicatif : personne seule, 1 part, pensions
                  seules.
                </p>
                <p>
                  Espérances de vie « du moment » (INSEE) : elles sous-estiment la longévité des générations actuelles, ce
                  qui avantage les départs précoces. Les salaires d'une activité poursuivie ne sont pas comptés : continuer
                  à travailler apporte en plus un revenu d'activité.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border border-border">
        <CardHeader className="p-5">
          <CardTitle className="text-[15px] font-semibold tracking-tight">Rachat de trimestres</CardTitle>
          <CardDescription className="text-xs">
            Simulation indicative du coût et de la rentabilité d'un versement pour la retraite (rachat de
            trimestres), à l'âge de départ simulé ci-dessus.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Régime</Label>
            <RadioGroup
              value={regimeRachat}
              onValueChange={(value) => setRegimeRachat(value as RegimeRachat)}
              className="space-y-1.5"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="salarieIndependant" id="regime-salarie-independant" />
                <label htmlFor="regime-salarie-independant" className="text-xs">
                  Salarié ou indépendant (régime général / SSI)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="professionLiberale" id="regime-profession-liberale" />
                <label htmlFor="regime-profession-liberale" className="text-xs">
                  Profession libérale réglementée (CIPAV, CARMF, CARPIMKO...)
                </label>
              </div>
            </RadioGroup>
          </div>

          {regimeRachat === 'professionLiberale' ? (
            <p className="text-xs text-muted-foreground">
              Le coût du rachat pour votre régime n'est pas public — contactez votre caisse (CIPAV,
              CARMF, CARPIMKO...) pour un devis personnalisé.
            </p>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="revenu-moyen-3-ans" className="text-xs">Revenu moyen des 3 dernières années (€)</Label>
                  <Input
                    id="revenu-moyen-3-ans"
                    type="number"
                    placeholder="Ex: 32000"
                    value={revenuMoyen3Ans}
                    onChange={(e) => setRevenuMoyen3Ans(e.target.value)}
                    className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nombre-trimestres-rachat" className="text-xs">Nombre de trimestres à racheter</Label>
                  <Input
                    id="nombre-trimestres-rachat"
                    type="number"
                    min={TRIMESTRES_RACHAT_MIN}
                    max={TRIMESTRES_RACHAT_MAX}
                    value={nombreTrimestresRachat}
                    onChange={(e) => setNombreTrimestresRachat(e.target.value)}
                    className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Option de rachat</Label>
                <RadioGroup
                  value={optionRachat}
                  onValueChange={(value) => setOptionRachat(value as OptionRachat)}
                  className="space-y-1.5"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="tauxSeul" id="option-taux-seul" />
                    <label htmlFor="option-taux-seul" className="text-xs">
                      Taux seul (réduit uniquement la décote)
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="tauxEtDuree" id="option-taux-et-duree" />
                    <label htmlFor="option-taux-et-duree" className="text-xs">
                      Taux et durée d'assurance (réduit la décote et augmente la proratisation)
                    </label>
                  </div>
                </RadioGroup>
              </div>

              {coutUnitaireRachat === undefined ? (
                <p className="text-xs text-spark">
                  Rachat non disponible au-delà de 66 ans (votre âge actuel : {ageActuelConfirme} ans).
                </p>
              ) : (
                <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <div className="text-xs text-muted-foreground">Coût total du rachat</div>
                      <div className="text-lg font-semibold text-primary">
                        {coutTotalRachat !== undefined ? formatEuro2(coutTotalRachat) : '—'}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatEuro2(coutUnitaireRachat)} / trimestre × {nombreTrimestresRachatNum}
                      </p>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Nouvelle pension de base à {resultatSelection.ageAffiche} ans
                      </div>
                      <div className="text-lg font-semibold text-primary">
                        {formatEuro2(pensionBaseAvecRachat)} / an
                      </div>
                      <p className="text-xs text-muted-foreground">
                        contre {formatEuro2(resultatSelection.pensionBaseValue)} / an sans rachat
                      </p>
                    </div>
                  </div>

                  {gainPensionAnnuelRachat > 0 ? (
                    <p className="text-xs">
                      Gain de pension : <span className="font-semibold text-positive">
                        +{formatEuro2(gainPensionAnnuelRachat)} / an
                      </span>
                      {gainComplementairesRachat > 0 && (
                        <> dont {formatEuro2(gainComplementairesRachat)} d'abattement Agirc-Arrco supprimé</>
                      )}
                      {pointMortRachat !== undefined && coutTotalRachat !== undefined && (
                        <> — point mort : <span className="font-semibold">{pointMortRachat.toFixed(1)} ans</span> (brut, sans fiscalité)</>
                      )}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      À {resultatSelection.ageAffiche} ans, vos trimestres validés projetés couvrent déjà les trimestres
                      requis : ce rachat n'améliore pas la pension de base à cet âge de départ.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border border-border">
        <CardHeader className="p-5">
          <CardTitle className="text-[15px] font-semibold tracking-tight">Comparatif par âge de départ</CardTitle>
          <CardDescription className="text-xs">
            Pension totale estimée pour chaque âge de départ possible, jusqu'à 70 ans
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Âge de départ</TableHead>
                <TableHead>Trimestres validés projetés</TableHead>
                <TableHead>Décote / surcote</TableHead>
                <TableHead>Pension de base</TableHead>
                <TableHead>Pension totale</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {AGES_COMPARATIF.map((age) => {
                const resultat = simulerPourAge(age);
                if (resultat.avantAgeLegal && age < 62) return null;
                if (resultat.avantAgeLegal) {
                  return (
                    <TableRow key={age}>
                      <TableCell className="font-medium">{age} ans</TableCell>
                      <TableCell colSpan={4} className="text-xs text-muted-foreground">
                        Avant l'âge légal — départ impossible hors dispositifs de départ anticipé
                      </TableCell>
                    </TableRow>
                  );
                }
                const decoteOuSurcoteLigne = resultat.decote + resultat.surcoteTotalePct;
                return (
                  <TableRow
                    key={age}
                    className={age === resultatSelection.ageAffiche ? 'bg-muted/50' : undefined}
                  >
                    <TableCell className="font-medium">
                      {age} ans
                      {resultat.departAnticipe && (
                        <span className="block text-xs text-muted-foreground">
                          {resultat.departAnticipe === 'carriere_longue' ? 'carrière longue' : 'départ anticipé confirmé'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{resultat.trimestresValidesProjetes}</TableCell>
                    <TableCell
                      className={
                        decoteOuSurcoteLigne < 0
                          ? 'text-destructive'
                          : decoteOuSurcoteLigne > 0
                          ? 'text-positive'
                          : undefined
                      }
                    >
                      {decoteOuSurcoteLigne > 0 ? '+' : ''}
                      {decoteOuSurcoteLigne.toFixed(2)}%
                    </TableCell>
                    <TableCell>{formatEuro2(resultat.pensionBaseValue)}</TableCell>
                    <TableCell className="font-semibold">
                      {formatEuro2(resultat.pensionTotale)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border border-border">
        <CardHeader className="p-5">
          <CardTitle className="text-[15px] font-semibold tracking-tight">Retraite anticipée pour carrière longue</CardTitle>
          <CardDescription className="text-xs">
            Conditions de la circulaire Cnav n° 2026-29 (pensions prenant effet à compter du 01/09/2026)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-3">
          {carriereLongue.options.length === 0 ? (
            <p className="text-xs text-muted-foreground">Génération hors barème de la carrière longue.</p>
          ) : (
            <>
              {carriereLongue.premiereDateEligible ? (
                <p className="text-sm font-semibold text-positive">
                  Départ anticipé possible dès le {formatDate(carriereLongue.premiereDateEligible)}, à taux plein.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Conditions de la carrière longue non réunies.</p>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Début d'activité avant</TableHead>
                    <TableHead>Départ à</TableHead>
                    <TableHead>Condition de début</TableHead>
                    <TableHead>Durée cotisée</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {carriereLongue.options.map((o) => (
                    <TableRow key={o.debutAvant}>
                      <TableCell>{o.debutAvant} ans</TableCell>
                      <TableCell>
                        {o.ageDepart.ans} ans{o.ageDepart.mois > 0 ? ` ${o.ageDepart.mois} mois` : ''} ({formatDate(o.dateEffet)})
                      </TableCell>
                      <TableCell>{o.debutActiviteRempli ? 'remplie' : 'non remplie'}</TableCell>
                      <TableCell className={o.dureeCotisee >= o.dureeRequise ? 'text-positive' : 'text-destructive'}>
                        {o.dureeCotisee} / {o.dureeRequise} trimestres
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground">
                Début d'activité : 5 trimestres validés à la fin de l'année de l'anniversaire (4 si né au 4e trimestre).
                Durée cotisée : trimestres cotisés (projetés jusqu'au départ, autres régimes de base compris) + maternité
                + maladie et chômage indemnisé (4 trimestres chacun au plus). Service national, invalidité, AVPF,
                majorations pour enfants et rachats ne sont pas visibles au relevé et ne sont pas comptés : à vérifier
                auprès de la caisse, ils peuvent ouvrir le droit plus tôt.
              </p>
              <p className="text-xs text-muted-foreground">
                Taux plein appliqué au régime général et à l'Agirc-Arrco ; les pensions fonction publique et CNAVPL
                gardent leur propre décote (dispositifs de carrière longue propres non modélisés).
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border border-border">
        <CardHeader className="p-5">
          <CardTitle className="text-[15px] font-semibold tracking-tight">Retraite progressive</CardTitle>
          <CardDescription className="text-xs">
            Dès 60 ans avec 150 trimestres tous régimes et un temps partiel de 40 à 80 %
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="date-retraite-progressive" className="text-xs">Début de la retraite progressive</Label>
              <Input
                id="date-retraite-progressive"
                type="date"
                value={dateProgressive || isoDate(dateProgressiveEffet)}
                min={isoDate(dateProgressiveMin)}
                onChange={(e) => setDateProgressive(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quotite-temps-partiel" className="text-xs">Temps de travail (% d'un temps plein)</Label>
              <Input
                id="quotite-temps-partiel"
                type="number"
                min={40}
                max={80}
                value={quotiteTempsPartiel}
                onChange={(e) => setQuotiteTempsPartiel(e.target.value)}
              />
            </div>
          </div>
          {!progressiveEligible ? (
            <p className="text-xs text-destructive">
              Conditions non remplies à cette date :{' '}
              {[
                progressive.ageDepartAnnees < 60 ? 'moins de 60 ans' : null,
                progressive.trimestresTousRegimes < 150 ? `${progressive.trimestresTousRegimes} trimestres sur 150` : null,
                quotiteProgressive < 40 || quotiteProgressive > 80 ? 'temps de travail hors 40-80 %' : null,
              ]
                .filter(Boolean)
                .join(', ')}
              .
            </p>
          ) : (
            <div className="p-3 bg-muted/50 rounded-lg space-y-1">
              <div className="text-lg font-semibold text-primary">
                {formatEuro2((fractionProgressive * progressive.pensionTotale + salaireProgressive) / 12)} / mois brut
              </div>
              <p className="text-xs text-muted-foreground">
                Fraction de pension {Math.round(fractionProgressive * 100)} % × pension provisoire{' '}
                {formatEuro2(progressive.pensionTotale)} / an = {formatEuro2(fractionProgressive * progressive.pensionTotale)} / an
                {salaireProgressive > 0 && <> + salaire à temps partiel {formatEuro2(salaireProgressive)} / an</>}
              </p>
              <p className="text-xs text-muted-foreground">
                La pension provisoire est calculée comme si la liquidation intervenait à cette date (décote comprise) ;
                les cotisations versées pendant la retraite progressive sont reprises au départ définitif, où la
                pension est recalculée.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-border">
        <CardHeader className="p-5">
          <CardTitle className="text-[15px] font-semibold tracking-tight">Cumul emploi-retraite</CardTitle>
          <CardDescription className="text-xs">Règles applicables à la date de liquidation simulée ci-dessus</CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-2 text-xs text-muted-foreground">
          {dateLiquidationEffet.getTime() < Date.UTC(2027, 0, 1) ? (
            <>
              <p>
                Liquidation avant le 01/01/2027 :{' '}
                {resultatSelection.decote === 0
                  ? 'retraite à taux plein — cumul intégral possible, sans plafond, une fois toutes les pensions liquidées.'
                  : 'retraite décotée — cumul plafonné (revenus au-delà du plafond réduisant la pension).'}
              </p>
              <p>
                Un cumul intégral ouvre une seconde pension de base, plafonnée à 5 % du PASS (
                {formatEuro2(0.05 * MILLESIME_COURANT.pass)} / an en {MILLESIME_COURANT.annee}).
              </p>
            </>
          ) : (
            <p>
              Liquidation à compter du 01/01/2027 : nouvelles règles de l'article 102 de la LFSS 2026 — revenus
              d'activité réduisant la pension avant l'âge légal, cumul plafonné entre l'âge légal et 67 ans, cumul
              intégral (avec nouveaux droits) à partir de 67 ans. Seuils fixés par décrets non publiés à ce jour :
              non chiffrés ici.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
