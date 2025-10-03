import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { useRetraiteData } from '@/hooks/useRetraiteData';

export const EpargneRetraite = () => {
  const { data, loading, saving, saveRetraiteData } = useRetraiteData();
  const [epargnePer, setEpargnePer] = useState<string>('');
  const [epargneAssuranceVie, setEpargneAssuranceVie] = useState<string>('');
  const [autresEpargnes, setAutresEpargnes] = useState<string>('');
  const [hasChanges, setHasChanges] = useState(false);

  // Chargement des données depuis Supabase
  useEffect(() => {
    if (!loading && data) {
      if (data.epargne_per !== undefined && data.epargne_per !== null) {
        setEpargnePer(data.epargne_per.toString());
      }
      if (data.epargne_assurance_vie !== undefined && data.epargne_assurance_vie !== null) {
        setEpargneAssuranceVie(data.epargne_assurance_vie.toString());
      }
      if (data.autres_epargnes !== undefined && data.autres_epargnes !== null) {
        setAutresEpargnes(data.autres_epargnes.toString());
      }
    }
  }, [data, loading]);

  // Détection des changements
  useEffect(() => {
    const perDifferent = parseFloat(epargnePer) !== (data.epargne_per || 0);
    const avDifferent = parseFloat(epargneAssuranceVie) !== (data.epargne_assurance_vie || 0);
    const autresDifferent = parseFloat(autresEpargnes) !== (data.autres_epargnes || 0);
    setHasChanges(perDifferent || avDifferent || autresDifferent);
  }, [epargnePer, epargneAssuranceVie, autresEpargnes, data]);

  const handleSave = async () => {
    const updates = {
      epargne_per: parseFloat(epargnePer) || 0,
      epargne_assurance_vie: parseFloat(epargneAssuranceVie) || 0,
      autres_epargnes: parseFloat(autresEpargnes) || 0,
    };
    
    const success = await saveRetraiteData(updates);
    if (success) {
      setHasChanges(false);
    }
  };

  const totalEpargne = (parseFloat(epargnePer) || 0) + 
                      (parseFloat(epargneAssuranceVie) || 0) + 
                      (parseFloat(autresEpargnes) || 0);

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