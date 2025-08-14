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
  rapportable?: boolean;
  horsPart?: boolean;
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
  fraisNotaire?: {
    mode: "pourcentage" | "forfait";
    valeur: number;
  };
  imputationConjointAvantLegs?: boolean;
}

export interface HeirShare {
  personId: PersonId;
  nom: string;
  lien: string;
  partCivile: number;
  partFinale: number;
  baseFiscale: number;
  droitsSuccession: number;
  droits990I?: number;
}

export interface TransmissionResult {
  masseCalcul: number;
  reserve: number;
  quotiteDisponible: number;
  transmissionNette: number;
  heirs: HeirShare[];
  totalDroitsSuccession: number;
  total990I: number;
  fraisNotaire: number;
  details: {
    reductions: { liberaliteId: string; montantReduit: number }[];
    rapports: { personId: PersonId; montantRapport: number }[];
  };
}

export type ConjointOption = "quartPP" | "usufruitTotal" | "quartPP_plus_3quartsUS";