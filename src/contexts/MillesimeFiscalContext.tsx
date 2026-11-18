import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  ANNEE_REVENUS_PAR_DEFAUT,
  millesimeDisponible,
  parametresFiscaux,
  type ParametresFiscaux,
} from '@/lib/fiscalite/parametres';

/**
 * Millésime de règles fiscales choisi par l'utilisateur : les mêmes saisies de la 2042 sont calculées
 * avec les paramètres de cette année de revenus ; la 2044 et la 2042-IFI suivent la même année.
 * Choix mémorisé dans le navigateur (commodité par poste), repli sur le millésime par défaut.
 */
interface MillesimeFiscalValue {
  anneeRevenus: number;
  parametres: ParametresFiscaux;
  choisirAnneeRevenus: (annee: number) => void;
}

export const CLE_STOCKAGE_MILLESIME = 'aurevia.millesimeFiscal';

export function lireMillesimeMemorise(): number {
  try {
    const valeur = Number(window.localStorage.getItem(CLE_STOCKAGE_MILLESIME));
    return Number.isInteger(valeur) && millesimeDisponible(valeur) ? valeur : ANNEE_REVENUS_PAR_DEFAUT;
  } catch {
    return ANNEE_REVENUS_PAR_DEFAUT;
  }
}

function memoriserMillesime(annee: number): void {
  try {
    window.localStorage.setItem(CLE_STOCKAGE_MILLESIME, String(annee));
  } catch {
    // Stockage indisponible (navigation privée, données bloquées) : choix gardé pour la session.
  }
}

const valeurParDefaut = (annee: number): MillesimeFiscalValue => ({
  anneeRevenus: annee,
  parametres: parametresFiscaux(annee),
  choisirAnneeRevenus: () => {},
});

const MillesimeFiscalContext = createContext<MillesimeFiscalValue>(valeurParDefaut(ANNEE_REVENUS_PAR_DEFAUT));

/** `anneeInitiale` (tests, écrans dédiés) remplace le choix mémorisé s'il désigne un millésime disponible. */
export function MillesimeFiscalProvider({ children, anneeInitiale }: { children: ReactNode; anneeInitiale?: number }) {
  const [anneeRevenus, setAnneeRevenus] = useState(() =>
    anneeInitiale !== undefined && millesimeDisponible(anneeInitiale) ? anneeInitiale : lireMillesimeMemorise());
  const choisirAnneeRevenus = useCallback((annee: number) => {
    if (!millesimeDisponible(annee)) return;
    setAnneeRevenus(annee);
    memoriserMillesime(annee);
  }, []);
  const valeur = useMemo(
    () => ({ anneeRevenus, parametres: parametresFiscaux(anneeRevenus), choisirAnneeRevenus }),
    [anneeRevenus, choisirAnneeRevenus],
  );
  return <MillesimeFiscalContext.Provider value={valeur}>{children}</MillesimeFiscalContext.Provider>;
}

/** Sans provider (tests, écrans isolés) : millésime par défaut, choix inopérant. */
export const useMillesimeFiscal = () => useContext(MillesimeFiscalContext);
