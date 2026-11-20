import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMillesimeFiscal } from '@/contexts/MillesimeFiscalContext';
import { ANNEE_REVENUS_CASES_2027 } from '@/lib/fiscalite/cases2027';
import { FormulaireCasesInformatives, ValeursCasesInformatives } from '@/lib/fiscalite/casesInformatives2027';
import { casesInformatives2042Service } from '@/services/casesInformatives2042Service';

/**
 * Cases du formulaire 2027 sans effet sur le calcul, pour un formulaire de la 2042 : affichées à partir des
 * revenus 2026 et enregistrées avec le cadre (`enregistrer` est appelé par le bouton du cadre).
 */
export const useCasesInformatives2042 = (formulaire: FormulaireCasesInformatives) => {
  const { isAuthenticated } = useAuth();
  const { anneeRevenus } = useMillesimeFiscal();
  const actif = anneeRevenus >= ANNEE_REVENUS_CASES_2027;
  const [valeurs, setValeurs] = useState<ValeursCasesInformatives>({});
  const [modifie, setModifie] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !actif) return;
    casesInformatives2042Service.get()
      .then((v) => { if (v) setValeurs(v); })
      .catch((error) => { if (import.meta.env.DEV) console.error('Error fetching cases informatives 2042:', error); });
  }, [isAuthenticated, actif]);

  const modifier = useCallback((cle: string, valeur: number | boolean | null) => {
    setValeurs((prev) => ({ ...prev, [cle]: valeur }));
    setModifie(true);
  }, []);

  /** Enregistre les cases de ce formulaire, seulement si elles ont été modifiées. */
  const enregistrer = useCallback(async () => {
    if (!isAuthenticated || !actif || !modifie) return;
    setValeurs(await casesInformatives2042Service.upsert(valeurs, formulaire));
    setModifie(false);
  }, [isAuthenticated, actif, modifie, valeurs, formulaire]);

  return { actif, formulaire, valeurs, modifier, enregistrer };
};

export type CasesInformatives2042 = ReturnType<typeof useCasesInformatives2042>;
