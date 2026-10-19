import React from 'react';
import { PanelSection } from './PanelSection';
import { Asset } from '@/services/assetService';
import { FRAIS_DETAILLES } from '@/schemas/immobilierPropertySchema';
import { formatCurrency } from '@/lib/patrimoine/utils';
import type { Emprunt } from '@/services/passifService';

interface PropertyCostSectionProps {
  asset: Asset;
  /** Emprunts Patrimoine reliés au bien : leurs frais de dossier et de garantie entrent dans le coût. */
  empruntsRelies?: Emprunt[];
  showMeublesField?: boolean;
}

// Coût de revient en lecture seule : il se saisit dans le formulaire d'actif de Patrimoine, qui
// tient en un seul endroit le prix d'achat, les frais détaillés et leur somme (frais d'acquisition),
// entrées de la plus-value et de la qualification du bien.
export const PropertyCostSection: React.FC<PropertyCostSectionProps> = ({ asset, empruntsRelies = [], showMeublesField = false }) => {
  const prixAchat = asset.montant_immeuble ?? asset.valeur_acquisition;
  const lignes: { label: string; valeur: number | null | undefined }[] = [
    { label: "Prix d'achat du bien", valeur: prixAchat },
    ...FRAIS_DETAILLES
      .filter((f) => f.name !== 'meubles' || showMeublesField)
      .map((f) => ({ label: f.label, valeur: asset[f.name] })),
    ...(empruntsRelies.length > 0 ? [
      { label: 'Frais de dossier ou de courtier (crédit)', valeur: empruntsRelies.reduce((s, e) => s + (e.frais_dossier || 0), 0) },
      { label: 'Frais de garantie (crédit)', valeur: empruntsRelies.reduce((s, e) => s + (e.frais_garantie || 0), 0) },
    ] : []),
  ];

  return (
    <PanelSection
      title="Coût de revient"
      grid={false}
      description="Se modifie dans Patrimoine → Actifs → ce bien, onglet Propriété : le prix et les frais y servent aussi à la plus-value et à la qualification du bien. Les frais du crédit viennent de l'emprunt relié, dans Patrimoine → Passifs."
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
