import { ComponentType } from 'react';
import { Users, Wallet, LineChart, Globe, PiggyBank, Coins, TrendingUp, Home, Briefcase, Receipt, HandHeart, Landmark, LucideIcon } from 'lucide-react';
import MenageSection from './MenageSection';
import { RevenusSalairesForm } from '@/components/fiscalite/RevenusSalairesForm';
import { GainsActionnariatSalarieForm } from '@/components/fiscalite/GainsActionnariatSalarieForm';
import { RevenusExoneresTauxEffectifForm } from '@/components/fiscalite/RevenusExoneresTauxEffectifForm';
import { PensionsRetraitesRentesForm } from '@/components/fiscalite/PensionsRetraitesRentesForm';
import { RevenusCapitauxMobiliersForm } from '@/components/fiscalite/RevenusCapitauxMobiliersForm';
import { PlusValuesGainsDiversForm } from '@/components/fiscalite/PlusValuesGainsDiversForm';
import { RevenusFonciersForm } from '@/components/fiscalite/RevenusFonciersForm';
import { RevenusNonSalariesForm } from '@/components/fiscalite/RevenusNonSalariesForm';
import { ChargesDeductiblesForm } from '@/components/fiscalite/ChargesDeductiblesForm';
import { ReductionsCreditsImpotForm } from '@/components/fiscalite/ReductionsCreditsImpotForm';
import { PrelevementSourceDiversForm } from '@/components/fiscalite/PrelevementSourceDiversForm';

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
  { id: 'revenus-fonciers', groupe: 'Cadre 4 · Revenus fonciers', label: 'Revenus fonciers', icon: Home, component: RevenusFonciersForm },
  { id: 'non-salaries', groupe: 'Cadre 5 · Professions non salariées', label: 'BIC, BNC, BA (2042-C-PRO)', icon: Briefcase, component: RevenusNonSalariesForm },
  { id: 'charges-deductibles', groupe: 'Cadre 6 · Charges déductibles', label: 'Charges déductibles', icon: Receipt, component: ChargesDeductiblesForm },
  { id: 'reductions-credits', groupe: 'Cadre 7 · Réductions et crédits', label: "Réductions et crédits d'impôt", icon: HandHeart, component: ReductionsCreditsImpotForm },
  { id: 'prelevement-source', groupe: 'Cadre 8 · Prélèvement à la source et divers', label: 'Prélèvement à la source et divers', icon: Landmark, component: PrelevementSourceDiversForm },
];
