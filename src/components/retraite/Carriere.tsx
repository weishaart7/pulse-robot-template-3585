import React, { useRef, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Save, Upload, Trash2 } from 'lucide-react';
import { useRetraiteData } from '@/hooks/useRetraiteData';
import { useCarriereDetail } from '@/hooks/useCarriereDetail';
import { useToast } from '@/hooks/use-toast';
import { parseRIS, PeriodeCarriere, RegimeDetecte, TypeActivite } from '@/lib/retraite/parseRIS';
import { RISImportDialog } from '@/components/retraite/RISImportDialog';
import { tauxProratisation, decoteSurTrimestres, pensionBase, pensionComplementaireAnnuelle } from '@/lib/retraite/calcul';
import { CarriereFonctionPublique } from '@/components/retraite/CarriereFonctionPublique';
import { CarriereCNAVPL } from '@/components/retraite/CarriereCNAVPL';
import { familyService } from '@/services/familyService';

const LIBELLE_TYPE_ACTIVITE: Record<TypeActivite, string> = {
  employeur: 'Employeur',
  chomage: 'Chômage',
  maladie: 'Maladie',
  micro_entrepreneur: 'Micro-entrepreneur',
};

const formatDateFr = (dateIso: string) => {
  const [annee, mois, jour] = dateIso.split('-');
  return `${jour}/${mois}/${annee}`;
};

