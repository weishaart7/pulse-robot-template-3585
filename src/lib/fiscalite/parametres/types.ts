import type { FoyerFiscalInput } from '../types';

/** Tranche du barème : `seuil` = borne supérieure cumulée (revenu par part). */
export interface TrancheBareme {
  readonly seuil: number;
  readonly taux: number;
}

/**
 * Paramètres revalorisés ou fixés chaque année par la loi de finances, pour une année de revenus.
 * Les taux légaux stables restent dans les modules de calcul.
 */
export interface ParametresFiscaux {
  /** Année des revenus imposés (2025 pour la déclaration déposée en 2026). */
  readonly anneeRevenus: number;
  readonly impot: {
    readonly bareme: readonly TrancheBareme[];
    readonly decote: {
      readonly taux: number;
      readonly seuilCelibataire: number;
      readonly montantCelibataire: number;
      readonly seuilCouple: number;
      readonly montantCouple: number;
    };
    /** Réduction outre-mer (art. 197 I 3° CGI) par lieu de résidence. */
    readonly reductionOutreMer: Readonly<Record<FoyerFiscalInput['lieuResidence'], { readonly taux: number; readonly plafond: number }>>;
  };
  /** Plafonnement du quotient familial (art. 197 I 2 CGI). */
  readonly quotientFamilial: {
    readonly plafondDemiPart: number;
    /** Réduction complémentaire par demi-part (invalidité, ancien combattant, veuve de guerre). */
    readonly plafondComplementaire: number;
    /** Plafond total des deux premières parts du premier enfant d'un parent isolé (case T). */
    readonly plafondParentIsole: number;
    /** Plafond de la demi-part d'ancien parent isolé (case L). */
    readonly plafondAncienParentIsole: number;
  };
  /** Contribution exceptionnelle sur les hauts revenus (art. 223 sexies CGI). */
  readonly cehr: {
    /** Seuil de la tranche à 3 % pour une personne seule, doublé pour un couple ; tranche à 4 % au double. */
    readonly seuilPersonneSeule: number;
    readonly tauxPremiereTranche: number;
    readonly tauxSecondeTranche: number;
  };
  readonly abattementsSpeciaux: {
    /** Personnes âgées ou invalides (art. 157 bis CGI). */
    readonly personnesAgees: {
      readonly seuilPlein: number;
      readonly seuilReduit: number;
      readonly montantPlein: number;
      readonly montantReduit: number;
    };
    /** Par personne rattachée au titre d'un enfant ayant fondé un foyer distinct (art. 196 B CGI). */
    readonly rattachement: number;
    /** Par petit-enfant en résidence alternée (BOI-IR-BASE-40 §240). */
    readonly rattachementAlterne: number;
  };
}
