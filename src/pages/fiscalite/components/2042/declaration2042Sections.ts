import { ComponentType } from 'react';
import { Users, Wallet, LucideIcon } from 'lucide-react';
import MenageSection from './MenageSection';
import { RevenusSalairesForm } from '@/components/fiscalite/RevenusSalairesForm';

export interface Declaration2042Section {
  id: string;
  label: string;
  icon: LucideIcon;
  component: ComponentType;
}

// Ordre des sections = ordre du formulaire 2042. Ajouter une sous-phase future
// (2.2 frais réels, 2.3 gains d'actionnariat, 2.4 cas spécifiques, ou un futur
// cadre 2042 hors "Salaires") revient à ajouter une entrée ici, sans toucher
// à Declaration2042Interface ni Declaration2042Sidebar.
export const DECLARATION_2042_SECTIONS: Declaration2042Section[] = [
  { id: 'menage', label: 'Ménage — état civil et parts', icon: Users, component: MenageSection },
  { id: 'salaires', label: 'Traitements et salaires', icon: Wallet, component: RevenusSalairesForm },
];
