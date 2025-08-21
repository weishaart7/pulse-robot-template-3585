import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export const Carriere = () => {
  const [salaireAnnuelMoyen, setSalaireAnnuelMoyen] = useState<string>('');
  const [trimestresValides, setTrimestresValides] = useState<string>('');
  const [trimestresRequis] = useState<number>(172); // Valeur par défaut
  const [pensionBaseBrute, setPensionBaseBrute] = useState<number>(0);
  const [decoteSurcote, setDecoteSurcote] = useState<number>(0);

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