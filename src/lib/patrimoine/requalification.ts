/**
 * Requalification en lot des biens après un changement de contexte
 * matrimonial (aujourd'hui : périmètre de la société d'acquêts). La
 * qualification est persistée sur chaque actif (`assets.qualification_bien`)
 * et ne se recalculait qu'à la réouverture du formulaire : ce module rejoue
 * `qualifierBien()` sur tous les biens en qualification automatique et
 * renvoie les changements, que l'appelant confirme puis applique.
 * Les biens qualifiés manuellement (`qualification_auto === false`) ne sont
 * jamais touchés.
 */

import { qualifierBien, QualificationBien } from './qualification';
import { PerimetreSocieteAcquets } from './societeAcquets';
import { isDetenteurCommon } from './utils';
import type { Asset } from '@/services/assetService';

export interface ContexteMatrimonialLot {
  statut_couple?: string | null;
  regime_matrimonial?: string | null;
  date_mariage?: string | null;
  convention_pacs?: string | null;
  date_pacs?: string | null;
  separation_de_corps?: boolean | null;
  date_jugement_separation_corps?: string | null;
}

export interface Requalification {
  asset: Asset;
  avant: string | null | undefined;
  apres: QualificationBien;
  /** Champs à écrire : qualification, et détenteur/quote-part s'ils deviennent incohérents. */
  patch: Partial<Asset>;
}

/** Qualification recalculée d'un actif dans un contexte matrimonial donné. */
export const qualifierActif = (
  asset: Asset,
  marital: ContexteMatrimonialLot,
  societeAcquets: PerimetreSocieteAcquets
) =>
  qualifierBien({
    statutCouple: marital.statut_couple ?? undefined,
    regimeMatrimonial: marital.regime_matrimonial ?? undefined,
    dateMariage: marital.date_mariage ?? undefined,
    conventionPacs: marital.convention_pacs ?? undefined,
    datePacs: marital.date_pacs ?? undefined,
    dateJugementSeparationCorps: marital.separation_de_corps
      ? marital.date_jugement_separation_corps ?? undefined
      : undefined,
    dateAcquisition: asset.date_acquisition ?? undefined,
    origineActif: asset.origine_actif ?? undefined,
    modeDetention: asset.mode_detention ?? undefined,
    detenteur: asset.detenteur ?? undefined,
    clauseEntreeCommunaute: asset.clause_entree_communaute ?? undefined,
    clauseRemploi: asset.clause_remploi ?? undefined,
    natureActif: asset.nature,
    assetId: asset.id,
    societeAcquets,
    estPropreParNature: asset.est_propre_par_nature ?? undefined,
    valeurAcquisition: asset.valeur_acquisition ?? undefined,
    fraisAcquisition: asset.frais_acquisition ?? undefined,
    apportFondsPropres: asset.financement_mixte_apport_propre ?? undefined,
  });

export const calculerRequalifications = (
  assets: Asset[],
  marital: ContexteMatrimonialLot,
  societeAcquets: PerimetreSocieteAcquets
): Requalification[] =>
  assets
    .filter((a) => a.qualification_auto !== false && a.detenteur !== 'Indivision')
    .flatMap((asset) => {
      const { qualification } = qualifierActif(asset, marital, societeAcquets);
      if (qualification === asset.qualification_bien) return [];
      // Bien du couple devenu propre/personnel : on ne sait pas de quel époux,
      // on ne devine pas — laissé tel quel, à reprendre sur sa fiche.
      if ((qualification === 'Bien propre' || qualification === 'Bien personnel') && isDetenteurCommon(asset.detenteur ?? undefined)) {
        return [];
      }

      const patch: Partial<Asset> = { qualification_bien: qualification };
      // Mêmes corrections que le formulaire (useAssetForm.ts) : un bien commun
      // appartient au couple pour moitié de droit.
      if (qualification === 'Bien commun' && !isDetenteurCommon(asset.detenteur ?? undefined)) {
        Object.assign(patch, { detenteur: 'common', pourcentage_utilisateur: 50, pourcentage_conjoint: 50 });
      }
      return [{ asset, avant: asset.qualification_bien, apres: qualification, patch }];
    });


/**
 * Biens qui composent la société d'acquêts selon le périmètre (qualification
 * recalculée, ou qualification manuelle si l'actif est en mode manuel).
 */
export const compositionSocieteAcquets = (
  assets: Asset[],
  marital: ContexteMatrimonialLot,
  societeAcquets: PerimetreSocieteAcquets
) => {
  const biens = assets.flatMap((asset) => {
    if (asset.detenteur === 'Indivision') return [];
    const auto = asset.qualification_auto !== false;
    const { qualification, raison } = qualifierActif(asset, marital, societeAcquets);
    const retenue = auto ? qualification : asset.qualification_bien;
    return retenue === 'Bien commun'
      ? [{ asset, raison: auto ? raison : 'Qualifié manuellement en bien commun.' }]
      : [];
  });
  return { biens, total: biens.reduce((t, b) => t + (b.asset.valeur_estimee || 0), 0) };
};

/** Libellé court du périmètre, pour le résumé de l'onglet Général. */
export const libellePerimetre = (p: PerimetreSocieteAcquets, labels: Record<string, string>) => {
  if (p.tousAcquets) return 'Tous les acquêts';
  const parts = p.categories.map((c) => labels[c]);
  if (p.biensDesignes.length) parts.push(`${p.biensDesignes.length} bien(s) ajouté(s)`);
  return parts.length ? parts.join(', ') : 'Périmètre non défini';
};
