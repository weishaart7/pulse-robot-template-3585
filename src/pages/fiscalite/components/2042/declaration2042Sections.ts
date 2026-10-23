import { ComponentType } from 'react';
import { Users, Wallet, LineChart, Globe, PiggyBank, Coins, TrendingUp, LucideIcon } from 'lucide-react';
import MenageSection from './MenageSection';
import { RevenusSalairesForm } from '@/components/fiscalite/RevenusSalairesForm';
import { GainsActionnariatSalarieForm } from '@/components/fiscalite/GainsActionnariatSalarieForm';
import { RevenusExoneresTauxEffectifForm } from '@/components/fiscalite/RevenusExoneresTauxEffectifForm';
import { PensionsRetraitesRentesForm } from '@/components/fiscalite/PensionsRetraitesRentesForm';
import { RevenusCapitauxMobiliersForm } from '@/components/fiscalite/RevenusCapitauxMobiliersForm';
import { PlusValuesGainsDiversForm } from '@/components/fiscalite/PlusValuesGainsDiversForm';

export interface Declaration2042Section {
  id: string;
  label: string;
  /** Regroupement dans la navigation, dans l'ordre du formulaire (foyer, cadre 1, cadre 2…). */
  groupe: string;
  icon: LucideIcon;
  component: ComponentType;
}

// Ordre des sections = ordre du formulaire 2042. Ajouter une sous-phase future
// (TNS, BIC/BNC, ou un futur cadre 2042 hors "Salaires") revient à ajouter une
// entrée ici, sans toucher à Declaration2042Interface ni Declaration2042Sidebar.
export const DECLARATION_2042_SECTIONS: Declaration2042Section[] = [
  { id: 'menage', label: 'Ménage — état civil et parts', groupe: 'Foyer', icon: Users, component: MenageSection },
  { id: 'salaires', groupe: 'Cadre 1 · Salaires, pensions', label: 'Traitements et salaires', icon: Wallet, component: RevenusSalairesForm },
  { id: 'taux-effectif', groupe: 'Cadre 1 · Salaires, pensions', label: 'Exonérés retenus pour le taux effectif', icon: Globe, component: RevenusExoneresTauxEffectifForm },
  { id: 'pensions', groupe: 'Cadre 1 · Salaires, pensions', label: 'Pensions, retraites et rentes', icon: PiggyBank, component: PensionsRetraitesRentesForm },
  { id: 'actionnariat', groupe: 'Cadre 1 · Salaires, pensions', label: "Gains d'actionnariat salarié", icon: LineChart, component: GainsActionnariatSalarieForm },
  { id: 'capitaux-mobiliers', groupe: 'Cadre 2 · Capitaux mobiliers', label: 'Valeurs et capitaux mobiliers', icon: Coins, component: RevenusCapitauxMobiliersForm },
  { id: 'plus-values', groupe: 'Cadre 3 · Plus-values', label: 'Plus-values et gains divers', icon: TrendingUp, component: PlusValuesGainsDiversForm },
];
