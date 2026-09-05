import { ComponentType } from 'react';
import { Users, Wallet, LineChart, Globe, PiggyBank, Coins, LucideIcon } from 'lucide-react';
import MenageSection from './MenageSection';
import { RevenusSalairesForm } from '@/components/fiscalite/RevenusSalairesForm';
import { GainsActionnariatSalarieForm } from '@/components/fiscalite/GainsActionnariatSalarieForm';
import { RevenusExoneresTauxEffectifForm } from '@/components/fiscalite/RevenusExoneresTauxEffectifForm';
import { PensionsRetraitesRentesForm } from '@/components/fiscalite/PensionsRetraitesRentesForm';
import { RevenusCapitauxMobiliersForm } from '@/components/fiscalite/RevenusCapitauxMobiliersForm';

export interface Declaration2042Section {
  id: string;
  label: string;
  icon: LucideIcon;
  component: ComponentType;
}

// Ordre des sections = ordre du formulaire 2042. Ajouter une sous-phase future
// (TNS, BIC/BNC, ou un futur cadre 2042 hors "Salaires") revient à ajouter une
// entrée ici, sans toucher à Declaration2042Interface ni Declaration2042Sidebar.
export const DECLARATION_2042_SECTIONS: Declaration2042Section[] = [
  { id: 'menage', label: 'Ménage — état civil et parts', icon: Users, component: MenageSection },
  { id: 'salaires', label: 'Traitements et salaires', icon: Wallet, component: RevenusSalairesForm },
  { id: 'taux-effectif', label: 'Salaires & pensions exonérés (taux effectif)', icon: Globe, component: RevenusExoneresTauxEffectifForm },
  { id: 'pensions', label: 'Pensions, retraites et rentes', icon: PiggyBank, component: PensionsRetraitesRentesForm },
  { id: 'actionnariat', label: "Gains d'actionnariat salarié", icon: LineChart, component: GainsActionnariatSalarieForm },
  { id: 'capitaux-mobiliers', label: 'Revenus des valeurs et capitaux mobiliers', icon: Coins, component: RevenusCapitauxMobiliersForm },
];
