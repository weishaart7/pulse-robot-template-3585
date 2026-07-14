import React, { useRef, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Save, Upload } from 'lucide-react';
import { useRetraiteData } from '@/hooks/useRetraiteData';
import { useToast } from '@/hooks/use-toast';
import { parseRIS, RegimeDetecte } from '@/lib/retraite/parseRIS';
import { RISImportDialog } from '@/components/retraite/RISImportDialog';

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
    }
  }, [data, loading]);

  // Détection des changements
  useEffect(() => {
    const salaireDifferent = parseFloat(salaireAnnuelMoyen) !== (data.salaire_annuel_moyen || 0);
    const trimestresDifferent = parseInt(trimestresValides) !== (data.trimestres_valides || 0);
    setHasChanges(salaireDifferent || trimestresDifferent);
  }, [salaireAnnuelMoyen, trimestresValides, data]);

  // Calcul de la pension de base brute
  useEffect(() => {
    const salaire = parseFloat(salaireAnnuelMoyen) || 0;
    const trimValides = parseInt(trimestresValides) || 0;
    const tauxPlein = 0.5; // 50%

    if (salaire > 0 && trimValides > 0) {
      // Le taux de proratisation ne peut jamais dépasser 100% : au-delà de
      // trimestresRequis, l'avantage supplémentaire relève de la surcote
      // (appliquée séparément ci-dessous), pas d'un ratio > 1 ici.
      const tauxProratisation = Math.min(trimValides / trimestresRequis, 1);
      const pension = salaire * tauxPlein * tauxProratisation;
      setPensionBaseBrute(pension);
    } else {
      setPensionBaseBrute(0);
    }
  }, [salaireAnnuelMoyen, trimestresValides, trimestresRequis]);

  // Calcul décote/surcote
  useEffect(() => {
    const trimValides = parseInt(trimestresValides) || 0;
    const difference = trimValides - trimestresRequis;

    if (difference < 0) {
      // Décote : -1,25% par trimestre manquant (maximum -20%)
      const decote = Math.max(difference * 1.25, -20);
      setDecoteSurcote(decote);
    } else if (difference > 0) {
      // Surcote : +1,25% par trimestre supplémentaire
      const surcote = difference * 1.25;
      setDecoteSurcote(surcote);
    } else {
      setDecoteSurcote(0);
    }
  }, [trimestresValides, trimestresRequis]);

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
    // Le régime de base (trimestres) préremplit trimestresValides : on
    // privilégie un régime explicitement nommé "Assurance retraite", sinon
    // le premier régime de type trimestres détecté.
    const regimesTrimestres = regimesValides.filter(r => r.type === 'trimestres' && r.trimestres !== undefined);
    const regimeBase = regimesTrimestres.find(r => /assurance retraite/i.test(r.nom)) || regimesTrimestres[0];
    if (regimeBase?.trimestres !== undefined) {
      setTrimestresValides(regimeBase.trimestres.toString());
    }

    // Les régimes complémentaires par points sont conservés à part : pas de
    // calcul de pension complémentaire à ce stade, pas de persistance Supabase
    // (aucune colonne dédiée n'existe encore dans retraite_data).
    setRegimesPoints(regimesValides.filter(r => r.type === 'points'));

    setRisDialogOpen(false);
  };

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
        </CardContent>
      </Card>

      <RISImportDialog
        open={risDialogOpen}
        regimes={regimesDetectes}
        onValidate={handleValidateRIS}
        onCancel={() => setRisDialogOpen(false)}
      />
    </div>
  );
};