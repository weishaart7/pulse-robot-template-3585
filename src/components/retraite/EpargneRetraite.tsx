import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Save, ExternalLink } from 'lucide-react';
import { useRetraiteData } from '@/hooks/useRetraiteData';
import { useAssets } from '@/hooks/useAssets';
import { NATURES_PER } from '@/constants/assetTypes';

// Natures de la catégorie "épargne et assurance-vie" (assetTypes.ts) retenues
// ici pour le total assurance-vie de la section Retraite.
const NATURES_ASSURANCE_VIE = [
  "Contrat d'assurance-vie",
  "Contrat vie-génération",
  "PEP assurance vie",
  "Bons & contrats de capitalisation",
];

const formatCurrency = (value: number) => value.toLocaleString('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export const EpargneRetraite = () => {
  const { data, loading, saving, saveRetraiteData } = useRetraiteData();
  const { assets, loading: loadingAssets } = useAssets();
  const navigate = useNavigate();
  const [autresEpargnes, setAutresEpargnes] = useState<string>('');
  const [hasChanges, setHasChanges] = useState(false);

  // Chargement des données depuis Supabase
  useEffect(() => {
    if (!loading && data) {
      if (data.autres_epargnes !== undefined && data.autres_epargnes !== null) {
        setAutresEpargnes(data.autres_epargnes.toString());
      }
    }
  }, [data, loading]);

  // Détection des changements
  useEffect(() => {
    const autresDifferent = parseFloat(autresEpargnes) !== (data.autres_epargnes || 0);
    setHasChanges(autresDifferent);
  }, [autresEpargnes, data]);

  const handleSave = async () => {
    const updates = {
      autres_epargnes: parseFloat(autresEpargnes) || 0,
    };

    const success = await saveRetraiteData(updates);
    if (success) {
      setHasChanges(false);
    }
  };

  const perAssets = assets.filter(a => NATURES_PER.includes(a.nature));
  const assuranceVieAssets = assets.filter(a => NATURES_ASSURANCE_VIE.includes(a.nature));

  const totalPer = perAssets.reduce((sum, a) => sum + (a.valeur_estimee || 0), 0);
  const totalAssuranceVie = assuranceVieAssets.reduce((sum, a) => sum + (a.valeur_estimee || 0), 0);

  const totalEpargne = totalPer + totalAssuranceVie + (parseFloat(autresEpargnes) || 0);

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
            <CardTitle>Épargne retraite</CardTitle>
            <CardDescription>
              Actifs PER et assurance-vie déjà déclarés dans le module Patrimoine
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => navigate('/dashboard/patrimoine')}
          >
            <ExternalLink className="h-4 w-4" />
            Voir/ajouter dans Patrimoine
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>PER (Plan Épargne Retraite)</Label>
              <div className="text-2xl font-semibold text-primary">
                {formatCurrency(totalPer)}
              </div>
              {loadingAssets ? (
                <p className="text-sm text-muted-foreground">Chargement...</p>
              ) : perAssets.length > 0 ? (
                <ul className="space-y-1 mt-2">
                  {perAssets.map(asset => (
                    <li key={asset.id} className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="truncate">{asset.denomination || asset.nature}</span>
                      <span className="shrink-0 ml-2">{formatCurrency(asset.valeur_estimee || 0)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucun actif PER déclaré dans Patrimoine.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Assurance vie</Label>
              <div className="text-2xl font-semibold text-primary">
                {formatCurrency(totalAssuranceVie)}
              </div>
              {loadingAssets ? (
                <p className="text-sm text-muted-foreground">Chargement...</p>
              ) : assuranceVieAssets.length > 0 ? (
                <ul className="space-y-1 mt-2">
                  {assuranceVieAssets.map(asset => (
                    <li key={asset.id} className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="truncate">{asset.denomination || asset.nature}</span>
                      <span className="shrink-0 ml-2">{formatCurrency(asset.valeur_estimee || 0)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucun contrat d'assurance-vie déclaré dans Patrimoine.
                </p>
              )}
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
             className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring"/>
            <p className="text-sm text-muted-foreground">
              Comptes épargne, placements divers, etc.
            </p>
          </div>

          {totalEpargne > 0 && (
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <Label>Total épargne retraite</Label>
              <div className="text-2xl font-semibold text-primary">
                {formatCurrency(totalEpargne)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
