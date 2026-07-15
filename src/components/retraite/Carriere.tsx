import React, { useRef, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Save, Upload, Trash2 } from 'lucide-react';
import { useRetraiteData } from '@/hooks/useRetraiteData';
import { useToast } from '@/hooks/use-toast';
import { parseRIS, RegimeDetecte } from '@/lib/retraite/parseRIS';
import { RISImportDialog } from '@/components/retraite/RISImportDialog';
import { tauxProratisation, decoteSurTrimestres, pensionBase, pensionComplementaireAnnuelle } from '@/lib/retraite/calcul';
import { CarriereFonctionPublique } from '@/components/retraite/CarriereFonctionPublique';

export const Carriere = () => {
  const { data, loading, saving, saveRetraiteData } = useRetraiteData();
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
  // être partagé entre les deux calculs de décote (régime général ET
  // fonction publique), chacun gardant son propre plafond.
  const [hasFonctionPublique, setHasFonctionPublique] = useState(false);
  const [trimestresLiquidablesFP, setTrimestresLiquidablesFP] = useState<string>('');
  const [resultatFonctionPublique, setResultatFonctionPublique] = useState({
    pensionFinale: 0,
    rafpAnnuelle: 0,
  });

  // Import RIS — le fichier n'est jamais conservé au-delà du parsing ni envoyé
  // à Supabase : il est lu en mémoire par parseRIS() puis abandonné.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [regimesDetectes, setRegimesDetectes] = useState<RegimeDetecte[]>([]);
  const [regimesPoints, setRegimesPoints] = useState<RegimeDetecte[]>([]);
  const [risDialogOpen, setRisDialogOpen] = useState(false);
  const [risImporting, setRisImporting] = useState(false);

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

  // Détection des changements
  useEffect(() => {
    const salaireDifferent = parseFloat(salaireAnnuelMoyen) !== (data.salaire_annuel_moyen || 0);
    const trimestresDifferent = parseInt(trimestresValides) !== (data.trimestres_valides || 0);
    const regimesPointsDifferent = JSON.stringify(regimesPoints) !== JSON.stringify(data.regimes_points || []);
    setHasChanges(salaireDifferent || trimestresDifferent || regimesPointsDifferent);
  }, [salaireAnnuelMoyen, trimestresValides, regimesPoints, data]);

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
  // publique le cas échéant), pas seulement les trimestres régime général.
  useEffect(() => {
    const trimValides = parseInt(trimestresValides) || 0;
    const trimFonctionPublique = hasFonctionPublique ? parseInt(trimestresLiquidablesFP) || 0 : 0;
    setDecoteSurcote(decoteSurTrimestres(trimValides + trimFonctionPublique, trimestresRequis));
  }, [trimestresValides, trimestresRequis, hasFonctionPublique, trimestresLiquidablesFP]);

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
    
    const success = await saveRetraiteData(updates);
    if (success) {
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
      const { regimes, texteIllisible } = await parseRIS(file);
      if (texteIllisible || regimes.length === 0) {
        toast({
          title: 'Import impossible',
          description: 'Impossible de lire ce document automatiquement, merci de saisir les informations manuellement.',
          variant: 'destructive',
        });
        return;
      }
      setRegimesDetectes(regimes);
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

  const handleValidateRIS = (regimesValides: RegimeDetecte[]) => {
    // trimestresValides = somme de tous les régimes de type "trimestres"
    // détectés dans le RIS (Assurance retraite, MSA Salariés, ou tout autre
    // régime aligné présenté séparément) — depuis la réforme LURA (2017), les
    // trimestres des régimes alignés se fusionnent dans un seul calcul, donc
    // on ne privilégie plus un unique régime "Assurance retraite" au risque
    // d'ignorer silencieusement les trimestres d'un régime aligné distinct.
    const regimesTrimestres = regimesValides.filter(r => r.type === 'trimestres' && r.trimestres !== undefined);
    if (regimesTrimestres.length > 0) {
      const totalTrimestres = regimesTrimestres.reduce((total, r) => total + (r.trimestres || 0), 0);
      setTrimestresValides(totalTrimestres.toString());
    }

    // Les régimes complémentaires par points sont conservés à part : pas de
    // calcul de pension complémentaire à ce stade. Un nouvel import remplace
    // entièrement la liste précédente (pas de fusion, pour éviter les doublons
    // si un régime a changé de valeur d'une année sur l'autre) ; la
    // persistance effective se fait via handleSave, comme les autres champs.
    setRegimesPoints(regimesValides.filter(r => r.type === 'points'));

    setRisDialogOpen(false);
  };

  const handleRemoveRegimePoint = (index: number) => {
    setRegimesPoints(regimesPoints.filter((_, i) => i !== index));
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
  const pensionTotaleConsolidee = pensionTotaleRegimeGeneral + pensionTotaleFonctionPublique;

  return (
    <div className="space-y-6">
      {hasChanges && (
        <div className="flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
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

          {(pensionBaseBrute > 0 || regimesPoints.length > 0 || hasFonctionPublique) && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <Label>
                Total consolidé{hasFonctionPublique ? ' tous régimes' : ''} (pension de base ajustée +
                pensions complémentaires{hasFonctionPublique ? ' + fonction publique + RAFP' : ''})
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
              {hasFonctionPublique && (
                <p className="text-sm text-muted-foreground mt-2 pt-2 border-t">
                  Détail par régime : régime général (base + complémentaires) ={' '}
                  {formatEuro2(pensionTotaleRegimeGeneral)} / an — fonction publique (pension +
                  RAFP) = {formatEuro2(pensionTotaleFonctionPublique)} / an
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

      <CarriereFonctionPublique
        trimestresRequis={trimestresRequis}
        trimestresValidesRegimeGeneral={parseInt(trimestresValides) || 0}
        hasFonctionPublique={hasFonctionPublique}
        onHasFonctionPubliqueChange={setHasFonctionPublique}
        trimestresLiquidables={trimestresLiquidablesFP}
        onTrimestresLiquidablesChange={setTrimestresLiquidablesFP}
        onResultChange={setResultatFonctionPublique}
      />

      <RISImportDialog
        open={risDialogOpen}
        regimes={regimesDetectes}
        onValidate={handleValidateRIS}
        onCancel={() => setRisDialogOpen(false)}
      />
    </div>
  );
};