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

export const calculerRequalifications = (
  assets: Asset[],
  marital: ContexteMatrimonialLot,
  societeAcquets: PerimetreSocieteAcquets
): Requalification[] =>
  assets
    .filter((a) => a.qualification_auto !== false && a.detenteur !== 'Indivision')
    .flatMap((asset) => {
      const { qualification } = qualifierBien({
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

