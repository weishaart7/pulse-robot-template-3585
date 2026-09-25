import type { FamilyLink } from '@/services/familyService';

// Regroupement des membres par branche pour l'affichage de la sous-section Membres.
// L'ordre des liens dans chaque groupe fixe l'ordre des lignes (proche → éloigné).
const GROUPES = [
  { id: 'descendants', label: 'Descendants', liens: ['Enfant', 'Petit-enfant', 'Arrière petit-enfant'] },
  { id: 'ascendants', label: 'Ascendants', liens: ['Parent', 'Grand-parent', 'Arrière grand-parent'] },
  { id: 'collateraux', label: 'Collatéraux', liens: ['Frère/Sœur', 'Neveu/Nièce', 'Petit neveu/nièce', 'Oncle/Tante', 'Cousin/Cousine'] },
  { id: 'allies', label: 'Alliés', liens: ['Beau-parent', 'Beau-frère/Belle-sœur'] },
] as const;

export interface GroupeMembres {
  id: string;
  label: string;
  membres: FamilyLink[];
}

const naissance = (m: FamilyLink) => (m.date_naissance ? new Date(m.date_naissance).getTime() : Infinity);

export function grouperMembres(membres: FamilyLink[]): GroupeMembres[] {
  const groupes: GroupeMembres[] = GROUPES.map(g => {
    const liens: readonly string[] = g.liens;
    return {
      id: g.id,
      label: g.label,
      membres: membres
        .filter(m => liens.includes(m.lien_familial))
        .sort((a, b) => liens.indexOf(a.lien_familial) - liens.indexOf(b.lien_familial) || naissance(a) - naissance(b)),
    };
  });

  const connus = GROUPES.flatMap(g => g.liens as readonly string[]);
  const autres = membres.filter(m => !connus.includes(m.lien_familial));
  groupes.push({ id: 'autres', label: 'Autres', membres: autres });

  return groupes.filter(g => g.membres.length > 0);
}
