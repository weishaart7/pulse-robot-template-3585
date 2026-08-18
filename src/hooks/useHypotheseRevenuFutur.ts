import { useEffect, useMemo, useState } from 'react';
import { Personne, useRetraiteData } from '@/hooks/useRetraiteData';
import { useCarriereDetail } from '@/hooks/useCarriereDetail';
import { useAutoSave, AutoSaveStatus } from '@/hooks/useAutoSave';
import { trimestresCotisesEtAssimilesDepuisCarriere } from '@/lib/retraite/calculTrimestres';
import {
  ModeHypotheseRevenuFutur,
  revenuAnnuelHypotheseDerniereAnneeConnue,
} from '@/lib/retraite/hypotheseRevenuFutur';

export interface UseHypotheseRevenuFuturResult {
  loading: boolean;
  mode: ModeHypotheseRevenuFutur;
  setMode: (mode: ModeHypotheseRevenuFutur) => void;
  // Valeur dérivée automatiquement de la dernière année connue du RIS — null
  // si aucune année n'a de trimestre validé (RIS vide ou inexploitable).
  valeurCalculee: number | null;
  valeurManuelle: string;
  setValeurManuelle: (valeur: string) => void;
  saveStatus: AutoSaveStatus;
  // Force un flush immédiat du débounce — à appeler sur les interactions qui
  // peuvent être immédiatement suivies d'une navigation (changement de mode,
  // onBlur du champ manuel), sans quoi une sauvegarde en attente est annulée
  // (pas flushée) si le composant se démonte avant les 1500ms de débounce par
  // défaut de useAutoSave — cf. audit du 2026-08-18.
  saveNow: () => void;
}

/**
 * Charge, calcule et persiste l'hypothèse de revenu futur pour le toggle de
 * Synthese.tsx — même composition de hooks que usePensionConsolidee.ts
 * (useRetraiteData + useCarriereDetail), et même mécanisme d'auto-save que
 * Carriere.tsx (useAutoSave), pour rester cohérent avec les conventions du
 * module.
 */
export const useHypotheseRevenuFutur = (personne: Personne = 'utilisateur'): UseHypotheseRevenuFuturResult => {
  const { data, loading: loadingData, saveRetraiteData } = useRetraiteData(personne);
  const { periodes: detailCarriere, loading: loadingCarriere } = useCarriereDetail(personne);

  const [mode, setMode] = useState<ModeHypotheseRevenuFutur>('derniere_annee_connue');
  const [valeurManuelle, setValeurManuelle] = useState('');
  const [initialise, setInitialise] = useState(false);

  const loading = loadingData || loadingCarriere;

  const valeurCalculee = useMemo(() => {
    if (loadingCarriere) return null;
    const { parAnnee } = trimestresCotisesEtAssimilesDepuisCarriere(detailCarriere);
    return revenuAnnuelHypotheseDerniereAnneeConnue(parAnnee);
  }, [detailCarriere, loadingCarriere]);

  // Chargement initial depuis Supabase — avec bascule automatique vers le
  // mode manuel si le mode enregistré était 'derniere_annee_connue' mais
  // qu'aucune valeur n'est calculable (RIS vide ou inexploitable, cf. besoin
  // fonctionnel « cas limite »).
  useEffect(() => {
    if (loading || initialise) return;
    const modeCharge = data.mode_hypothese_revenu_futur ?? 'derniere_annee_connue';
    const pasCalculable = modeCharge === 'derniere_annee_connue' && valeurCalculee === null;
    setMode(pasCalculable ? 'revenu_moyen_projete' : modeCharge);
    if (data.revenu_hypothese_manuel !== undefined && data.revenu_hypothese_manuel !== null) {
      setValeurManuelle(data.revenu_hypothese_manuel.toString());
    }
    setInitialise(true);
  }, [loading, initialise, data, valeurCalculee]);

  // Même bascule, mais après le chargement initial : si le détail de
  // carrière change en cours de session (suppression de la seule période
  // avec trimestre validé, par exemple) et rend le mode auto non calculable.
  useEffect(() => {
    if (initialise && mode === 'derniere_annee_connue' && valeurCalculee === null) {
      setMode('revenu_moyen_projete');
    }
  }, [initialise, mode, valeurCalculee]);

  const { status: saveStatus, saveNow } = useAutoSave(
    async () =>
      saveRetraiteData(
        {
          mode_hypothese_revenu_futur: mode,
          revenu_hypothese_manuel: parseFloat(valeurManuelle) || 0,
        },
        { silent: true }
      ),
    [mode, valeurManuelle]
  );

  return { loading, mode, setMode, valeurCalculee, valeurManuelle, setValeurManuelle, saveStatus, saveNow };
};
