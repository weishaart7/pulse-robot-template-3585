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
  // Exonération de droits de succession pour frère/sœur (art. 796-0 ter
  // CGI) : déclaratif — reprend family_links.exoneration_succession tel
  // quel, aucune des 3 conditions légales (âge/infirmité, situation
  // matrimoniale, 5 ans de cohabitation) n'est vérifiée par l'app.
  exonerationSuccession?: boolean;
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

// Libellé exact de la clause "Dispense de rapport" dans DonationForm.tsx::
// clausesOptions — partagé ici pour que reserve.ts puisse reconnaître la
// clause sans dupliquer le texte (audit Bloc 1, T6, 2026-08). Seules 2 des
// 11 clauses de ce catalogue sont aujourd'hui branchées au calcul ; les
// autres restent purement déclaratives (cf. audit).
export const CLAUSE_DISPENSE_RAPPORT =
  "Dispense de rapport : la donation n'est pas rapportée à la succession";

// Libellé exact de la clause "Rapport forfaitaire" — même principe de
// partage que CLAUSE_DISPENSE_RAPPORT ci-dessus (audit Bloc 1, T6, 2026-08).
export const CLAUSE_RAPPORT_FORFAITAIRE =
  'Rapport forfaitaire : fixer contractuellement une valeur figée au rapport';

export interface Liberalite {
  id: string;
  type: "donation" | "legs";
  beneficiaireId: PersonId | "tiers";
  nature?: string;
  // Valeur unique, dont la sémantique dépend de typeImputation ci-dessous
  // (décision audit Bloc 1 T1, 2026-08 : relabel plutôt que refonte du
  // schéma, aucune donnée réelle en base au moment de la décision).
  // - typeImputation === 'partage' (donation-partage) : valeur au jour de
  //   l'ACTE (art. 1078), c'est la bonne valeur légale pour la réunion
  //   fictive comme pour l'exclusion du rapport — cf. reserve.ts.
  // - Toute autre donation ('avance_part' / 'hors_part' / non défini) :
  //   valeur au jour du DÉCÈS (art. 922, réunion fictive), utilisée telle
  //   quelle aussi pour l'imputation et la réduction. En pratique la valeur
  //   actuelle du bien, puisque cet outil simule un décès survenant
  //   aujourd'hui (referenceDate = date du jour, cf. index.ts).
  // Dans les deux cas, la valeur au jour du PARTAGE (art. 860, distincte du
  // décès) n'est jamais capturée séparément : le rapport et la réévaluation
  // de l'indemnité de réduction (art. 924-2) réutilisent cette même valeur.
  // Limite documentée, non corrigée en V1 — cf. audit Bloc 1, finding T3.
  valeur: number;
  date: string;
  // Non défini est traité comme 'avance_part' (présomption art. 843 C. civ.
  // pour un bénéficiaire réservataire) de façon cohérente par
  // réserve.ts::imputeLiberalites et réserve.ts::computeRapport (audit T4,
  // 2026-08). DonationForm.tsx impose désormais une valeur explicite à la
  // saisie ; ce cas ne subsiste que pour des lignes créées avant ce correctif.
  typeImputation?: "avance_part" | "hors_part" | "partage";
  donationEntreEpoux?: boolean;
  beneficiaireName?: string;
  // Clauses insérées dans l'acte (DonationForm.tsx::clausesOptions), reprises
  // telles quelles depuis liberalites.clauses. Seule CLAUSE_DISPENSE_RAPPORT
  // est aujourd'hui lue par reserve.ts (audit Bloc 1, T6) : une donation qui
  // la porte est réputée "hors part successorale" pour l'imputation ET le
  // rapport (§9.4 — la dispense reclasse la donation, elle ne fait pas que
  // supprimer le rapport d'une donation par ailleurs en avancement de part).
  // CLAUSE_RAPPORT_FORFAITAIRE est également lue par reserve.ts (couplée à
  // montantRapportForfaitaire ci-dessous). Les 9 autres clauses du catalogue
  // restent purement déclaratives.
  clauses?: string[];
  // Montant forfaitaire de rapport (art. 860 al. 4, §9.8), pertinent
  // uniquement si `clauses` porte CLAUSE_RAPPORT_FORFAITAIRE. Remplace la
  // valeur pleine dans le rapport ; l'écart avec `valeur` (si positif)
  // constitue un avantage hors part successorale imputé sur la QD
  // (reserve.ts::imputeLiberalites) — cf. exemple référentiel : donation
  // 100 000 €, rapport forfaitaire 100 000 €, valeur au partage 120 000 €
  // → 100 000 € sur la réserve, 20 000 € sur la QD, 100 000 € rapportés.
  montantRapportForfaitaire?: number;
  // Donation-partage transgénérationnelle (art. 1078-8, référentiel §8.6.2) :
  // id du parent (génération intermédiaire consentante) sur la réserve duquel
  // cette donation-partage au petit-enfant s'impute, au lieu de la QD comme le
  // ferait une donation ordinaire à un petit-enfant (art. 847). Pertinent
  // uniquement si typeImputation === 'partage' et que beneficiaireId désigne
  // un petit-enfant plutôt qu'un enfant du défunt — cf. reserve.ts::
  // imputeLiberalites et index.ts (liberalitesMaintenues, crédite ce parent).
  generationIntermediaireId?: PersonId;
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
  // Inventaire notarié du mobilier produit (art. 764 CGI) : si absent/false,
  // computeDMTG ajoute d'office un forfait mobilier de 5% de l'actif brut
  // successoral (présomption légale, cf. dmtg/assets.ts). Défaut false.
  inventaireNotarieProduit?: boolean;
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