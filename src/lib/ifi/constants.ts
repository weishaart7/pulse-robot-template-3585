export interface IFICategorieOption {
  value: string;
  label: string;
}

export const IFI_PASSIF_CATEGORIES: IFICategorieOption[] = [
  { value: 'emprunt-rp', label: 'Emprunt immobilier sur la résidence principale' },
  { value: 'autre-emprunt', label: 'Autre emprunt immobilier' },
  { value: 'dette-travaux', label: 'Dette afférente à des travaux sur bien imposable' },
  { value: 'dette-bois-forets', label: 'Dettes liées à des bois et forêts et parts de GF' },
  { value: 'dette-biens-ruraux', label: 'Dettes liées à des biens ruraux loués à long terme' },
  { value: 'dette-gfa-gaf', label: 'Dettes liées à des parts de GFA et de GAF' },
  { value: 'autres-impots', label: 'Autres impôts et taxes' },
];

/** Libellé lisible d'une catégorie de passif ; retombe sur le slug brut si aucune correspondance (données historiques). */
export function getPassifCategorieLabel(value: string): string {
  return IFI_PASSIF_CATEGORIES.find((option) => option.value === value)?.label ?? value;
}
