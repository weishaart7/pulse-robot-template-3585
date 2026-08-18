import { useEffect, useMemo, useState } from 'react';
import { RetraiteData } from '@/hooks/useRetraiteData';
import { useAutoSave, AutoSaveStatus } from '@/hooks/useAutoSave';
import { PeriodeCarriere } from '@/lib/retraite/parseRIS';
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
 * Calcule, expose et persiste l'hypothèse de revenu futur pour le toggle de
 * Carriere.tsx/Synthese.tsx.
 *
 * Contrairement à sa version précédente, ce hook ne charge plus lui-même
 * `retraite_data`/`retraite_carriere_detail` : ces données sont désormais
 * fournies par l'appelant (déjà chargées pour ses propres besoins), pour
 * éviter le doublon de requêtes identifié dans
 * docs/audit/audit-pension-consolidation.md (étape 3 de la fusion) — avant
 * cette session, Carriere.tsx et ce hook chargeaient chacun leur propre copie
 * de `retraite_data`/`retraite_carriere_detail` pour la MÊME personne, sur le
 * MÊME écran, avec le risque que les deux copies divergent après une
 * sauvegarde de l'une sans rechargement de l'autre.
 */
export const useHypotheseRevenuFutur = (
  data: Pick<RetraiteData, 'mode_hypothese_revenu_futur' | 'revenu_hypothese_manuel'>,
  detailCarriere: PeriodeCarriere[],
  loadingDonnees: boolean,
  saveRetraiteData: (
    updates: Partial<RetraiteData>,
    options?: { silent?: boolean }
  ) => Promise<boolean>
): UseHypotheseRevenuFuturResult => {
  const [mode, setMode] = useState<ModeHypotheseRevenuFutur>('derniere_annee_connue');
  const [valeurManuelle, setValeurManuelle] = useState('');
  const [initialise, setInitialise] = useState(false);

  const valeurCalculee = useMemo(() => {
    if (loadingDonnees) return null;
    const { parAnnee } = trimestresCotisesEtAssimilesDepuisCarriere(detailCarriere);
    return revenuAnnuelHypotheseDerniereAnneeConnue(parAnnee);
  }, [detailCarriere, loadingDonnees]);

  // Chargement initial depuis Supabase — avec bascule automatique vers le
  // mode manuel si le mode enregistré était 'derniere_annee_connue' mais
  // qu'aucune valeur n'est calculable (RIS vide ou inexploitable, cf. besoin
  // fonctionnel « cas limite »).
  useEffect(() => {
    if (loadingDonnees || initialise) return;
    const modeCharge = data.mode_hypothese_revenu_futur ?? 'derniere_annee_connue';
    const pasCalculable = modeCharge === 'derniere_annee_connue' && valeurCalculee === null;
    setMode(pasCalculable ? 'revenu_moyen_projete' : modeCharge);
    if (data.revenu_hypothese_manuel !== undefined && data.revenu_hypothese_manuel !== null) {
      setValeurManuelle(data.revenu_hypothese_manuel.toString());
    }
    setInitialise(true);
  }, [loadingDonnees, initialise, data, valeurCalculee]);

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

  return { loading: loadingDonnees, mode, setMode, valeurCalculee, valeurManuelle, setValeurManuelle, saveStatus, saveNow };
};
