import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useRetraiteData } from '@/hooks/useRetraiteData';

export const Carriere = () => {
  const { data, loading, updateRetraiteData } = useRetraiteData();
  const [salaireAnnuelMoyen, setSalaireAnnuelMoyen] = useState<string>('');
  const [trimestresValides, setTrimestresValides] = useState<string>('');
  const [trimestresRequis] = useState<number>(172); // Valeur par défaut
  const [pensionBaseBrute, setPensionBaseBrute] = useState<number>(0);
  const [decoteSurcote, setDecoteSurcote] = useState<number>(0);
  const [ageTauxPlein, setAgeTauxPlein] = useState<string>('');

  // Chargement des données depuis Supabase
  useEffect(() => {
    if (!loading && data) {
      if (data.salaire_annuel_moyen) {
        setSalaireAnnuelMoyen(data.salaire_annuel_moyen.toString());
      }
      if (data.trimestres_valides) {
        setTrimestresValides(data.trimestres_valides.toString());
      }
    }
  }, [data, loading]);

  // Sauvegarde automatique du salaire
  useEffect(() => {
    const salaire = parseFloat(salaireAnnuelMoyen);
    if (salaire && salaire > 0 && !loading) {
      const timer = setTimeout(() => {
        updateRetraiteData({ salaire_annuel_moyen: salaire });
      }, 1000); // Délai de 1 seconde après la dernière modification
      return () => clearTimeout(timer);
    }
  }, [salaireAnnuelMoyen, updateRetraiteData, loading]);

  // Sauvegarde automatique des trimestres
  useEffect(() => {
    const trimValides = parseInt(trimestresValides);
    if (trimValides && trimValides > 0 && !loading) {
      const timer = setTimeout(() => {
        updateRetraiteData({ trimestres_valides: trimValides });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [trimestresValides, updateRetraiteData, loading]);

  // Calcul de la pension de base brute
  useEffect(() => {
    const salaire = parseFloat(salaireAnnuelMoyen) || 0;
    const trimValides = parseInt(trimestresValides) || 0;
    const tauxPlein = 0.5; // 50%

    if (salaire > 0 && trimValides > 0) {
      const pension = salaire * tauxPlein * (trimValides / trimestresRequis);
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informations de carrière</CardTitle>
          <CardDescription>
            Renseignez les éléments de votre carrière pour calculer votre pension
          </CardDescription>
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
              />
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
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trimestres-requis">Trimestres requis</Label>
              <Input
                id="trimestres-requis"
                type="number"
                value={trimestresRequis}
                disabled
                className="bg-muted"
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
    </div>
  );
};