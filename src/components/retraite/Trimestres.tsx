import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export const Trimestres = () => {
  const [trimestresValides, setTrimestresValides] = useState<string>('');
  const [trimestresRequis] = useState<number>(172); // Valeur par défaut, sera récupérable depuis la fiche client
  const [ageTauxPlein, setAgeTauxPlein] = useState<string>('');

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
    </div>
  );
};