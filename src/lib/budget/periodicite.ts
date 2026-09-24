// Point d'entrée unique pour la conversion de périodicité et le filtre « ligne active » du Budget,
// partagé par BudgetList.tsx, BudgetResume.tsx (KPI, donuts, graphique mensuel) et Dashboard.tsx
// (cf. docs/budget.md). Accepte les deux graphies (masculine côté revenus/charges, féminine côté
// asset_revenus/asset_charges) et ignore la casse.

export interface BudgetLine {
  montant?: number | null;
  periodicite?: string | null;
  date_debut?: string | null;
  date_fin?: string | null;
}

const normalize = (periodicite?: string | null): string => {
  const p = (periodicite || 'mensuel').toLowerCase();
  if (p.startsWith('mensuel')) return 'mensuel';
  if (p.startsWith('trimestriel')) return 'trimestriel';
  if (p.startsWith('semestriel')) return 'semestriel';
  if (p.startsWith('annuel')) return 'annuel';
  if (p.startsWith('ponctuel')) return 'ponctuel';
  return 'mensuel'; // valeur inconnue : défaut du formulaire
};

export const isPonctuel = (periodicite?: string | null): boolean => normalize(periodicite) === 'ponctuel';

// Montant annuel d'une occurrence de la ligne (un ponctuel vaut son montant, une seule fois).
export const toAnnual = (montant: number | null | undefined, periodicite?: string | null): number => {
  const m = Number(montant) || 0;
  switch (normalize(periodicite)) {
    case 'mensuel': return m * 12;
    case 'trimestriel': return m * 4;
    case 'semestriel': return m * 2;
    default: return m; // annuel, ponctuel
  }
};

// Les dates 'YYYY-MM-DD' sont lues en heure locale : new Date('YYYY-MM-DD') les lirait à minuit UTC,
// ce qui exclurait à Paris une ligne le jour même de son début.
export const parseLocalDate = (value: string): Date => {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const startOfDay = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

// Ligne prise en compte dans les totaux à la date de référence :
// - récurrente : démarrée (ou sans date_debut) et non terminée (ou sans date_fin) ;
// - ponctuelle : comptée uniquement dans l'année civile de sa date_debut (sans date : l'année en cours),
//   pour ne pas la répéter chaque année comme une ligne annuelle.
export const isActiveOn = (line: BudgetLine, ref: Date = new Date()): boolean => {
  const day = startOfDay(ref);
  if (isPonctuel(line.periodicite)) {
    return !line.date_debut || parseLocalDate(line.date_debut).getFullYear() === day.getFullYear();
  }
  if (line.date_fin && parseLocalDate(line.date_fin) < day) return false;
  if (line.date_debut && parseLocalDate(line.date_debut) > day) return false;
  return true;
};

// Total annuel des lignes actives à la date de référence.
export const sumAnnualActive = (lines: BudgetLine[], ref: Date = new Date()): number =>
  lines.reduce((sum, l) => (isActiveOn(l, ref) ? sum + toAnnual(l.montant, l.periodicite) : sum), 0);
