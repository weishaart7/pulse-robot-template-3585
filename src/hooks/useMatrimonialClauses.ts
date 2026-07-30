import { useState, useEffect, useCallback, useRef } from 'react';
import { useMaritalStatus } from '@/hooks/useFamilyData';
import { useToast } from '@/hooks/use-toast';
import { ClausesData, ClauseState, DonationDernierVivant, RegimeType, MatrimonialAnalysisResult, getSimplifiedRegime } from '@/types/matrimonial';
import { CLAUSES_BY_REGIME, CLAUSES_IMPACTING_TRANSMISSION, isClauseCompatibleWithRegime } from '@/constants/matrimonialClauses';
import { useAssets } from '@/hooks/useAssets';
import { parseClausesData } from '@/utils/transmissionHelpers';
import { resolvePreciputMode } from '@/lib/patrimoine/avantagesMatrimoniaux';
import { computeValeurExclueClause, ModaliteClause } from '@/lib/patrimoine/analyseClausesTransmission';
import { getAgeAtDate, getDemembrementPct } from '@/lib/transmission';

interface UseMatrimonialClausesReturn {
  clauses: ClausesData;
  donation: DonationDernierVivant;
  isLoading: boolean;
  isSaving: boolean;
  toggleClause: (clauseName: string) => void;
  updateClauseAssets: (clauseName: string, assetIds: string[]) => void;
  updateClausePercentage: (clauseName: string, partPP: number) => void;
  updateClauseOptions: (clauseName: string, options: any) => void;
  updateDonation: (updates: Partial<DonationDernierVivant>) => void;
  getClausesForRegime: (regimeType: RegimeType) => typeof CLAUSES_BY_REGIME[RegimeType];
  analyzeForTransmission: () => MatrimonialAnalysisResult;
}

