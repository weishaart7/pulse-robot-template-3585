import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRetraiteData } from '@/hooks/useRetraiteData';
import { familyService, FamilyProfile } from '@/services/familyService';
import { computeAge } from '@/lib/patrimoine/bareme669CGI';
import {
  trimestresRequisPourGeneration,
  tauxProratisation,
  decoteSurTrimestres,
  decoteSurAge,
  decoteApplicable,
  pensionBase,
  pensionComplementaireAnnuelle,
  coutRachatTrimestre,
  pointMort,
  OptionRachat,
} from '@/lib/retraite/calcul';

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

export const Trimestres = () => {
  const { data: retraiteData, loading: loadingRetraite } = useRetraiteData();
  const [familyProfile, setFamilyProfile] = useState<FamilyProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [ageSimule, setAgeSimule] = useState<number>(AGE_MIN);
  const [ageSimuleInitialise, setAgeSimuleInitialise] = useState(false);

  // Rachat de trimestres — sandbox éphémère, aucune persistance.
  const [regimeRachat, setRegimeRachat] = useState<RegimeRachat>('salarieIndependant');
  const [optionRachat, setOptionRachat] = useState<OptionRachat>('tauxSeul');
  const [revenuMoyen3Ans, setRevenuMoyen3Ans] = useState<string>('');
  const [nombreTrimestresRachat, setNombreTrimestresRachat] = useState<string>('1');

  useEffect(() => {
    let cancelled = false;
    familyService
      .getFamilyProfile()
      .then((profile) => {
        if (!cancelled) setFamilyProfile(profile);
      })
      .catch((error) => {
        console.error('Erreur lors du chargement du profil famille:', error);
      })
      .finally(() => {
        if (!cancelled) setLoadingProfile(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const dateNaissance = familyProfile?.date_naissance;
  const ageActuel = computeAge(dateNaissance);
  const anneeNaissance = dateNaissance ? new Date(dateNaissance).getFullYear() : undefined;

  // Initialise le slider sur l'âge actuel (borné 60-70) dès qu'il est connu,
  // une seule fois, pour ne pas écraser une sélection déjà faite par l'utilisateur.
  useEffect(() => {
    if (ageActuel !== null && !ageSimuleInitialise) {
      setAgeSimule(Math.min(AGE_MAX, Math.max(AGE_MIN, ageActuel)));
      setAgeSimuleInitialise(true);
    }
  }, [ageActuel, ageSimuleInitialise]);

  const trimestresValidesActuels = retraiteData.trimestres_valides || 0;
  const salaireAnnuelMoyen = retraiteData.salaire_annuel_moyen || 0;
  const regimesPoints = retraiteData.regimes_points || [];

  // Pension complémentaire : constante, indépendante de l'âge de départ simulé.
  const totalPensionComplementaireAnnuelle = regimesPoints.reduce((total, regime) => {
    const pension = pensionComplementaireAnnuelle(regime);
    return pension !== undefined ? total + pension : total;
  }, 0);

  const regimesPointsExclusCount = regimesPoints.filter(
    (regime) => pensionComplementaireAnnuelle(regime) === undefined
  ).length;

  const loading = loadingRetraite || loadingProfile;

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">Chargement...</CardContent>
        </Card>
      </div>
    );
  }

  if (!dateNaissance || ageActuel === null || anneeNaissance === undefined) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Simulation d'âge de départ</CardTitle>
            <CardDescription>
              Simulez l'impact de votre âge de départ sur votre pension
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
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
  // number non nullables, indépendamment de l'inférence TS sur les closures.
  const ageActuelConfirme: number = ageActuel;
  const anneeNaissanceConfirmee: number = anneeNaissance;

  const simulerPourAge = (age: number) => {
    const trimestresValidesProjetes =
      trimestresValidesActuels + 4 * Math.max(0, age - ageActuelConfirme);
    const trimestresRequis = trimestresRequisPourGeneration(anneeNaissanceConfirmee);
    const taux = tauxProratisation(trimestresValidesProjetes, trimestresRequis);
    const decote = decoteApplicable(
      decoteSurTrimestres(trimestresValidesProjetes, trimestresRequis),
      decoteSurAge(age)
    );
    const pensionBaseValue = pensionBase(salaireAnnuelMoyen, taux, decote);
    return {
      trimestresValidesProjetes,
      trimestresRequis,
      decote,
      pensionBaseValue,
      pensionTotale: pensionBaseValue + totalPensionComplementaireAnnuelle,
    };
  };

  const resultatSelection = simulerPourAge(ageSimule);

  // Rachat de trimestres : le coût dépend de l'âge actuel (âge auquel le
  // rachat serait effectué aujourd'hui), pas de l'âge de départ simulé.
  // Les trimestres rachetés viennent s'ajouter aux trimestres projetés à
  // l'âge de départ simulé ci-dessus, pour recalculer la pension de base.
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
  const decoteAvecRachat = decoteApplicable(
    decoteSurTrimestres(trimestresValidesProjetesAvecRachat, resultatSelection.trimestresRequis),
    decoteSurAge(ageSimule)
  );
  const pensionBaseAvecRachat = pensionBase(salaireAnnuelMoyen, tauxAvecRachat, decoteAvecRachat);
  const gainPensionAnnuelRachat = pensionBaseAvecRachat - resultatSelection.pensionBaseValue;
  const pointMortRachat =
    coutTotalRachat !== undefined && gainPensionAnnuelRachat > 0
      ? pointMort(coutTotalRachat, gainPensionAnnuelRachat)
      : undefined;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Simulation d'âge de départ</CardTitle>
          <CardDescription>
            Simulation indicative, ne remplace pas un relevé officiel de l'Assurance retraite.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="age-simule" className="text-sm font-medium">
                Âge de départ simulé
              </label>
              <span className="text-lg font-semibold text-primary">{ageSimule} ans</span>
            </div>
            <Slider
              id="age-simule"
              min={AGE_MIN}
              max={AGE_MAX}
              step={1}
              value={[ageSimule]}
              onValueChange={(value) => setAgeSimule(value[0])}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{AGE_MIN} ans</span>
              <span>{AGE_MAX} ans</span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {resultatSelection.trimestresValidesProjetes}
              </div>
              <div className="text-sm text-muted-foreground">Trimestres validés projetés</div>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{resultatSelection.trimestresRequis}</div>
              <div className="text-sm text-muted-foreground">Trimestres requis</div>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <div
                className={`text-2xl font-bold ${
                  resultatSelection.decote < 0
                    ? 'text-destructive'
                    : resultatSelection.decote > 0
                    ? 'text-green-600'
                    : 'text-muted-foreground'
                }`}
              >
                {resultatSelection.decote > 0 ? '+' : ''}
                {resultatSelection.decote.toFixed(2)}%
              </div>
              <div className="text-sm text-muted-foreground">Décote / surcote applicable</div>
            </div>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">
              Pension totale consolidée à {ageSimule} ans (base + complémentaire)
            </div>
            <div className="text-2xl font-semibold text-primary">
              {formatEuro2(resultatSelection.pensionTotale)} / an
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Pension de base : {formatEuro2(resultatSelection.pensionBaseValue)} + pensions
              complémentaires calculables : {formatEuro2(totalPensionComplementaireAnnuelle)}
            </p>
            {regimesPointsExclusCount > 0 && (
              <p className="text-sm text-orange-600 mt-1">
                {regimesPointsExclusCount} régime{regimesPointsExclusCount > 1 ? 's' : ''} non
                inclus, valeur du point manquante
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rachat de trimestres</CardTitle>
          <CardDescription>
            Simulation indicative du coût et de la rentabilité d'un versement pour la retraite (rachat de
            trimestres), à l'âge de départ simulé ci-dessus.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Régime</Label>
            <RadioGroup
              value={regimeRachat}
              onValueChange={(value) => setRegimeRachat(value as RegimeRachat)}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="salarieIndependant" id="regime-salarie-independant" />
                <label htmlFor="regime-salarie-independant" className="text-sm">
                  Salarié ou indépendant (régime général / SSI)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="professionLiberale" id="regime-profession-liberale" />
                <label htmlFor="regime-profession-liberale" className="text-sm">
                  Profession libérale réglementée (CIPAV, CARMF, CARPIMKO...)
                </label>
              </div>
            </RadioGroup>
          </div>

          {regimeRachat === 'professionLiberale' ? (
            <p className="text-sm text-muted-foreground">
              Le coût du rachat pour votre régime n'est pas public — contactez votre caisse (CIPAV,
              CARMF, CARPIMKO...) pour un devis personnalisé.
            </p>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="revenu-moyen-3-ans">Revenu moyen des 3 dernières années (€)</Label>
                  <Input
                    id="revenu-moyen-3-ans"
                    type="number"
                    placeholder="Ex: 32000"
                    value={revenuMoyen3Ans}
                    onChange={(e) => setRevenuMoyen3Ans(e.target.value)}
                    className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nombre-trimestres-rachat">Nombre de trimestres à racheter</Label>
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

              <div className="space-y-2">
                <Label>Option de rachat</Label>
                <RadioGroup
                  value={optionRachat}
                  onValueChange={(value) => setOptionRachat(value as OptionRachat)}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="tauxSeul" id="option-taux-seul" />
                    <label htmlFor="option-taux-seul" className="text-sm">
                      Taux seul (réduit uniquement la décote)
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="tauxEtDuree" id="option-taux-et-duree" />
                    <label htmlFor="option-taux-et-duree" className="text-sm">
                      Taux et durée d'assurance (réduit la décote et augmente la proratisation)
                    </label>
                  </div>
                </RadioGroup>
              </div>

              {coutUnitaireRachat === undefined ? (
                <p className="text-sm text-orange-600">
                  Rachat non disponible au-delà de 66 ans (votre âge actuel : {ageActuelConfirme} ans).
                </p>
              ) : (
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="text-sm text-muted-foreground">Coût total du rachat</div>
                      <div className="text-xl font-semibold text-primary">
                        {coutTotalRachat !== undefined ? formatEuro2(coutTotalRachat) : '—'}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatEuro2(coutUnitaireRachat)} / trimestre × {nombreTrimestresRachatNum}
                      </p>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Nouvelle pension de base à {ageSimule} ans
                      </div>
                      <div className="text-xl font-semibold text-primary">
                        {formatEuro2(pensionBaseAvecRachat)} / an
                      </div>
                      <p className="text-xs text-muted-foreground">
                        contre {formatEuro2(resultatSelection.pensionBaseValue)} / an sans rachat
                      </p>
                    </div>
                  </div>

                  {gainPensionAnnuelRachat > 0 ? (
                    <p className="text-sm">
                      Gain de pension : <span className="font-semibold text-green-600">
                        +{formatEuro2(gainPensionAnnuelRachat)} / an
                      </span>
                      {pointMortRachat !== undefined && coutTotalRachat !== undefined && (
                        <> — point mort : <span className="font-semibold">{pointMortRachat.toFixed(1)} ans</span> (brut, sans fiscalité)</>
                      )}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      À {ageSimule} ans, vos trimestres validés projetés couvrent déjà les trimestres
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
        <CardHeader>
          <CardTitle>Comparatif par âge de départ</CardTitle>
          <CardDescription>
            Pension totale estimée pour chaque âge de départ entre 62 et 70 ans
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                return (
                  <TableRow key={age} className={age === ageSimule ? 'bg-muted/50' : undefined}>
                    <TableCell className="font-medium">{age} ans</TableCell>
                    <TableCell>{resultat.trimestresValidesProjetes}</TableCell>
                    <TableCell
                      className={
                        resultat.decote < 0
                          ? 'text-destructive'
                          : resultat.decote > 0
                          ? 'text-green-600'
                          : undefined
                      }
                    >
                      {resultat.decote > 0 ? '+' : ''}
                      {resultat.decote.toFixed(2)}%
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
