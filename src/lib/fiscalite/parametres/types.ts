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
  /** Abattements de 10 % (art. 83 3° et 158-5-a CGI) : plancher et plafond revalorisés. */
  readonly abattementsDixPourCent: {
    /** Par déclarant ou personne à charge. */
    readonly salaires: { readonly plancher: number; readonly plafond: number };
    /** Plancher par pensionné, plafond commun au foyer. */
    readonly pensions: { readonly plancher: number; readonly plafondFoyer: number };
  };
  /** Cadre 5 : seuils revalorisés des régimes micro, du déficit agricole et des cotisations des meublés. */
  readonly nonSalaries: {
    readonly seuilMicroVentes: number;
    readonly seuilMicroServices: number;
    /** Locations meublées non professionnelles, appréciées au niveau du foyer (loi Le Meur). */
    readonly seuilMicroMeubles: number;
    readonly seuilMicroMeublesNonClasses: number;
    readonly seuilMicroBA: number;
    /** Déficit agricole imputable seulement sous ce montant de revenus d'autres sources (art. 156 I 1° CGI). */
    readonly seuilDeficitAgricole: number;
    /** Chambres d'hôtes soumises aux cotisations sociales au-delà de ce revenu imposable (CSS art. L. 611-1). */
    readonly seuilCotisationsChambresHotes: number;
  };
  /** Cadre 6 : plafonds revalorisés des charges déductibles (art. 156 II 2° et 2° ter CGI). */
  readonly chargesDeductibles: {
    /** Par enfant majeur, doublé si le parent entretient seul un enfant marié/pacsé ou chargé de famille. */
    readonly plafondPensionEnfantMajeur: number;
    /** Par personne de plus de 75 ans accueillie. */
    readonly plafondAccueilPersonneAgee: number;
  };
  /** Cadre 7 : plafonds fixés ou revalorisés pour l'année. */
  readonly reductionsCredits: {
    /** Dons à 75 % (art. 200 1 ter CGI) : plafond des dons 7UD/7VA, puis plafond annuel avec 7UQ/7VM. */
    readonly plafondDons75Premiere: number;
    readonly plafondDons75Annee: number;
    /** Seuils de RFR du crédit autonomie 7WI : 1, 2 personnes, puis par personne en plus. */
    readonly seuilsRfrAutonomie: { readonly une: number; readonly deux: number; readonly parPersonne: number };
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
