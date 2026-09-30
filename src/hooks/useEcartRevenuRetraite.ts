import { usePensionConsolidee } from '@/hooks/usePensionConsolidee';
import { useProfilFamilialRetraite } from '@/hooks/useProfilFamilialRetraite';
import { useFoyerFiscal } from '@/hooks/useFoyerFiscal';
import { useCharges, useRevenus } from '@/hooks/useBudget';
import { useAssets } from '@/hooks/useAssets';
import { NATURES_PER } from '@/constants/assetTypes';
import { getRepartitionFoyer, BienNonQualifieError } from '@/lib/patrimoine/succession';
import { sumAnnualActive } from '@/lib/budget/periodicite';
import { ageEnMois } from '@/lib/retraite/calcul';
import { lignesRevenuNet } from '@/lib/retraite/revenuNetFoyer';
import { ageReferenceDeces, sexeDepuisCivilite } from '@/lib/retraite/decisionDepart';

const NATURES_ASSURANCE_VIE = [
  "Contrat d'assurance-vie",
  'Contrat vie-génération',
  'PEP assurance vie',
  'Bons & contrats de capitalisation',
];

export interface DonneesEcartRevenu {
  dateDepart: Date;
  anneesAvantDepart: number;
  netMensuel: number;
  tmiRetraite: number;
  budgetCalculeMensuel: number;
  revenusActifsMensuels: number;
  encoursPER: number;
  encoursAssuranceVie: number;
  ageDepart: number;
  ageReference: number;
}

/**
 * Données du foyer pour l'écart de revenu à la retraite (phase 6b) : revenu
 * net des pensions, budget cible (charges du Budget actives au départ, crédits
 * terminés exclus), revenus d'actifs qui continuent, encours PER et
 * assurance-vie (part du foyer), âges. Partagé par la carte
 * `EcartRevenuRetraite.tsx` et l'export PDF de la Synthèse ; le calcul
 * lui-même est `analyserEcartRevenu()` (calculEpargneRetraite.ts).
 * `donnees` vaut `null` tant que le chargement n'est pas terminé ou sans
 * donnée retraite / date de naissance.
 */
export const useEcartRevenuRetraite = (
  hasConjoint: boolean,
  nomUtilisateur: string,
  nomConjoint: string
): { loading: boolean; donnees: DonneesEcartRevenu | null } => {
  const utilisateur = usePensionConsolidee('utilisateur');
  const conjoint = usePensionConsolidee('conjoint');
  const profil = useProfilFamilialRetraite('utilisateur');
  const { data: foyerFiscal, loading: loadingFoyer } = useFoyerFiscal();
  const { charges, loading: loadingCharges } = useCharges();
  const { revenus, loading: loadingRevenus } = useRevenus();
  const { assets, loading: loadingAssets } = useAssets();

  const loading =
    utilisateur.loading ||
    (hasConjoint && conjoint.loading) ||
    profil.loading ||
    loadingFoyer ||
    loadingCharges ||
    loadingRevenus ||
    loadingAssets;
  if (loading || !utilisateur.aDesDonnees || !profil.dateNaissanceDetail) return { loading, donnees: null };

  const avecConjoint = hasConjoint && conjoint.aDesDonnees;

  // Date de référence : les deux conjoints retraités (départ à l'âge légal le plus tardif).
  const datesDepart = [utilisateur.dateEffet, avecConjoint ? conjoint.dateEffet : null].filter(
    (d): d is Date => d !== null
  );
  const dateDepart = datesDepart.length > 0 ? new Date(Math.max(...datesDepart.map((d) => d.getTime()))) : new Date();

  const lignes = lignesRevenuNet(utilisateur, avecConjoint ? conjoint : null, foyerFiscal ?? null, nomUtilisateur, nomConjoint);

  const partFoyer = (asset: (typeof assets)[number]) => {
    try {
      const { user, spouse } = getRepartitionFoyer(asset);
      return user + spouse;
    } catch (error) {
      if (error instanceof BienNonQualifieError) return 0;
      throw error;
    }
  };
  const encours = (natures: string[]) =>
    assets.filter((a) => natures.includes(a.nature)).reduce((t, a) => t + (a.valeur_estimee || 0) * partFoyer(a), 0);

  return {
    loading: false,
    donnees: {
      dateDepart,
      anneesAvantDepart: Math.max(0, (dateDepart.getTime() - Date.now()) / (365.25 * 24 * 3600 * 1000)),
      netMensuel: lignes.reduce((total, l) => total + l.resultat.netMensuel, 0),
      tmiRetraite: Math.max(...lignes.map((l) => l.resultat.tmi)),
      budgetCalculeMensuel: sumAnnualActive(charges, dateDepart) / 12,
      revenusActifsMensuels:
        sumAnnualActive(
          revenus.filter((r) => r.source === 'immobilier'),
          dateDepart
        ) / 12,
      encoursPER: encours(NATURES_PER),
      encoursAssuranceVie: encours(NATURES_ASSURANCE_VIE),
      ageDepart: ageEnMois(profil.dateNaissanceDetail, dateDepart) / 12,
      ageReference: ageReferenceDeces(sexeDepuisCivilite(profil.civilite)),
    },
  };
};
