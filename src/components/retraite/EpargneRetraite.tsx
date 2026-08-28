import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { useRetraiteData, Personne } from '@/hooks/useRetraiteData';
import { useAutoSave } from '@/hooks/useAutoSave';
import { SaveStatusIndicator } from '@/components/ui/save-status-indicator';
import { useAssets } from '@/hooks/useAssets';
import { NATURES_PER } from '@/constants/assetTypes';
import { getPartSuccessorale, BienNonQualifieError } from '@/lib/patrimoine/succession';

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

interface EpargneRetraiteProps {
  // Colonne conjoint (cf. RetraiteSection.tsx / ColonnesPersonnes.tsx) — même
  // convention que Carriere.tsx.
  personne?: Personne;
}

export const EpargneRetraite = ({ personne = 'utilisateur' }: EpargneRetraiteProps = {}) => {
  const { data, loading, saveRetraiteData } = useRetraiteData(personne);
  const { assets, loading: loadingAssets } = useAssets();
  const navigate = useNavigate();
  const [autresEpargnes, setAutresEpargnes] = useState<string>('');

  // Chargement des données depuis Supabase
  useEffect(() => {
    if (!loading && data) {
      if (data.autres_epargnes !== undefined && data.autres_epargnes !== null) {
        setAutresEpargnes(data.autres_epargnes.toString());
      }
    }
  }, [data, loading]);

  const { status: saveStatus, saveNow } = useAutoSave(
    () => saveRetraiteData({ autres_epargnes: parseFloat(autresEpargnes) || 0 }, { silent: true }),
    [autresEpargnes]
  );

  const perAssetsFoyer = assets.filter(a => NATURES_PER.includes(a.nature));
  const assuranceVieAssetsFoyer = assets.filter(a => NATURES_ASSURANCE_VIE.includes(a.nature));

  // Part du conjoint dans un actif détenu par le foyer — même moteur que
  // Patrimoine > Vue par tête (PatrimoineParTeteDetail.tsx::computeByCategory) :
  // getPartSuccessorale() renvoie la fraction utilisateur, 1 - fraction pour
  // le conjoint. Un bien jamais qualifié (qualification_bien absent/"À
  // qualifier") est exclu silencieusement plutôt que deviné, même convention
  // que la vue par tête — pas de nouvelle règle introduite ici.
  const partConjoint = (asset: (typeof assets)[number]): number => {
    try {
      return 1 - getPartSuccessorale(asset);
    } catch (error) {
      if (error instanceof BienNonQualifieError) return 0;
      throw error;
    }
  };

  // Corrigé le 28/08/2026 (cf. audit patrimoine.md, IR3) : colonne
  // utilisateur = part complémentaire à `partConjoint`, même convention que
  // "Patrimoine par tête" (userValue + spouseValue = totalValue). Avant ce
  // correctif, la colonne utilisateur affichait le total du foyer entier
  // (PER/AV de l'utilisateur ET du conjoint), rompant cette symétrie.
  const partUtilisateur = (asset: (typeof assets)[number]): number => 1 - partConjoint(asset);

  const perAssets = personne === 'conjoint'
    ? perAssetsFoyer.filter(a => partConjoint(a) > 0)
    : perAssetsFoyer.filter(a => partUtilisateur(a) > 0);
  const assuranceVieAssets = personne === 'conjoint'
    ? assuranceVieAssetsFoyer.filter(a => partConjoint(a) > 0)
    : assuranceVieAssetsFoyer.filter(a => partUtilisateur(a) > 0);

  const valeurAffichee = (asset: (typeof assets)[number]) =>
    (asset.valeur_estimee || 0) * (personne === 'conjoint' ? partConjoint(asset) : partUtilisateur(asset));

  const totalPer = perAssets.reduce((sum, a) => sum + valeurAffichee(a), 0);
  const totalAssuranceVie = assuranceVieAssets.reduce((sum, a) => sum + valeurAffichee(a), 0);

  const totalEpargne = totalPer + totalAssuranceVie + (parseFloat(autresEpargnes) || 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <SaveStatusIndicator status={saveStatus} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 p-5">
          <div>
            <CardTitle className="text-[15px] font-semibold tracking-tight">Épargne retraite</CardTitle>
            <CardDescription className="text-xs">
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
        <CardContent className="p-5 pt-0 space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">PER (Plan Épargne Retraite)</Label>
              <div className="text-xl font-semibold text-primary">
                {formatCurrency(totalPer)}
              </div>
              {loadingAssets ? (
                <p className="text-xs text-muted-foreground">Chargement...</p>
              ) : perAssets.length > 0 ? (
                <ul className="space-y-1 mt-1.5">
                  {perAssets.map(asset => (
                    <li key={asset.id} className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="truncate">{asset.denomination || asset.nature}</span>
                      <span className="shrink-0 ml-2">{formatCurrency(valeurAffichee(asset))}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Aucun actif PER déclaré dans Patrimoine.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Assurance vie</Label>
              <div className="text-xl font-semibold text-primary">
                {formatCurrency(totalAssuranceVie)}
              </div>
              {loadingAssets ? (
                <p className="text-xs text-muted-foreground">Chargement...</p>
              ) : assuranceVieAssets.length > 0 ? (
                <ul className="space-y-1 mt-1.5">
                  {assuranceVieAssets.map(asset => (
                    <li key={asset.id} className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="truncate">{asset.denomination || asset.nature}</span>
                      <span className="shrink-0 ml-2">{formatCurrency(valeurAffichee(asset))}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Aucun contrat d'assurance-vie déclaré dans Patrimoine.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="autres-epargnes" className="text-xs">Autres épargnes retraite - €</Label>
            <Input
              id="autres-epargnes"
              type="number"
              placeholder="Ex: 25000"
              value={autresEpargnes}
              onChange={(e) => setAutresEpargnes(e.target.value)}
              onBlur={saveNow}
             className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring"/>
            <p className="text-xs text-muted-foreground">
              Comptes épargne, placements divers, etc.
            </p>
          </div>

          {totalEpargne > 0 && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <Label className="text-xs">Total épargne retraite</Label>
              <div className="text-lg font-semibold text-primary">
                {formatCurrency(totalEpargne)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
