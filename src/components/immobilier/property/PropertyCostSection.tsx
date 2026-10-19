import React from 'react';
import { PanelSection } from './PanelSection';
import { Asset } from '@/services/assetService';
import { FRAIS_DETAILLES } from '@/schemas/immobilierPropertySchema';
import { formatCurrency } from '@/lib/patrimoine/utils';

interface PropertyCostSectionProps {
  asset: Asset;
  showMeublesField?: boolean;
}

// Coût de revient en lecture seule : il se saisit dans le formulaire d'actif de Patrimoine, qui
// tient en un seul endroit le prix d'achat, les frais détaillés et leur somme (frais d'acquisition),
// entrées de la plus-value et de la qualification du bien.
export const PropertyCostSection: React.FC<PropertyCostSectionProps> = ({ asset, showMeublesField = false }) => {
  const prixAchat = asset.montant_immeuble ?? asset.valeur_acquisition;
  const lignes: { label: string; valeur: number | null | undefined }[] = [
    { label: "Prix d'achat du bien", valeur: prixAchat },
    ...FRAIS_DETAILLES
      .filter((f) => f.name !== 'meubles' || showMeublesField)
      .map((f) => ({ label: f.label, valeur: asset[f.name] })),
  ];

  return (
    <PanelSection
      title="Coût de revient"
      grid={false}
      description="Se modifie dans Patrimoine → Actifs → ce bien, onglet Propriété : le prix et les frais y servent aussi à la plus-value et à la qualification du bien."
    >
      <dl className="-mx-2 grid grid-cols-1 border-y border-border md:grid-cols-2 md:gap-x-6">
        {lignes.map(({ label, valeur }) => (
          <div key={label} className="flex items-baseline justify-between gap-4 border-b border-border px-2 py-2.5 text-[13px] last:border-b-0 md:[&:nth-last-child(2):nth-child(odd)]:border-b-0">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="tabular-nums text-foreground">{valeur != null ? formatCurrency(valeur) : '—'}</dd>
          </div>
        ))}
      </dl>
    </PanelSection>
  );
};
