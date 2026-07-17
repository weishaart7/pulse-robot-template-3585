import { DMTGResult } from '../dmtg/types';
import { NetBreakdownResult } from './netBreakdown';

export type PersonId = string;
export type Relationship = "child" | "parent" | "sibling" | "spouse" | "other";
export type MaritalStatus = "celibataire" | "marie" | "pacs" | "concubinage" | "divorce" | "veuf";

export interface Person {
  id: PersonId;
  nom: string;
  prenom: string;
  dateNaissance?: string;
  estDecede?: boolean;
  dateDeces?: string;
  handicap?: boolean;
  lienFamilial?: string;
  // Renonciation à une succession (art. 754 du Code civil) : n'a d'effet
  // que pour la succession désignée par renoncantDe (id du défunt concerné).
  renoncant?: boolean;
  renoncantDe?: PersonId;
  // Adoption (art. 786 CGI pour l'adoption simple) : valeur brute du
  // formulaire famille ('Non' | 'Adoption simple' | 'Adoption plénière').
  enfantAdopte?: string;
  // Déclaration du conseiller : abattement enfant plein malgré une
  // adoption simple (exception légale constatée manuellement).
  adoptionSimpleAbattementPlein?: boolean;
  // Branche paternelle/maternelle (utilisé par la fente successorale,
  // cf. successionLegale.ts::collectFenteHeritiers).
  brancheFamiliale?: string;
}

export interface FamilyGraph {
  persons: Person[];
  links: { from: PersonId; to: PersonId; relation: Relationship }[];
  marriages: { spouseA: PersonId; spouseB: PersonId; regime?: string; date?: string }[];
  decedentId: PersonId;
  hasSurvivingSpouse: boolean;
  survivingSpouseId?: PersonId;
  childrenOfDecedent: PersonId[];
  childrenCommonWithSpouse: PersonId[];
  hasDDV?: boolean;
}

export interface PatrimonySnapshot {
  date: string;
  biensExistants: number;
  passifs: number;
  assuranceVieTotal?: number;
}

export interface Liberalite {
  id: string;
  type: "donation" | "legs";
  beneficiaireId: PersonId | "tiers";
  nature?: string;
  valeur: number;
  date: string;
  // Non défini est traité différemment selon le consommateur : réserve.ts::imputeLiberalites
  // impute quand même sur la réserve (permissif, comme l'ancien défaut rapportable=true),
  // mais réserve.ts::computeRapport exclut du rapport (strict, n'accepte que 'avance_part').
  // Sans conséquence tant que Synthese.tsx/ProcessusCalcul.tsx renseignent toujours cette
  // valeur (Phase 4 du chantier libéralités) — à garder en tête si un appelant l'omet.
  typeImputation?: "avance_part" | "hors_part" | "partage";
  donationEntreEpoux?: boolean;
  beneficiaireName?: string;
}

export interface TransmissionParams {
  abattements: Record<string, number>;
  bareme: { lien: string; tranches: { seuil: number; taux: number }[] }[];
  prelevement990I?: {
    seuilParBenef: number;
    tranches: { seuil: number; taux: number }[];
    exonerations: string[];
  };
  // Débours (frais réels avancés par le notaire), distincts des émoluments
  // (barème légal fixe, cf. fiscal.ts::computeNotaryFees — non paramétrable).
  // Pas de valeur par défaut imposée : à renseigner par l'utilisateur selon
  // ses factures réelles (cf. fiscal.ts::computeDebours).
  debours?: {
    mode: "pourcentage" | "forfait";
    valeur: number;
  };
  imputationConjointAvantLegs?: boolean;
}

// Forme minimale d'une ligne "assets" telle que stockée en base (Supabase),
// suffisante pour construire les Asset[] attendus par computeDMTG. Ce type
// vit ici (pas dans dmtg/types.ts) car c'est transmission/index.ts qui fait
// l'adaptation données-brutes -> moteur fiscal.
export interface RawAssetInput {
  id: string;
  denomination?: string | null;
  valeur_estimee?: number | null;
  nature?: string | null;
  // Régime matrimonial / indivision (cf. lib/patrimoine/succession.ts::getPartSuccessorale) :
  // détermine la part de ce bien qui entre réellement dans la succession.
  qualification_bien?: string | null;
  detenteur?: string | null;
  pourcentage_utilisateur?: number | null;
  pourcentage_conjoint?: number | null;
}

export type TypeQuotePart = "pleine_propriete" | "usufruit" | "nue_propriete";

export interface HeirShare {
  personId: PersonId;
  nom: string;
  lien: string;
  partCivile: number;
  partFinale: number;
  typeQuotePart?: TypeQuotePart;
  representation?: boolean;
  // cf. HeritierLegal.representationRootId / representationCount
  // (successionLegale.ts) — propagés jusqu'ici pour le calcul DMTG.
  representationRootId?: PersonId;
  representationCount?: number;
}

export interface TransmissionResult {
  masseCalcul: number;
  reserve: number;
  quotiteDisponible: number;
  transmissionNette: number;
  heirs: HeirShare[];
  // Fiscalité (droits DMTG, base après abattement, net à recevoir par
  // héritier) : source unique de vérité, cf. dmtg/index.ts::computeDMTG et
  // transmission/netBreakdown.ts::computeNetPerHeir. Ne pas dupliquer ces
  // montants dans HeirShare — c'était la cause du bug d'incohérence entre
  // Synthese.tsx et ProcessusCalcul.tsx (deux calculs distincts du même
  // chiffre, qui ont fini par diverger).
  dmtg: DMTGResult;
  netBreakdown: NetBreakdownResult;
  fraisNotaire: number;
  // Graphe familial tel que fourni en entrée, réexposé ici pour que les
  // écrans d'affichage n'aient pas besoin de le conserver séparément.
  family: FamilyGraph;
  // Nombre de souches d'enfants retenues pour la réserve (cf.
  // successionLegale.ts::SuccessionLegaleResult.nbSouchesEnfants) — exposé
  // ici pour que les écrans d'explication du calcul (ProcessusCalcul.tsx)
  // n'aient pas à le recalculer eux-mêmes à partir du graphe familial.
  nbSouchesEnfants: number;
  details: {
    reductions: { liberaliteId: string; montantReduit: number }[];
    rapports: { personId: PersonId; montantRapport: number }[];
  };
  explicationsTexte?: string[];
  optionConjoint?: {
    quartPP: boolean;
    usufruitTotal: boolean;
    enfantsCommuns: boolean;
  };
}

export type ConjointOption = "quart_pp" | "usufruit_total" | "quart_pp_3quarts_us" | "qd_pp";