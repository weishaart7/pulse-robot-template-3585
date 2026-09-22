import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useMaritalStatus } from '@/hooks/useFamilyData';
import { RegimeType, getSimplifiedRegime } from '@/types/matrimonial';
import { AssetSelectionModal } from './AssetSelectionModal';

interface QualificationRegimeOptionsProps {
  regimeType: RegimeType;
}

/**
 * Données de qualification de bien portées historiquement par le catalogue de
 * clauses (retiré en V1, cf. docs/regimes-matrimoniaux-clauses-v1-retire.md),
 * mais dont `lib/patrimoine/qualification.ts::qualifierBien` a structurellement
 * besoin pour déterminer si un bien est propre ou commun :
 * - Séparation de biens avec société d'acquêts : sans la liste des biens
 *   désignés dans la société d'acquêts, ce régime ne peut plus jamais
 *   qualifier un bien comme commun.
 * - Régime communautaire : l'extension de la communauté aux biens propres par
 *   nature (art. 1404/1526) fait tomber ces biens en commun.
 * Stockées dans `marital_status.clauses_contrat.societe_acquets` /
 * `.extension_propres_par_nature`, mêmes clés qu'avant le retrait des
 * clauses — seule l'UI de saisie a changé.
 */
export const QualificationRegimeOptions: React.FC<QualificationRegimeOptionsProps> = ({ regimeType }) => {
  const { data: maritalData, saveData } = useMaritalStatus();
  const [assetModalOpen, setAssetModalOpen] = useState(false);

  const clausesContrat = (maritalData as any)?.clauses_contrat || {};
  const societeAcquets = clausesContrat.societe_acquets as
    | { enabled?: boolean; selectedAssets?: string[]; options?: { residencePrincipale?: boolean } }
    | undefined;
  const extensionProprsParNature = clausesContrat.extension_propres_par_nature as
    | { enabled?: boolean }
    | undefined;

  const persist = (patch: Record<string, unknown>) =>
    saveData({ clauses_contrat: { ...clausesContrat, ...patch } } as any);

  if (regimeType === 'separation_societe_acquets') {
    const selectedAssets = societeAcquets?.selectedAssets || [];
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Désignez les biens qui composent la société d'acquêts (masse commune, soumise aux règles de la communauté) — le reste du patrimoine de chaque époux demeure propre.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAssetModalOpen(true)}
          className="text-xs"
        >
          Sélectionner les biens
          {selectedAssets.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 bg-[#0d1b1e]/10 text-[#0d1b1e] rounded-full text-[10px]">
              {selectedAssets.length}
            </span>
          )}
        </Button>
        <div className="flex items-center space-x-2 p-2 bg-muted/30 rounded-md">
          <Checkbox
            id="societe_acquets_residence_principale"
            checked={societeAcquets?.options?.residencePrincipale || false}
            onCheckedChange={(checked) =>
              persist({
                societe_acquets: {
                  enabled: true,
                  selectedAssets,
                  options: { residencePrincipale: !!checked },
                },
              })
            }
          />
          <Label htmlFor="societe_acquets_residence_principale" className="text-sm cursor-pointer">
            Résidence principale (quel que soit le bien)
          </Label>
        </div>

        <AssetSelectionModal
          title="Biens de la société d'acquêts"
          isOpen={assetModalOpen}
          onClose={() => setAssetModalOpen(false)}
          onConfirm={(assetIds) =>
            persist({
              societe_acquets: {
                enabled: assetIds.length > 0 || !!societeAcquets?.options?.residencePrincipale,
                selectedAssets: assetIds,
                options: societeAcquets?.options,
              },
            })
          }
          preSelectedAssets={selectedAssets}
        />
      </div>
    );
  }

  if (getSimplifiedRegime(regimeType) === 'communauté') {
    return (
      <div className="flex items-center space-x-2 p-2 bg-muted/30 rounded-md">
        <Checkbox
          id="extension_propres_par_nature"
          checked={extensionProprsParNature?.enabled || false}
          onCheckedChange={(checked) =>
            persist({ extension_propres_par_nature: { enabled: !!checked } })
          }
        />
        <Label htmlFor="extension_propres_par_nature" className="text-sm cursor-pointer">
          Étendre la communauté aux biens propres par nature (art. 1404, 1526)
        </Label>
      </div>
    );
  }

  return null;
};