export function useMatrimonialClauses(regimeType: RegimeType): UseMatrimonialClausesReturn {
  const { toast } = useToast();
  const { data: maritalData, saveData, setDonationDernierVivant, loading: isLoadingMarital } = useMaritalStatus();
  const { assets } = useAssets();
  
  const [clauses, setClauses] = useState<ClausesData>({});
  const [donation, setDonation] = useState<DonationDernierVivant>({
    enFaveurUtilisateur: false,
    enFaveurConjoint: false
  });
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Nettoyage du debounce au démontage (même pattern que LMNPDetailView.tsx:191-209).
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Charger les données existantes
  useEffect(() => {
    if (maritalData) {
      const dataAny = maritalData as any;
      
      if (dataAny.clauses_contrat) {
        setClauses(parseClausesData(dataAny.clauses_contrat));
      }
      
      // Charger les donations au dernier vivant depuis les champs existants
      setDonation({
        enFaveurUtilisateur: dataAny.donation_dernier_vivant_personne || false,
        enFaveurConjoint: dataAny.donation_dernier_vivant_conjoint || false,
        dateUtilisateur: dataAny.date_donation_personne || undefined,
        dateConjoint: dataAny.date_donation_conjoint || undefined
      });
    }
  }, [maritalData]);

  // Sauvegarde effective (appelée après le debounce, cf. saveClausesData
  // ci-dessous). `donationChange: null` signifie que cet appel ne touche pas
  // à la donation (cas de tous les mutateurs de clauses) : setDonationDernierVivant
  // relit alors l'état frais en base plutôt que de réembarquer la copie
  // locale de `donation`, potentiellement périmée si l'onglet Donation de
  // RelationInfoForm.tsx a été modifié entre-temps — seul updateDonation
  // passe une vraie nouvelle valeur.
  const performSave = useCallback(async (newClauses: ClausesData, donationChange: DonationDernierVivant | null) => {
    setIsSaving(true);
    try {
      await setDonationDernierVivant(
        donationChange
          ? {
              donation_dernier_vivant_personne: donationChange.enFaveurUtilisateur,
              donation_dernier_vivant_conjoint: donationChange.enFaveurConjoint,
              date_donation_personne: donationChange.dateUtilisateur,
              date_donation_conjoint: donationChange.dateConjoint,
            }
          : null,
        { clauses_contrat: newClauses }
      );
      toast({
        title: "Sauvegardé",
        description: "Les clauses ont été mises à jour."
      });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la sauvegarde.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  }, [setDonationDernierVivant, toast]);

  // Sauvegarder les données, avec un debounce de 800ms (même pattern que
  // LMNPDetailView.tsx:191-209 : useRef + setTimeout/clearTimeout, pas de lib
  // externe). Uniforme pour tous les appelants (toggleClause, updateClauseAssets,
  // updateClausePercentage, updateClauseOptions, updateDonation) puisqu'ils
  // passent tous par cette même fonction.
  const saveClausesData = useCallback((newClauses: ClausesData, donationChange: DonationDernierVivant | null) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      performSave(newClauses, donationChange);
    }, 800);
  }, [performSave]);

  const toggleClause = useCallback((clauseName: string) => {
    const wasEnabled = clauses[clauseName]?.enabled || false;
    // Décocher une clause efface tout son état associé (biens sélectionnés, %, options) :
    // sinon ces données restent enregistrées en arrière-plan bien que la clause soit désactivée.
    // partPleineProprietee n'a de sens que pour partage_inegal (seule clause qui le lit,
    // via updateClausePercentage/PartConjointInput) : l'écrire par défaut sur toute autre
    // clause activée ne faisait que persister une donnée jamais affichée ni lue.
    const newClauseState: ClauseState = wasEnabled
      ? { enabled: false }
      : clauseName === 'partage_inegal'
        ? { enabled: true, partPleineProprietee: 50 }
        : { enabled: true };
    const newClauses: ClausesData = {
      ...clauses,
      [clauseName]: newClauseState
    };
    setClauses(newClauses);
    saveClausesData(newClauses, null);
  }, [clauses, saveClausesData]);

  const updateClauseAssets = useCallback((clauseName: string, assetIds: string[]) => {
    const newClauses: ClausesData = {
      ...clauses,
      [clauseName]: {
        ...clauses[clauseName],
        selectedAssets: assetIds
      }
    };
    setClauses(newClauses);
    saveClausesData(newClauses, null);
  }, [clauses, saveClausesData]);

  // Dédié à partage_inegal (top-level), seule clause qui définit hasPercentages
  // dans CLAUSES_BY_REGIME : partPleineProprietee est le seul champ lu par le
  // moteur pour cette clause (partUsufruit a été retiré, jamais lu ni affiché).
  const updateClausePercentage = useCallback((clauseName: string, partPP: number) => {
    const newClauses: ClausesData = {
      ...clauses,
      [clauseName]: {
        ...clauses[clauseName],
        partPleineProprietee: partPP
      }
    };
    setClauses(newClauses);
    saveClausesData(newClauses, null);
  }, [clauses, saveClausesData]);

  const updateClauseOptions = useCallback((clauseName: string, options: any) => {
    const newClauses: ClausesData = {
      ...clauses,
      [clauseName]: {
        ...clauses[clauseName],
        options: {
          ...clauses[clauseName]?.options,
          ...options
        }
      }
    };
    setClauses(newClauses);
    saveClausesData(newClauses, null);
  }, [clauses, saveClausesData]);

  const updateDonation = useCallback((updates: Partial<DonationDernierVivant>) => {
    const newDonation = { ...donation, ...updates };
    setDonation(newDonation);
    saveClausesData(clauses, newDonation);
  }, [clauses, donation, saveClausesData]);

  // Filtre par la matrice de compatibilité référentielle (§8.11), en plus de
  // ce qui est déjà exposé par régime : une garde-fou en cas de future entrée
  // mal placée dans CLAUSES_BY_REGIME, jamais une source d'ajout de clauses.
  const getClausesForRegime = useCallback((regime: RegimeType) => {
    return (CLAUSES_BY_REGIME[regime] || []).filter((clause) => isClauseCompatibleWithRegime(clause.key, regime));
  }, []);

  // Analyser les clauses pour le calcul de transmission
  const analyzeForTransmission = useCallback((): MatrimonialAnalysisResult => {
    const avantagesMatrimoniaux: MatrimonialAnalysisResult['avantagesMatrimoniaux'] = [];
    const notes: string[] = [];
    let totalExcluSuccession = 0;

    // % de nue-propriété du conjoint survivant au barème art. 669 CGI, seule
    // variable de la pondération des clauses en modalité usufruit. Même
    // mécanisme que computeTransmission (getAgeAtDate + getDemembrementPct sur
    // DEFAULT_DMTG_PARAMS.demembrementViager), pour que l'écran de saisie
    // affiche le même montant que le calcul de transmission.
    // `null` si la date de naissance du conjoint est absente ou invalide : les
    // clauses en usufruit affichent alors 0 (aucun âge deviné, cf. le refus
    // symétrique de getConjointAge de retomber sur une valeur par défaut).
    const dateNaissanceConjoint = (maritalData as any)?.date_naissance_conjoint as string | undefined;
    let npSurvivant: number | null = null;
    if (dateNaissanceConjoint) {
      try {
        npSurvivant = getDemembrementPct(
          getAgeAtDate(dateNaissanceConjoint, new Date().toISOString()),
          'nue_propriete'
        );
      } catch {
        npSurvivant = null;
      }
    }

    // Parcourir les clauses actives qui impactent la transmission
    for (const clauseKey of CLAUSES_IMPACTING_TRANSMISSION) {
      const clauseState = clauses[clauseKey];
      if (!clauseState?.enabled) continue;

      // Déterminer le type d'avantage
      let typeAvantage: 'attribution_integrale' | 'preciput' | 'parts_inegales' | 'autre' = 'autre';
      // Valeur des biens désignés effectivement exclue de la succession :
      // pondérée par la modalité de la clause (pleine propriété = totalité,
      // usufruit = usufruit seul, la nue-propriété restant successorale), même
      // pondération que getFractionAjustee (lib/patrimoine/avantagesMatrimoniaux.ts).
      let valeurClause = 0;

      if (clauseKey.includes('attribution_integrale')) {
        typeAvantage = 'attribution_integrale';
        // Modalité par défaut 'pleine_propriete' si la clause est active sans
        // porteSur renseigné, comme dans computeTransmission.
        const mode = (clauseState.options?.porteSur || 'pleine_propriete') as ModaliteClause;
        valeurClause = computeValeurExclueClause(assets, clauseState.selectedAssets, mode, npSurvivant);
        notes.push(`Attribution intégrale activée - Valeur exclue de la succession: ${valeurClause.toLocaleString()}€`);
        totalExcluSuccession += valeurClause;
      } else if (clauseKey.includes('preciput')) {
        typeAvantage = 'preciput';
        valeurClause = computeValeurExclueClause(
          assets,
          clauseState.selectedAssets,
          resolvePreciputMode(clauseState.options),
          npSurvivant
        );
        notes.push(`Préciput activé - Valeur exclue de la succession: ${valeurClause.toLocaleString()}€`);
        totalExcluSuccession += valeurClause;
      } else if (clauseKey.includes('partage_inegal')) {
        typeAvantage = 'parts_inegales';
        const partPP = clauseState.partPleineProprietee || 50;
        notes.push(`Partage inégal: ${partPP}% en pleine propriété au conjoint`);
      }

      avantagesMatrimoniaux.push({
        clauseKey: clauseKey as any,
        type: typeAvantage,
        valeur: valeurClause,
        assetIds: clauseState.selectedAssets,
        partPleineProprietee: clauseState.partPleineProprietee
      });
    }

    return {
      regimeSimplified: getSimplifiedRegime(regimeType),
      avantagesMatrimoniaux,
      totalExcluSuccession,
      notes
    };
  }, [clauses, assets, regimeType, maritalData]);

  return {
    clauses,
    donation,
    isLoading: isLoadingMarital,
    isSaving,
    toggleClause,
    updateClauseAssets,
    updateClausePercentage,
    updateClauseOptions,
    updateDonation,
    getClausesForRegime,
    analyzeForTransmission
  };
}
