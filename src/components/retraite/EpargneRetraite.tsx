import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useRetraiteData } from '@/hooks/useRetraiteData';

export const EpargneRetraite = () => {
  const { data, loading, updateRetraiteData } = useRetraiteData();
  const [epargnePer, setEpargnePer] = useState<string>('');
  const [epargneAssuranceVie, setEpargneAssuranceVie] = useState<string>('');
  const [autresEpargnes, setAutresEpargnes] = useState<string>('');

  // Chargement des données depuis Supabase
  useEffect(() => {
    if (!loading && data) {
      if (data.epargne_per) {
        setEpargnePer(data.epargne_per.toString());
      }
      if (data.epargne_assurance_vie) {
        setEpargneAssuranceVie(data.epargne_assurance_vie.toString());
      }
      if (data.autres_epargnes) {
        setAutresEpargnes(data.autres_epargnes.toString());
      }
    }
  }, [data, loading]);

  // Sauvegarde automatique PER
  useEffect(() => {
    const per = parseFloat(epargnePer);
    if (per && per > 0 && !loading) {
      const timer = setTimeout(() => {
        updateRetraiteData({ epargne_per: per });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [epargnePer, updateRetraiteData, loading]);

  // Sauvegarde automatique assurance vie
  useEffect(() => {
    const assuranceVie = parseFloat(epargneAssuranceVie);
    if (assuranceVie && assuranceVie > 0 && !loading) {
      const timer = setTimeout(() => {
        updateRetraiteData({ epargne_assurance_vie: assuranceVie });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [epargneAssuranceVie, updateRetraiteData, loading]);

  // Sauvegarde automatique autres épargnes
  useEffect(() => {
    const autres = parseFloat(autresEpargnes);
    if (autres && autres > 0 && !loading) {
      const timer = setTimeout(() => {
        updateRetraiteData({ autres_epargnes: autres });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [autresEpargnes, updateRetraiteData, loading]);

  const totalEpargne = (parseFloat(epargnePer) || 0) + 
                      (parseFloat(epargneAssuranceVie) || 0) + 
                      (parseFloat(autresEpargnes) || 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Épargne retraite</CardTitle>
          <CardDescription>
            Gérez votre épargne et vos placements retraite
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="epargne-per">PER (Plan Épargne Retraite) - €</Label>
              <Input
                id="epargne-per"
                type="number"
                placeholder="Ex: 50000"
                value={epargnePer}
                onChange={(e) => setEpargnePer(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="epargne-assurance-vie">Assurance vie - €</Label>
              <Input
                id="epargne-assurance-vie"
                type="number"
                placeholder="Ex: 75000"
                value={epargneAssuranceVie}
                onChange={(e) => setEpargneAssuranceVie(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="autres-epargnes">Autres épargnes retraite - €</Label>
            <Input
              id="autres-epargnes"
              type="number"
              placeholder="Ex: 25000"
              value={autresEpargnes}
              onChange={(e) => setAutresEpargnes(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Comptes épargne, placements divers, etc.
            </p>
          </div>

          {totalEpargne > 0 && (
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <Label>Total épargne retraite</Label>
              <div className="text-2xl font-semibold text-primary">
                {totalEpargne.toLocaleString('fr-FR', {
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