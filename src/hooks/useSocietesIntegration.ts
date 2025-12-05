import { useMemo } from 'react';
import { Societe } from '@/services/societeService';

interface IFICalculation {
  valeurBrute: number;
  valeurIFI: number;
  pourcentageDetention: number;
  type: 'patrimoine' | 'professionnel_exonere' | 'non_applicable';
  categorie: string;
}

interface TransmissionCalculation {
  valeurSuccessorale: number;
}

interface BudgetIntegration {
  dividendesEstimes: number;
  chargesEstimees: number;
}

// Determine if a company is a patrimonial SCI
const isPatrimoineSCI = (societe: Societe): boolean => {
  const type = societe.type_societe?.toLowerCase() || '';
  const forme = societe.forme_societe_civile?.toLowerCase() || '';
  const activite = societe.activite?.toLowerCase() || '';
  
  return (
    type.includes('societe-civile') ||
    forme.includes('sci') ||
    activite.includes('patrimoniale') ||
    activite.includes('gestion immobilière')
  );
};

// Determine if a company is an operational holding (animatrice)
const isHoldingAnimatrice = (societe: Societe): boolean => {
  return societe.holding === 'Animatrice';
};

// Determine if a company is a passive holding
const isHoldingPassive = (societe: Societe): boolean => {
  return societe.holding === 'Passive';
};

export const useSocietesIFI = (societes: Societe[]) => {
  return useMemo(() => {
    const calculations: (IFICalculation & { societe: Societe })[] = [];
    
    for (const societe of societes) {
      const valeurEstimee = societe.valeur_estimee || 0;
      const pourcentageIFI = societe.pourcentage_ifi || 0;
      const pourcentageUtilisateur = (societe as any).pourcentage_utilisateur || 100;
      const pourcentageConjoint = (societe as any).pourcentage_conjoint || 0;
      const pourcentageTotal = pourcentageUtilisateur + pourcentageConjoint;
      
      let type: IFICalculation['type'] = 'non_applicable';
      let categorie = '';
      let valeurIFI = 0;
      
      if (isPatrimoineSCI(societe)) {
        // SCI patrimoniale: IFI applies on the real estate portion
        type = 'patrimoine';
        categorie = 'Biens détenus indirectement';
        valeurIFI = (valeurEstimee * pourcentageIFI / 100) * (pourcentageTotal / 100);
      } else if (isHoldingAnimatrice(societe)) {
        // Holding animatrice: exempt from IFI as professional asset
        type = 'professionnel_exonere';
        categorie = 'Biens professionnels exonérés';
        valeurIFI = 0;
      } else if (isHoldingPassive(societe)) {
        // Holding passive: IFI on real estate portion
        type = 'patrimoine';
        categorie = 'Biens détenus indirectement';
        valeurIFI = (valeurEstimee * pourcentageIFI / 100) * (pourcentageTotal / 100);
      } else if (pourcentageIFI > 0) {
        // Other companies with IFI percentage
        type = 'patrimoine';
        categorie = 'Biens détenus indirectement';
        valeurIFI = (valeurEstimee * pourcentageIFI / 100) * (pourcentageTotal / 100);
      }
      
      calculations.push({
        societe,
        valeurBrute: valeurEstimee * (pourcentageTotal / 100),
        valeurIFI,
        pourcentageDetention: pourcentageTotal,
        type,
        categorie
      });
    }
    
    const totalValeurIFI = calculations.reduce((sum, c) => sum + c.valeurIFI, 0);
    const biensIndirects = calculations.filter(c => c.type === 'patrimoine');
    const biensProfessionnels = calculations.filter(c => c.type === 'professionnel_exonere');
    
    return {
      calculations,
      totalValeurIFI,
      biensIndirects,
      biensProfessionnels,
      nombreSocietesIFI: biensIndirects.length,
      nombreSocietesExonerees: biensProfessionnels.length
    };
  }, [societes]);
};

export const useSocietesTransmission = (societes: Societe[]) => {
  return useMemo(() => {
    const calculations: (TransmissionCalculation & { societe: Societe })[] = [];
    
    for (const societe of societes) {
      const valeurEstimee = societe.valeur_estimee || 0;
      const pourcentageUtilisateur = (societe as any).pourcentage_utilisateur || 100;
      const pourcentageConjoint = (societe as any).pourcentage_conjoint || 0;
      const pourcentageTotal = pourcentageUtilisateur + pourcentageConjoint;
      
      const valeurSuccessorale = valeurEstimee * (pourcentageTotal / 100);
      
      calculations.push({
        societe,
        valeurSuccessorale
      });
    }
    
    const totalValeurSuccessorale = calculations.reduce((sum, c) => sum + c.valeurSuccessorale, 0);
    
    return {
      calculations,
      totalValeurSuccessorale
    };
  }, [societes]);
};

export const useSocietesBudget = (societes: Societe[]) => {
  return useMemo(() => {
    const calculations: (BudgetIntegration & { societe: Societe })[] = [];
    
    for (const societe of societes) {
      // Estimate dividends based on company value (conservative 3% yield)
      const valeurEstimee = societe.valeur_estimee || 0;
      const pourcentageUtilisateur = (societe as any).pourcentage_utilisateur || 100;
      
      const dividendesEstimes = valeurEstimee * (pourcentageUtilisateur / 100) * 0.03;
      
      // Estimate annual charges (CFE, accountant, etc.)
      const chargesEstimees = societe.capital_social && societe.capital_social > 0 
        ? Math.max(2000, societe.capital_social * 0.01)
        : 2000;
      
      calculations.push({
        societe,
        dividendesEstimes,
        chargesEstimees
      });
    }
    
    const totalDividendesEstimes = calculations.reduce((sum, c) => sum + c.dividendesEstimes, 0);
    const totalChargesEstimees = calculations.reduce((sum, c) => sum + c.chargesEstimees, 0);
    
    return {
      calculations,
      totalDividendesEstimes,
      totalChargesEstimees,
      soldeNet: totalDividendesEstimes - totalChargesEstimees
    };
  }, [societes]);
};

// Helper functions for categorization
export const getSocieteCategory = (societe: Societe): string => {
  if (isPatrimoineSCI(societe)) return 'SCI Patrimoniale';
  if (isHoldingAnimatrice(societe)) return 'Holding Animatrice';
  if (isHoldingPassive(societe)) return 'Holding Passive';
  
  const activite = societe.activite?.toLowerCase() || '';
  if (activite.includes('libérale')) return 'Société Libérale';
  if (activite.includes('commerciale') || activite.includes('industrielle')) return 'Société Commerciale';
  if (activite.includes('agricole')) return 'Société Agricole';
  
  return 'Autre';
};

export const getSocieteTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'micro-entrepreneur': 'Micro-entrepreneur',
    'entreprise-individuelle': 'Entreprise individuelle',
    'earl-pluripersonnelle': 'EARL pluripersonnelle',
    'earl-unipersonnelle': 'EARL unipersonnelle',
    'eurl': 'EURL',
    'gaec': 'GAEC',
    'sa-conseil-administration': 'SA à conseil d\'administration',
    'sa-directoire': 'SA à directoire',
    'sarl': 'SARL',
    'sarl-familiale': 'SARL familiale',
    'sas': 'SAS',
    'scea-scev': 'SCEA/SCEV',
    'selarl': 'SELARL',
    'snc': 'SNC',
    'societe-civile': 'Société civile',
    'societe-civile-professionnelle': 'Société civile professionnelle'
  };
  return labels[type] || type;
};
