import { useNavigate } from 'react-router-dom';
import { useModuleSubNav } from '@/hooks/useModuleSubNav';

// Sous-sections du module Famille dans le panneau latéral. Contrairement aux
// autres modules (onglets locaux), chacune correspond à une route distincte.
const FAMILLE_SUBNAV = [
  { id: 'foyer', label: 'Foyer', href: '/dashboard/famille' },
  { id: 'regime', label: 'Régime matrimonial', href: '/dashboard/famille/situation-matrimoniale' },
  { id: 'membres', label: 'Membres de la famille', href: '/dashboard/famille/membres' },
] as const;

export type FamilleSubNavId = typeof FAMILLE_SUBNAV[number]['id'];

export function useFamilleSubNav(activeId: FamilleSubNavId) {
  const navigate = useNavigate();
  useModuleSubNav(
    FAMILLE_SUBNAV.map(({ id, label }) => ({ id, label })),
    activeId,
    (id) => {
      const target = FAMILLE_SUBNAV.find(item => item.id === id);
      if (target) navigate(target.href);
    }
  );
}
