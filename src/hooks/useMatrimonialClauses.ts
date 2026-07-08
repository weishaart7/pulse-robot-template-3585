import { useState, useEffect, useCallback } from 'react';
import { useMaritalStatus } from '@/hooks/useFamilyData';
import { useToast } from '@/hooks/use-toast';
import { ClausesData, ClauseState, DonationDernierVivant, RegimeType, MatrimonialAnalysisResult, getSimplifiedRegime } from '@/types/matrimonial';
import { CLAUSES_BY_REGIME, CLAUSES_IMPACTING_TRANSMISSION } from '@/constants/matrimonialClauses';
import { useAssets } from '@/hooks/useAssets';

interface UseMatrimonialClausesReturn {
  clauses: ClausesData;
  donation: DonationDernierVivant;
  isLoading: boolean;
  isSaving: boolean;
  toggleClause: (clauseName: string) => void;
  updateClauseAssets: (clauseName: string, assetIds: string[]) => void;
  updateClausePercentages: (clauseName: string, partPP: number, partUsufruit: number) => void;
  updateClauseOptions: (clauseName: string, options: any) => void;
  updateDonation: (updates: Partial<DonationDernierVivant>) => void;
  getClausesForRegime: (regimeType: RegimeType) => typeof CLAUSES_BY_REGIME[RegimeType];
  analyzeForTransmission: () => MatrimonialAnalysisResult;
}

export function useMatrimonialClauses(regimeType: RegimeType): UseMatrimonialClausesReturn {
  const { toast } = useToast();
  const { data: maritalData, saveData, loading: isLoadingMarital } = useMaritalStatus();
  const { assets } = useAssets();
  
  const [clauses, setClauses] = useState<ClausesData>({});
  const [donation, setDonation] = useState<DonationDernierVivant>({
    enFaveurUtilisateur: false,
    enFaveurConjoint: false
  });
  const [isSaving, setIsSaving] = useState(false);

  // Charger les données existantes
  useEffect(() => {
    if (maritalData) {
      const dataAny = maritalData as any;
      
      if (dataAny.clauses_contrat) {
        try {
          const parsedClauses = typeof dataAny.clauses_contrat === 'string' 
            ? JSON.parse(dataAny.clauses_contrat) 
            : dataAny.clauses_contrat;
          setClauses(parsedClauses);
        } catch (error) {
          console.error('Erreur de parsing clauses:', error);
        }
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

  // Sauvegarder les données
  const saveClausesData = useCallback(async (newClauses: ClausesData, newDonation: DonationDernierVivant) => {
    setIsSaving(true);
    try {
      const dataToSave = {
        clauses_contrat: newClauses,
        donation_dernier_vivant_personne: newDonation.enFaveurUtilisateur,
        donation_dernier_vivant_conjoint: newDonation.enFaveurConjoint,
        date_donation_personne: newDonation.dateUtilisateur,
        date_donation_conjoint: newDonation.dateConjoint
      };
      await saveData(dataToSave as any);
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
  }, [saveData, toast]);

  const toggleClause = useCallback((clauseName: string) => {
    const wasEnabled = clauses[clauseName]?.enabled || false;
    // Décocher une clause efface tout son état associé (biens sélectionnés, %, options) :
    // sinon ces données restent enregistrées en arrière-plan bien que la clause soit désactivée.
    const newClauseState: ClauseState = wasEnabled
      ? { enabled: false }
      : { enabled: true, partPleineProprietee: 50, partUsufruit: 50 };
    const newClauses: ClausesData = {
      ...clauses,
      [clauseName]: newClauseState
    };
    setClauses(newClauses);
    saveClausesData(newClauses, donation);
  }, [clauses, donation, saveClausesData]);

  const updateClauseAssets = useCallback((clauseName: string, assetIds: string[]) => {
    const newClauses: ClausesData = {
      ...clauses,
      [clauseName]: {
        ...clauses[clauseName],
        selectedAssets: assetIds
      }
    };
    setClauses(newClauses);
    saveClausesData(newClauses, donation);
  }, [clauses, donation, saveClausesData]);

  const updateClausePercentages = useCallback((clauseName: string, partPP: number, partUsufruit: number) => {
    const newClauses: ClausesData = {
      ...clauses,
      [clauseName]: {
        ...clauses[clauseName],
        partPleineProprietee: partPP,
        partUsufruit: partUsufruit
      }
    };
    setClauses(newClauses);
    saveClausesData(newClauses, donation);
  }, [clauses, donation, saveClausesData]);

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
    saveClausesData(newClauses, donation);
  }, [clauses, donation, saveClausesData]);

  const updateDonation = useCallback((updates: Partial<DonationDernierVivant>) => {
    const newDonation = { ...donation, ...updates };
    setDonation(newDonation);
    saveClausesData(clauses, newDonation);
  }, [clauses, donation, saveClausesData]);

  const getClausesForRegime = useCallback((regime: RegimeType) => {
    return CLAUSES_BY_REGIME[regime] || [];
  }, []);

  // Analyser les clauses pour le calcul de transmission
  const analyzeForTransmission = useCallback((): MatrimonialAnalysisResult => {
    const avantagesMatrimoniaux: MatrimonialAnalysisResult['avantagesMatrimoniaux'] = [];
    const notes: string[] = [];
    let totalExcluSuccession = 0;

    // Parcourir les clauses actives qui impactent la transmission
    for (const clauseKey of CLAUSES_IMPACTING_TRANSMISSION) {
      const clauseState = clauses[clauseKey];
      if (!clauseState?.enabled) continue;

      // Calculer la valeur des biens concernés
      let valeurClause = 0;
      if (clauseState.selectedAssets?.length && assets) {
        valeurClause = assets
          .filter(a => clauseState.selectedAssets?.includes(a.id))
          .reduce((sum, a) => sum + (a.valeur_estimee || 0), 0);
      }

      // Déterminer le type d'avantage
      let typeAvantage: 'attribution_integrale' | 'preciput' | 'parts_inegales' | 'autre' = 'autre';
      
      if (clauseKey.includes('attribution_integrale')) {
        typeAvantage = 'attribution_integrale';
        notes.push(`Attribution intégrale activée - Valeur exclue de la succession: ${valeurClause.toLocaleString()}€`);
        totalExcluSuccession += valeurClause;
      } else if (clauseKey.includes('preciput')) {
        typeAvantage = 'preciput';
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
        partPleineProprietee: clauseState.partPleineProprietee,
        partUsufruit: clauseState.partUsufruit
      });
    }

    return {
      regimeSimplified: getSimplifiedRegime(regimeType),
      avantagesMatrimoniaux,
      totalExcluSuccession,
      notes
    };
  }, [clauses, assets, regimeType]);

  return {
    clauses,
    donation,
    isLoading: isLoadingMarital,
    isSaving,
    toggleClause,
    updateClauseAssets,
    updateClausePercentages,
    updateClauseOptions,
    updateDonation,
    getClausesForRegime,
    analyzeForTransmission
  };
}
