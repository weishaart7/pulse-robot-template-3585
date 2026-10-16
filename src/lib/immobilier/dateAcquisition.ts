import { format, getDaysInMonth, parseISO } from 'date-fns';

/**
 * Date d'acquisition à enregistrer depuis la fiche LMNP/LMP, qui ne saisit que l'année.
 * La date stockée (colonne `date`, 'yyyy-MM-dd') est conservée telle quelle si l'année n'a pas
 * changé, et seule son année est remplacée sinon (jour et mois gardés, 29 février ramené au 28
 * hors année bissextile) — la fiche ne doit pas ramener une date réelle au 1er janvier, cf.
 * docs/immobilier.md §3. Sans date stockée, repli sur le 1er janvier de l'année saisie.
 */
export function dateAcquisitionDepuisAnnee(
  anneeSaisie: string,
  dateStockee: string | null | undefined,
): string | null {
  const annee = parseInt(anneeSaisie, 10);
  if (!anneeSaisie || Number.isNaN(annee)) return null;

  if (!dateStockee) return `${String(annee).padStart(4, '0')}-01-01`;

  const date = parseISO(dateStockee);
  if (Number.isNaN(date.getTime())) return `${String(annee).padStart(4, '0')}-01-01`;
  if (date.getFullYear() === annee) return format(date, 'yyyy-MM-dd');
  // Jour borné au dernier jour du mois dans l'année cible (29 février → 28 hors année bissextile).
  const jour = Math.min(date.getDate(), getDaysInMonth(new Date(annee, date.getMonth(), 1)));
  return format(new Date(annee, date.getMonth(), jour), 'yyyy-MM-dd');
}
