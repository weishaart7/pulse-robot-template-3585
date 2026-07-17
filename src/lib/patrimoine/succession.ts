/**
 * Part de la valeur d'un bien qui entre dans la succession du défunt — source
 * unique de vérité, consommée à la fois par le chemin civil
 * (transmissionHelpers.ts::buildPatrimonySnapshot) et par le chemin fiscal
 * (transmission/index.ts, construction des dmtgAssets), pour qu'ils restent
 * alignés sur la même assiette (cf. bug déjà corrigé une fois entre
 * Synthese.tsx et ProcessusCalcul.tsx sur netBreakdown).
 *
 * Repose sur `qualification_bien` (cf. qualification.ts::qualifierBien) plutôt
 * que sur une réévaluation locale du régime matrimonial : cette qualification
 * est déjà la source de vérité posée pour le module Patrimoine.
 */
import { isDetenteurSpouse, getPourcentagesRepartition } from './utils';

export interface SuccessionAssetInput {
  qualification_bien?: string | null;
  detenteur?: string | null;
  pourcentage_utilisateur?: number | null;
  pourcentage_conjoint?: number | null;
}

/**
 * Erreur dédiée du garde-fou 'À qualifier', pour que les écrans appelants
 * (Synthese.tsx, ProcessusCalcul.tsx) puissent la distinguer de façon fiable
 * des autres erreurs de calcul et afficher le message précis à l'utilisateur
 * au lieu d'un texte générique — plutôt que de faire un test fragile sur le
 * contenu du message.
 */
export class BienNonQualifieError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BienNonQualifieError';
  }
}

/**
 * Fraction (0 à 1) de la valeur du bien entrant dans la succession :
 * - 'À qualifier' (choix manuel explicite de l'utilisateur, cf. AssetForm.tsx)
 *   ou qualification absente/NULL (bien jamais qualifié — ex. créé via le
 *   chemin "transfert société → actifs" de SocieteFormPage.tsx/
 *   SocieteFormDialog.tsx, qui ne renseigne pas ce champ, ou bien antérieur à
 *   son introduction) : bloque dans les deux cas — ne jamais deviner un
 *   traitement par défaut (cf. CLAUDE.md, décisions d'architecture module IFI).
 *   Message distinct selon le cas, mais même classe `BienNonQualifieError`.
 * - 'Indivision' : part réellement détenue par le défunt (pourcentage_utilisateur).
 * - 'Bien commun' : 50% (demi-boni de communauté, de droit — pas configurable).
 * - 'Bien propre' / 'Bien personnel' : 100% si détenu par le défunt, 0% si par
 *   le conjoint (déterminé par `detenteur`, que `qualification_bien` seul ne dit pas).
 */
export function getPartSuccessorale(asset: SuccessionAssetInput, label?: string): number {
  const qualification = asset.qualification_bien;

  if (qualification === 'À qualifier') {
    throw new BienNonQualifieError(
      `Bien non qualifié${label ? ` : ${label}` : ''} — à trancher avant de calculer la transmission.`
    );
  }

  if (!qualification) {
    throw new BienNonQualifieError(
      `Bien non qualifié${label ? ` : ${label}` : ''} — la qualification (bien propre/commun/indivision) n'a jamais été renseignée, à trancher avant de calculer la transmission.`
    );
  }

  if (qualification === 'Indivision') {
    const { userQuote } = getPourcentagesRepartition(
      asset.pourcentage_utilisateur ?? undefined,
      asset.pourcentage_conjoint ?? undefined
    );
    return userQuote;
  }

  if (qualification === 'Bien commun') {
    return 0.5;
  }

  // 'Bien propre' ou 'Bien personnel' : qualification_bien ne dit pas à qui le
  // bien appartient en propre, seul `detenteur` le sait.
  return isDetenteurSpouse(asset.detenteur ?? undefined) ? 0 : 1;
}
