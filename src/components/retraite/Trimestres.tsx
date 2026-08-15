import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRetraiteData, Personne } from '@/hooks/useRetraiteData';
import { useCarriereDetail } from '@/hooks/useCarriereDetail';
import { familyService } from '@/services/familyService';
import { computeAge } from '@/lib/patrimoine/bareme669CGI';
import {
  trimestresRequisPourGeneration,
  ageLegalPourGeneration,
  ageLegalAtteint,
  ageLegalParentaleEligible,
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
  surcotePourTrimestresCotises,
  surcoteParentale,
  surcoteTotale,
  OptionRachat,
} from '@/lib/retraite/calcul';
import { trimestresCotisesEtAssimilesDepuisCarriere } from '@/lib/retraite/calculTrimestres';

// Format ISO ("YYYY-MM-DD") d'une date UTC-midnight, pour la valeur d'un
// <input type="date"> — .toISOString() ne décale pas ce cas puisque
// dateEffetSimuleeParAge()/dateDepuisISO() construisent déjà un instant UTC
// à minuit (aucune conversion de fuseau horaire local en jeu).
const isoDate = (date: Date) => date.toISOString().slice(0, 10);

const AGE_MIN = 60;
const AGE_MAX = 70;
const AGES_COMPARATIF = [62, 63, 64, 65, 66, 67, 68, 69, 70];
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
  // nécessaire à trimestresCotisesAnneeReference (surcote classique/parentale,
  // cf. docs/audit/branchement-surcote-optimisation.md §1.3) : sans cette
  // donnée, la surcote resterait figée à 0 ici alors qu'elle ne l'est pas sur
  // l'écran Carrière pour le même client, ce qui romprait la parité visée.
  const { periodes: detailCarriere, loading: loadingCarriereDetail } = useCarriereDetail(personne);
  const [dateNaissance, setDateNaissance] = useState<string | null | undefined>(undefined);
  const [loadingProfile, setLoadingProfile] = useState(true);
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

  useEffect(() => {
    let cancelled = false;
    setLoadingProfile(true);
    // Conjoint : pas de fiche famille séparée (pas de compte Supabase
    // propre) — sa date de naissance vit dans marital_status.date_naissance_conjoint,
    // même source que Carriere.tsx pour la colonne conjoint.
    const chargerDateNaissance = personne === 'conjoint'
      ? familyService.getMaritalStatus().then((statut) => statut?.date_naissance_conjoint ?? null)
      : familyService.getFamilyProfile().then((profil) => profil?.date_naissance ?? null);

    chargerDateNaissance
      .then((date) => {
        if (!cancelled) setDateNaissance(date);
      })
      .catch((error) => {
        console.error('Erreur lors du chargement de la date de naissance:', error);
      })
      .finally(() => {
        if (!cancelled) setLoadingProfile(false);
      });
    return () => {
      cancelled = true;
    };
  }, [personne]);

  const ageActuel = computeAge(dateNaissance);
  // Date de naissance complète (année + mois), pas seulement l'année : le
  // barème légal a des découpages infra-annuels (1951, 1961, 1965 — cf.
  // trimestresRequisPourGeneration()) qu'une simple année ne peut pas
  // résoudre. Auparavant tronquée ici via `.getFullYear()` — écart #3 de
  // l'audit référentiel (docs/audit/audit-retraite.md §7).
  const dateNaissanceDetail = dateNaissance ? dateNaissanceDepuisISO(dateNaissance) : undefined;

  // Initialise la date de liquidation sur l'anniversaire de l'âge actuel
  // (borné 60-70) dès qu'elle est connue, une seule fois, pour ne pas
  // écraser une sélection déjà faite par l'utilisateur — même logique que
  // l'ancienne initialisation du slider, transposée en date.
  useEffect(() => {
    if (dateNaissanceDetail && ageActuel !== null && !dateLiquidationInitialisee) {
      const ageDepart = Math.min(AGE_MAX, Math.max(AGE_MIN, ageActuel));
      setDateLiquidation(isoDate(dateEffetSimuleeParAge(dateNaissanceDetail, ageDepart)));
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

  // Pension complémentaire : constante, indépendante de l'âge de départ simulé.
  const totalPensionComplementaireAnnuelle = regimesPoints.reduce((total, regime) => {
    const pension = pensionComplementaireAnnuelle(regime);
    return pension !== undefined ? total + pension : total;
  }, 0);

  const regimesPointsExclusCount = regimesPoints.filter(
    (regime) => pensionComplementaireAnnuelle(regime) === undefined
  ).length;

  // Trimestres cotisés par année, dérivés du détail de carrière (import RIS)
  // — même calcul que Carriere.tsx, réutilisé tel quel pour déterminer
  // trimestresCotisesAnneeReference plus bas (surcote classique/parentale).
  const resultatTrimestresDetailCarriere = useMemo(
    () => trimestresCotisesEtAssimilesDepuisCarriere(detailCarriere),
    [detailCarriere]
  );

  const loading = loadingRetraite || loadingProfile || loadingCarriereDetail;

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">Chargement...</CardContent>
        </Card>
      </div>
    );
  }

  if (!dateNaissance || ageActuel === null || dateNaissanceDetail === undefined) {
    return (
      <div className="space-y-6">
        <Card>
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

  const dateLiquidationMin = isoDate(dateEffetSimuleeParAge(dateNaissanceConfirmee, AGE_MIN));
  const dateLiquidationMax = isoDate(dateEffetSimuleeParAge(dateNaissanceConfirmee, AGE_MAX));
  // Repli avant que l'effet d'initialisation n'ait posé la valeur par défaut
  // (premier rendu, dateLiquidation encore vide) — même valeur que ce que
  // l'effet posera de toute façon, pour ne jamais calculer sur une date vide.
  const dateLiquidationEffet = dateLiquidation
    ? dateDepuisISO(dateLiquidation)
    : dateEffetSimuleeParAge(dateNaissanceConfirmee, Math.min(AGE_MAX, Math.max(AGE_MIN, ageActuelConfirme)));

  // Calcule le scénario pour une date d'effet donnée — la source de vérité
  // depuis cette session (Option 2, docs/audit/conception-date-effet.md) :
  // l'ancien paramètre `age` ne pilote plus rien, il est dérivé de la date
  // via `computeAge()` uniquement pour l'affichage et pour les besoins
  // internes qui restent exprimés en âge (projection des trimestres,
  // decoteSurAge — non concernée par la bascule de barème, cf.
  // docs/audit/implementation-date-effet-moteur.md, point d'entrée #4).
  const simulerPourDateEffet = (dateEffet: Date) => {
    const ageAffiche = computeAge(dateNaissance, dateEffet) ?? ageActuelConfirme;
    const trimestresValidesProjetes =
      trimestresValidesActuels + 4 * Math.max(0, ageAffiche - ageActuelConfirme);
    const trimestresRequis = trimestresRequisPourGeneration(dateNaissanceConfirmee, dateEffet);
    // Calculée mais non encore affichée (aucun écran ne montre l'âge légal à
    // ce jour) — reconnecte ageLegalPourGeneration() à un appelant réel,
    // cf. docs/audit/audit-retraite.md §7, écart #2/#3.
    const ageLegal = ageLegalPourGeneration(dateNaissanceConfirmee, dateEffet);
    const taux = tauxProratisation(trimestresValidesProjetes, trimestresRequis);
    // decoteSurTrimestres() est symétrique : au-delà de trimestresRequis, sa
    // branche positive (sans plafond ni porte d'éligibilité) n'est pas une
    // surcote légitime (référentiel §2.3.1/§2.3.2) — écrêtée à 0 ci-dessous,
    // même correctif que Carriere.tsx (cf.
    // docs/audit/branchement-majorations-pension-finale.md §1.b et
    // docs/audit/branchement-surcote-optimisation.md §2).
    const decote = Math.min(
      decoteApplicable(
        decoteSurTrimestres(trimestresValidesProjetes, trimestresRequis),
        decoteSurAge(ageAffiche)
      ),
      0
    );

    // Surcote (classique + parentale), assise sur la pension avant décote
    // mais ajoutée après (référentiel §12.3) — même schéma de branchement que
    // Carriere.tsx, reproduit tel quel : régime général, donc cumul additif
    // (pas de fonction publique/CNAVPL sur cet écran, cf. diagnostic
    // docs/audit/branchement-surcote-optimisation.md §1.4).
    const ageLegalAtteintFlag = ageLegalAtteint(dateNaissanceConfirmee, dateEffet);
    const ageLegalParentaleEligibleFlag = ageLegalParentaleEligible(dateNaissanceConfirmee, dateEffet);
    const dureeRequiseAtteinte = trimestresValidesProjetes >= trimestresRequis;
    const anneeReferenceSurcote =
      ageLegal.stable
        ? dateAnniversaireLegal(dateNaissanceConfirmee, ageLegal.age).getUTCFullYear() - 1
        : null;
    const trimestresCotisesAnneeReference =
      anneeReferenceSurcote !== null
        ? resultatTrimestresDetailCarriere.parAnnee.find((a) => a.annee === anneeReferenceSurcote)
            ?.cotises ?? 0
        : 0;
    const surcoteClassiquePct = surcotePourTrimestresCotises(
      trimestresCotisesAnneeReference,
      ageLegalAtteintFlag,
      dureeRequiseAtteinte
    );
    const surcoteParentalePct = surcoteParentale(
      auMoinsUnTrimestreMajorationEnfant,
      ageLegalParentaleEligibleFlag,
      dureeRequiseAtteinte,
      trimestresCotisesAnneeReference
    );
    const surcoteTotalePct = surcoteTotale(surcoteClassiquePct, surcoteParentalePct, true);

    const pensionBaseBrute = pensionBase(salaireAnnuelMoyen, taux, 0);
    const pensionBaseValue =
      pensionBaseBrute * (1 + decote / 100) + pensionBaseBrute * (surcoteTotalePct / 100);
    return {
      ageAffiche,
      trimestresValidesProjetes,
      trimestresRequis,
      ageLegal,
      decote,
      surcoteTotalePct,
      pensionBaseBrute,
      pensionBaseValue,
      pensionTotale: pensionBaseValue + totalPensionComplementaireAnnuelle,
    };
  };

  // Tableau comparatif par âge fixe (62-70 ans, cf. plus bas) : pas un
  // contrôle de saisie, seulement une liste de scénarios de référence —
  // reste piloté par âge via l'ancien proxy `dateEffetSimuleeParAge()`,
  // inchangé par cette session (point d'entrée interne, cf.
  // docs/audit/implementation-date-effet-ui.md §1).
  const simulerPourAge = (age: number) =>
    simulerPourDateEffet(dateEffetSimuleeParAge(dateNaissanceConfirmee, age));

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

  const trimestresValidesProjetesAvecRachat =
    resultatSelection.trimestresValidesProjetes + nombreTrimestresRachatNum;
  const tauxAvecRachat = tauxProratisation(
    trimestresValidesProjetesAvecRachat,
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
  const decoteAvecRachat = Math.min(
    decoteApplicable(
      decoteSurTrimestres(trimestresValidesProjetesAvecRachat, resultatSelection.trimestresRequis),
      decoteSurAge(resultatSelection.ageAffiche)
    ),
    0
  );
  const pensionBaseBruteAvecRachat = pensionBase(salaireAnnuelMoyen, tauxAvecRachat, 0);
  const pensionBaseAvecRachat =
    pensionBaseBruteAvecRachat * (1 + decoteAvecRachat / 100) +
    pensionBaseBruteAvecRachat * (resultatSelection.surcoteTotalePct / 100);
  const gainPensionAnnuelRachat = pensionBaseAvecRachat - resultatSelection.pensionBaseValue;
  const pointMortRachat =
    coutTotalRachat !== undefined && gainPensionAnnuelRachat > 0
      ? pointMort(coutTotalRachat, gainPensionAnnuelRachat)
      : undefined;

  return (
    <div className="space-y-6">
      <Card>
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
              simulation possible entre {AGE_MIN} et {AGE_MAX} ans.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="text-center p-3 border rounded-lg">
              <div className="text-xl font-bold text-primary">
                {resultatSelection.trimestresValidesProjetes}
              </div>
              <div className="text-xs text-muted-foreground">Trimestres validés projetés</div>
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
                    ? 'text-green-600'
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
              complémentaires calculables : {formatEuro2(totalPensionComplementaireAnnuelle)}
            </p>
            {regimesPointsExclusCount > 0 && (
              <p className="text-xs text-orange-600 mt-1">
                {regimesPointsExclusCount} régime{regimesPointsExclusCount > 1 ? 's' : ''} non
                inclus, valeur du point manquante
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
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
                <p className="text-xs text-orange-600">
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
                      Gain de pension : <span className="font-semibold text-green-600">
                        +{formatEuro2(gainPensionAnnuelRachat)} / an
                      </span>
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

      <Card>
        <CardHeader className="p-5">
          <CardTitle className="text-[15px] font-semibold tracking-tight">Comparatif par âge de départ</CardTitle>
          <CardDescription className="text-xs">
            Pension totale estimée pour chaque âge de départ entre 62 et 70 ans
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
                const decoteOuSurcoteLigne = resultat.decote + resultat.surcoteTotalePct;
                return (
                  <TableRow
                    key={age}
                    className={age === resultatSelection.ageAffiche ? 'bg-muted/50' : undefined}
                  >
                    <TableCell className="font-medium">{age} ans</TableCell>
                    <TableCell>{resultat.trimestresValidesProjetes}</TableCell>
                    <TableCell
                      className={
                        decoteOuSurcoteLigne < 0
                          ? 'text-destructive'
                          : decoteOuSurcoteLigne > 0
                          ? 'text-green-600'
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
    </div>
  );
};