export const Carriere = () => {
  const { data, loading, saving, saveRetraiteData } = useRetraiteData();
  const {
    periodes: periodesEnregistrees,
    loading: loadingCarriereDetail,
    saving: savingCarriereDetail,
    remplacerPeriodes,
  } = useCarriereDetail();
  const { toast } = useToast();
  const [salaireAnnuelMoyen, setSalaireAnnuelMoyen] = useState<string>('');
  const [trimestresValides, setTrimestresValides] = useState<string>('');
  const [trimestresRequis] = useState<number>(172);
  const [hasChanges, setHasChanges] = useState(false);
  const [pensionBaseBrute, setPensionBaseBrute] = useState<number>(0);
  const [decoteSurcote, setDecoteSurcote] = useState<number>(0);
  const [ageTauxPlein, setAgeTauxPlein] = useState<string>('');

  // Carrière fonction publique — état remonté ici (plutôt que gardé local à
  // CarriereFonctionPublique) car le total de trimestres tous régimes doit
  // être partagé entre les calculs de décote de chaque régime (régime
  // général, fonction publique, CNAVPL), chacun gardant son propre plafond.
  const [hasFonctionPublique, setHasFonctionPublique] = useState(false);
  const [trimestresLiquidablesFP, setTrimestresLiquidablesFP] = useState<string>('');
  const [resultatFonctionPublique, setResultatFonctionPublique] = useState({
    pensionFinale: 0,
    rafpAnnuelle: 0,
  });

  // Carrière CNAVPL — même pattern que la fonction publique ci-dessus.
  const [hasCNAVPL, setHasCNAVPL] = useState(false);
  const [trimestresCNAVPL, setTrimestresCNAVPL] = useState<string>('');
  const [resultatCNAVPL, setResultatCNAVPL] = useState({ pensionFinale: 0 });

  // Import RIS — le fichier n'est jamais conservé au-delà du parsing ni envoyé
  // à Supabase : il est lu en mémoire par parseRIS() puis abandonné.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [regimesDetectes, setRegimesDetectes] = useState<RegimeDetecte[]>([]);
  const [regimesPoints, setRegimesPoints] = useState<RegimeDetecte[]>([]);
  const [risDialogOpen, setRisDialogOpen] = useState(false);
  const [risImporting, setRisImporting] = useState(false);

  // Détail de carrière (import RIS) — periodesDetectees alimente le dialogue
  // de vérification (calcul du SAM), detailCarriere est la liste éditable
  // affichée dans la sous-section dédiée et effectivement enregistrée.
  const [periodesDetectees, setPeriodesDetectees] = useState<PeriodeCarriere[]>([]);
  const [detailCarriere, setDetailCarriere] = useState<PeriodeCarriere[]>([]);

  // Date de naissance du client — nécessaire pour le calcul du SAM (nombre
  // d'années requis selon la génération, année de départ en retraite
  // prévue). Même source que Trimestres.tsx : family_profiles via
  // familyService, il n'existe pas d'entité "client" séparée dans l'appli.
  const [anneeNaissance, setAnneeNaissance] = useState<number | null>(null);

  useEffect(() => {
    familyService.getFamilyProfile()
      .then((profil) => {
        if (profil?.date_naissance) {
          setAnneeNaissance(new Date(profil.date_naissance).getFullYear());
        }
      })
      .catch((error) => {
        console.error('Erreur lors du chargement du profil famille:', error);
      });
  }, []);

  // Chargement des données depuis Supabase
  useEffect(() => {
    if (!loading && data) {
      if (data.salaire_annuel_moyen !== undefined && data.salaire_annuel_moyen !== null) {
        setSalaireAnnuelMoyen(data.salaire_annuel_moyen.toString());
      }
      if (data.trimestres_valides !== undefined && data.trimestres_valides !== null) {
        setTrimestresValides(data.trimestres_valides.toString());
      }
      if (data.regimes_points) {
        setRegimesPoints(data.regimes_points);
      }
    }
  }, [data, loading]);

  // Chargement du détail de carrière déjà enregistré (table dédiée, à part
  // de retraite_data) — synchronisé dans l'état éditable local une fois
  // chargé, tant qu'aucun import RIS n'a encore modifié la liste localement.
  useEffect(() => {
    if (!loadingCarriereDetail) {
      setDetailCarriere(periodesEnregistrees.map(({ id: _id, ...periode }) => periode));
    }
  }, [loadingCarriereDetail, periodesEnregistrees]);

  // Détection des changements
  useEffect(() => {
    const salaireDifferent = parseFloat(salaireAnnuelMoyen) !== (data.salaire_annuel_moyen || 0);
    const trimestresDifferent = parseInt(trimestresValides) !== (data.trimestres_valides || 0);
    const regimesPointsDifferent = JSON.stringify(regimesPoints) !== JSON.stringify(data.regimes_points || []);
    const detailCarriereDifferent =
      JSON.stringify(detailCarriere) !==
      JSON.stringify(periodesEnregistrees.map(({ id: _id, ...periode }) => periode));
    setHasChanges(salaireDifferent || trimestresDifferent || regimesPointsDifferent || detailCarriereDifferent);
  }, [salaireAnnuelMoyen, trimestresValides, regimesPoints, detailCarriere, periodesEnregistrees, data]);

  // Calcul de la pension de base brute (moteur : src/lib/retraite/calcul.ts)
  useEffect(() => {
    const salaire = parseFloat(salaireAnnuelMoyen) || 0;
    const trimValides = parseInt(trimestresValides) || 0;

    if (salaire > 0 && trimValides > 0) {
      const taux = tauxProratisation(trimValides, trimestresRequis);
      // decote=0 ici : on veut la pension brute avant décote/surcote,
      // laquelle est calculée et appliquée séparément ci-dessous.
      setPensionBaseBrute(pensionBase(salaire, taux, 0));
    } else {
      setPensionBaseBrute(0);
    }
  }, [salaireAnnuelMoyen, trimestresValides, trimestresRequis]);

  // Calcul décote/surcote (moteur : src/lib/retraite/calcul.ts) — basé sur le
  // total de trimestres tous régimes confondus (régime général + fonction
  // publique + CNAVPL, chacun si saisi), pas seulement les trimestres
  // régime général. Le nombre de régimes est amené à grandir : cette somme
  // reste générique plutôt que d'empiler une addition par régime.
  useEffect(() => {
    const trimValides = parseInt(trimestresValides) || 0;
    const trimAutresRegimes =
      (hasFonctionPublique ? parseInt(trimestresLiquidablesFP) || 0 : 0) +
      (hasCNAVPL ? parseInt(trimestresCNAVPL) || 0 : 0);
    setDecoteSurcote(decoteSurTrimestres(trimValides + trimAutresRegimes, trimestresRequis));
  }, [
    trimestresValides,
    trimestresRequis,
    hasFonctionPublique,
    trimestresLiquidablesFP,
    hasCNAVPL,
    trimestresCNAVPL,
  ]);

  // Calcul de l'âge du taux plein
  useEffect(() => {
    const trimValides = parseInt(trimestresValides) || 0;
    
    if (trimValides >= trimestresRequis) {
      setAgeTauxPlein('Taux plein atteint avec les trimestres validés');
    } else {
      // Âge automatique à 67 ans (calculable avec date de naissance depuis fiche client)
      setAgeTauxPlein('67 ans (âge automatique du taux plein)');
    }
  }, [trimestresValides, trimestresRequis]);

  const handleSave = async () => {
    const updates = {
      salaire_annuel_moyen: parseFloat(salaireAnnuelMoyen) || 0,
      trimestres_valides: parseInt(trimestresValides) || 0,
      regimes_points: regimesPoints,
    };

    const [successRetraiteData, successDetailCarriere] = await Promise.all([
      saveRetraiteData(updates),
      remplacerPeriodes(detailCarriere),
    ]);
    if (successRetraiteData && successDetailCarriere) {
      setHasChanges(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Autorise de resélectionner le même fichier après un annulé/échec précédent.
    e.target.value = '';
    if (!file) return;

    setRisImporting(true);
    try {
      const { regimes, detailCarriere: detailDetecte, texteIllisible } = await parseRIS(file);
      if (texteIllisible || regimes.length === 0) {
        toast({
          title: 'Import impossible',
          description: 'Impossible de lire ce document automatiquement, merci de saisir les informations manuellement.',
          variant: 'destructive',
        });
        return;
      }
      setRegimesDetectes(regimes);
      setPeriodesDetectees(detailDetecte);
      setRisDialogOpen(true);
    } catch (error) {
      console.error('Erreur lors de la lecture du RIS:', error);
      toast({
        title: 'Import impossible',
        description: 'Impossible de lire ce document automatiquement, merci de saisir les informations manuellement.',
        variant: 'destructive',
      });
    } finally {
      setRisImporting(false);
    }
  };

  const handleValidateRIS = (
    regimesValides: RegimeDetecte[],
    detailCarriereValide: PeriodeCarriere[],
    samPropose: number | null
  ) => {
    // CNAVPL a sa propre carte dédiée (CarriereCNAVPL.tsx, décote/surcote
    // spécifique) : on l'exclut explicitement des deux paniers génériques
    // ci-dessous (trimestres régime général ET regimesPoints), sinon un bloc
    // "CNAVPL" détecté dans le RIS gonflerait à tort trimestresValides
    // (régime général) et/ou serait compté deux fois si l'utilisateur le
    // ressaisit aussi dans CarriereCNAVPL — la saisie CNAVPL reste manuelle,
    // comme RAFP et la fonction publique, jamais auto-remplie depuis le RIS.
    const regimesHorsCNAVPL = regimesValides.filter(r => !/cnavpl/i.test(r.nom));

    // trimestresValides = somme de tous les régimes de type "trimestres"
    // détectés dans le RIS (Assurance retraite, MSA Salariés, ou tout autre
    // régime aligné présenté séparément) — depuis la réforme LURA (2017), les
    // trimestres des régimes alignés se fusionnent dans un seul calcul, donc
    // on ne privilégie plus un unique régime "Assurance retraite" au risque
    // d'ignorer silencieusement les trimestres d'un régime aligné distinct.
    const regimesTrimestres = regimesHorsCNAVPL.filter(r => r.type === 'trimestres' && r.trimestres !== undefined);
    if (regimesTrimestres.length > 0) {
      const totalTrimestres = regimesTrimestres.reduce((total, r) => total + (r.trimestres || 0), 0);
      setTrimestresValides(totalTrimestres.toString());
    }

    // Les régimes complémentaires par points sont conservés à part : pas de
    // calcul de pension complémentaire à ce stade. Un nouvel import remplace
    // entièrement la liste précédente (pas de fusion, pour éviter les doublons
    // si un régime a changé de valeur d'une année sur l'autre) ; la
    // persistance effective se fait via handleSave, comme les autres champs.
    setRegimesPoints(regimesHorsCNAVPL.filter(r => r.type === 'points'));

    // Détail de carrière et SAM proposé : même logique de remplacement
    // intégral qu'au-dessus, la persistance se fait via handleSave.
    setDetailCarriere(detailCarriereValide);
    if (samPropose !== null && !Number.isNaN(samPropose)) {
      setSalaireAnnuelMoyen(samPropose.toString());
    }

    setRisDialogOpen(false);
  };

  const handleRemoveRegimePoint = (index: number) => {
    setRegimesPoints(regimesPoints.filter((_, i) => i !== index));
  };

  const handleRemovePeriode = (index: number) => {
    setDetailCarriere(detailCarriere.filter((_, i) => i !== index));
  };

  const formatEuro2 = (valeur: number) =>
    valeur.toLocaleString('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const totalPensionComplementaireAnnuelle = regimesPoints.reduce((total, regime) => {
    const pension = pensionComplementaireAnnuelle(regime);
    return pension !== undefined ? total + pension : total;
  }, 0);

  const regimesPointsExclusCount = regimesPoints.filter(
    (regime) => pensionComplementaireAnnuelle(regime) === undefined
  ).length;

  const pensionBaseAjustee = pensionBaseBrute * (1 + decoteSurcote / 100);
  const pensionTotaleRegimeGeneral = pensionBaseAjustee + totalPensionComplementaireAnnuelle;
  const pensionTotaleFonctionPublique = hasFonctionPublique
    ? resultatFonctionPublique.pensionFinale + resultatFonctionPublique.rafpAnnuelle
    : 0;
  const pensionTotaleCNAVPL = hasCNAVPL ? resultatCNAVPL.pensionFinale : 0;
  const pensionTotaleConsolidee =
    pensionTotaleRegimeGeneral + pensionTotaleFonctionPublique + pensionTotaleCNAVPL;
  const aDesRegimesSupplementaires = hasFonctionPublique || hasCNAVPL;

  return (
    <div className="space-y-6">
      {hasChanges && (
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving || savingCarriereDetail}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {saving || savingCarriereDetail ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </Button>
        </div>
      )}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Informations de carrière</CardTitle>
            <CardDescription>
              Renseignez les éléments de votre carrière pour calculer votre pension
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleImportClick}
            disabled={risImporting}
          >
            <Upload className="h-4 w-4" />
            {risImporting ? 'Lecture en cours...' : 'Importer mon relevé de carrière (RIS)'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileSelected}
          />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="salaire-moyen">Salaire annuel moyen (€)</Label>
              <Input
                id="salaire-moyen"
                type="number"
                placeholder="Ex: 45000"
                value={salaireAnnuelMoyen}
                onChange={(e) => setSalaireAnnuelMoyen(e.target.value)}
               className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring"/>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gestion des trimestres</CardTitle>
          <CardDescription>
            Suivez vos trimestres validés et calculez l'âge du taux plein
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="trimestres-valides">Trimestres validés</Label>
              <Input
                id="trimestres-valides"
                type="number"
                placeholder="Ex: 160"
                value={trimestresValides}
                onChange={(e) => setTrimestresValides(e.target.value)}
               className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring"/>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trimestres-requis">Trimestres requis</Label>
              <Input
                id="trimestres-requis"
                type="number"
                value={trimestresRequis}
                disabled
                className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring bg-muted"
              />
              <p className="text-sm text-muted-foreground">
                Valeur fixée selon votre date de naissance
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <Label>Âge du taux plein</Label>
              <div className="text-lg font-semibold text-primary mt-2">
                {ageTauxPlein}
              </div>
            </div>

            {trimestresValides && (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {trimestresValides}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Trimestres validés
                  </div>
                </div>

                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">
                    {trimestresRequis}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Trimestres requis
                  </div>
                </div>

                <div className="text-center p-4 border rounded-lg">
                  <div className={`text-2xl font-bold ${
                    parseInt(trimestresValides) >= trimestresRequis 
                      ? 'text-green-600' 
                      : 'text-orange-600'
                  }`}>
                    {Math.max(0, trimestresRequis - parseInt(trimestresValides))}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Trimestres manquants
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Calculs de pension</CardTitle>
          <CardDescription>
            Estimation de votre pension de retraite de base
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Pension de base brute</Label>
              <div className="text-2xl font-semibold text-primary">
                {pensionBaseBrute.toLocaleString('fr-FR', {
                  style: 'currency',
                  currency: 'EUR',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                })}
              </div>
              <p className="text-sm text-muted-foreground">
                SAM × 50% × (Trimestres validés / Trimestres requis)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Décote / Surcote</Label>
              <div className={`text-2xl font-semibold ${
                decoteSurcote < 0 ? 'text-destructive' : 
                decoteSurcote > 0 ? 'text-green-600' : 'text-muted-foreground'
              }`}>
                {decoteSurcote > 0 ? '+' : ''}{decoteSurcote.toFixed(2)}%
              </div>
              <p className="text-sm text-muted-foreground">
                {decoteSurcote < 0 
                  ? `Décote de ${Math.abs(decoteSurcote).toFixed(2)}% (-1,25% par trimestre manquant)`
                  : decoteSurcote > 0 
                  ? `Surcote de ${decoteSurcote.toFixed(2)}% (+1,25% par trimestre supplémentaire)`
                  : 'Aucune décote ni surcote'
                }
              </p>
            </div>
          </div>

          {pensionBaseBrute > 0 && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <Label>Pension ajustée (avec décote/surcote)</Label>
              <div className="text-xl font-semibold text-primary">
                {(pensionBaseBrute * (1 + decoteSurcote / 100)).toLocaleString('fr-FR', {
                  style: 'currency',
                  currency: 'EUR',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                })}
              </div>
            </div>
          )}

          {(pensionBaseBrute > 0 || regimesPoints.length > 0 || aDesRegimesSupplementaires) && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <Label>
                Total consolidé{aDesRegimesSupplementaires ? ' tous régimes' : ''} (pension de base
                ajustée + pensions complémentaires
                {hasFonctionPublique ? ' + fonction publique + RAFP' : ''}
                {hasCNAVPL ? ' + CNAVPL' : ''})
              </Label>
              <div className="text-xl font-semibold text-primary">
                {formatEuro2(pensionTotaleConsolidee)} / an
              </div>
              <p className="text-sm text-muted-foreground">
                Pension de base ajustée : {formatEuro2(pensionBaseAjustee)} + pensions complémentaires calculables : {formatEuro2(totalPensionComplementaireAnnuelle)}
              </p>
              {regimesPointsExclusCount > 0 && (
                <p className="text-sm text-orange-600 mt-1">
                  {regimesPointsExclusCount} régime{regimesPointsExclusCount > 1 ? 's' : ''} non inclus, valeur du point manquante
                </p>
              )}
              {aDesRegimesSupplementaires && (
                <p className="text-sm text-muted-foreground mt-2 pt-2 border-t">
                  Détail par régime : régime général (base + complémentaires) ={' '}
                  {formatEuro2(pensionTotaleRegimeGeneral)} / an
                  {hasFonctionPublique && (
                    <> — fonction publique (pension + RAFP) = {formatEuro2(pensionTotaleFonctionPublique)} / an</>
                  )}
                  {hasCNAVPL && <> — CNAVPL = {formatEuro2(pensionTotaleCNAVPL)} / an</>}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Régimes de retraite complémentaire (points)</CardTitle>
          <CardDescription>
            Régimes par points détectés lors de l'import de votre relevé de carrière (RIS)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {regimesPoints.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun régime à points enregistré. Importez votre relevé de carrière pour les détecter automatiquement.
            </p>
          ) : (
            <div className="space-y-3">
              {regimesPoints.map((regime, index) => {
                const pensionAnnuelle = pensionComplementaireAnnuelle(regime);
                return (
                  <div
                    key={`${regime.nom}-${index}`}
                    className="flex items-center justify-between gap-4 p-4 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="font-semibold">{regime.nom}</div>
                      <div className="text-sm text-muted-foreground">
                        {regime.points?.toLocaleString('fr-FR')} points
                        {regime.valeurPoint !== undefined && (
                          <>
                            {' · '}
                            Valeur du point : {regime.valeurPoint.toLocaleString('fr-FR', {
                              style: 'currency',
                              currency: 'EUR',
                              minimumFractionDigits: 4,
                              maximumFractionDigits: 4,
                            })}
                          </>
                        )}
                        {regime.dateValeurPoint && (
                          <>
                            {' '}
                            (au {regime.dateValeurPoint})
                          </>
                        )}
                      </div>
                      {pensionAnnuelle !== undefined ? (
                        <div className="text-sm font-medium text-primary">
                          Pension complémentaire : {formatEuro2(pensionAnnuelle)} / an ({formatEuro2(pensionAnnuelle / 12)} / mois)
                        </div>
                      ) : (
                        <div className="text-sm text-orange-600">
                          Valeur du point manquante, montant non calculable
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveRegimePoint(index)}
                      aria-label={`Supprimer le régime ${regime.nom}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Détail de carrière</CardTitle>
          <CardDescription>
            Employeur / activité détectés lors de l'import de votre relevé de carrière (RIS)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {detailCarriere.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune période enregistrée. Importez votre relevé de carrière pour les détecter automatiquement.
            </p>
          ) : (
            <div className="space-y-3">
              {detailCarriere.map((periode, index) => (
                <div
                  key={`${periode.employeur}-${periode.dateDebut}-${index}`}
                  className="flex items-center justify-between gap-4 p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="font-semibold">{periode.employeur}</div>
                    <div className="text-sm text-muted-foreground">
                      {LIBELLE_TYPE_ACTIVITE[periode.typeActivite]} · {formatDateFr(periode.dateDebut)} →{' '}
                      {formatDateFr(periode.dateFin)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {periode.revenu !== null
                        ? `${formatEuro2(periode.revenu)}${periode.estChiffreAffaires ? ' (chiffre d\'affaires)' : ''}`
                        : 'Revenu non renseigné'}
                      {periode.regimes.length > 0 && <> · {periode.regimes.join(', ')}</>}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemovePeriode(index)}
                    aria-label={`Supprimer la période ${periode.employeur}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CarriereFonctionPublique
        trimestresRequis={trimestresRequis}
        trimestresAutresRegimes={(parseInt(trimestresValides) || 0) + (hasCNAVPL ? parseInt(trimestresCNAVPL) || 0 : 0)}
        hasFonctionPublique={hasFonctionPublique}
        onHasFonctionPubliqueChange={setHasFonctionPublique}
        trimestresLiquidables={trimestresLiquidablesFP}
        onTrimestresLiquidablesChange={setTrimestresLiquidablesFP}
        onResultChange={setResultatFonctionPublique}
      />

      <CarriereCNAVPL
        trimestresRequis={trimestresRequis}
        trimestresAutresRegimes={(parseInt(trimestresValides) || 0) + (hasFonctionPublique ? parseInt(trimestresLiquidablesFP) || 0 : 0)}
        hasCNAVPL={hasCNAVPL}
        onHasCNAVPLChange={setHasCNAVPL}
        trimestresCNAVPL={trimestresCNAVPL}
        onTrimestresCNAVPLChange={setTrimestresCNAVPL}
        onResultChange={setResultatCNAVPL}
      />

      <RISImportDialog
        open={risDialogOpen}
        regimes={regimesDetectes}
        detailCarriere={periodesDetectees}
        anneeNaissance={anneeNaissance}
        onValidate={handleValidateRIS}
        onCancel={() => setRisDialogOpen(false)}
      />
    </div>
  );
};