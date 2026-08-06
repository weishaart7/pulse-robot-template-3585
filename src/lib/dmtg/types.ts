export type Money = number;
export type Lien = 'conjoint'|'pacs'|'enfant'|'ascendant'|'frere_soeur'|'neveu_niece'|'collateral_4'|'autre';

export interface Beneficiary {
  id: string;
  lien: Lien;
  isHandicapped?: boolean;
  // Représentation : renseigner la souche si venant en représentation (id du représenté)
  representedOf?: string | null; // id de l'enfant prédécédé/renonçant/indigne
  representationGroup?: string | null; // identifiant de souche
  comesFromRepresentationWithPlurality?: boolean; // pour neveux/nièces
  // Nombre de représentants se partageant l'abattement de la personne
  // représentée (même souche). Défaut 1 si non renseigné.
  numberOfRepresentants?: number;
  // Adoption simple (art. 786 CGI) : abattement réduit à 1 594€ sauf
  // exception déclarée par le conseiller (adoptionSimpleAbattementPlein).
  isAdoptionSimple?: boolean;
  adoptionSimpleAbattementPlein?: boolean;
  // Exonération totale pour frère/sœur (art. 796-0 ter CGI) : déclaratif,
  // reprend family_links.exoneration_succession sans vérifier les 3
  // conditions légales — cf. recall.ts (abattement infini) et tax.ts
  // (retour anticipé taxe: 0), même mécanique que conjoint/pacs.
  exonerationSuccession?: boolean;
}

export interface Asset {
  id: string;
  label: string;
  valeurVenale: Money;
  nature: 'immobilier'|'mobilier'|'valeur_mobiliere'|'entreprise'|'autre';
  location?: 'corse'|'metropole'|'autre';
  isResidencePrincipale?: boolean;
  isMonumentHistoriqueOuvert?: boolean;
  isBoisForetOuGF?: boolean; // applique -75%
  demembrement?: {
    type: 'viager'|'temporaire'|null;
    usufruitierAge?: number; // si viager
    dureeAns?: number; // si temporaire
    usufruitierId?: string;
    nueProprietaires: Array<{ id: string; quotePart: number }>;
  };
  // Filtrages fiscaux
  exclurePour: {
    avantageMatrimonial?: boolean;
    retourLegal?: boolean;
    retourConventionnel?: boolean;
    reversionUsufruitExoneree?: boolean;
    liberaliteGraduelleResiduelle?: boolean;
  };
}

export interface CivilShare { 
  beneficiaryId: string; 
  fraction: number; 
  source: 'legal'|'legs'|'donation_entre_epoux'|'autre'; 
}

// Bénéficiaire d'un niveau de clause AV. `statut` gouverne la cascade
// (cf. dmtg/assurance-vie.ts::resolveEffectiveAVBeneficiaires) : absent ou
// 'accepte'/'decede' → compte normalement dans son niveau ; 'renoncant' → sa
// part est redistribuée aux autres bénéficiaires acceptants du même niveau,
// ou le niveau bascule entièrement sur le suivant si aucun n'accepte.
// 'decede' ne déclenche volontairement aucune cascade (décision actée) : à
// ce jour seule l'UI en avertit l'utilisateur, cf. ClauseBeneficiaireBuilder.tsx.
export interface AVBeneficiaireEntry {
  beneficiaryId: string;
  quotePart: Money; // fraction du niveau, 0 à 1
  statut?: 'accepte' | 'renoncant' | 'decede';
  typeDetention?: 'pleine-propriete' | 'usufruit';
  nuProprietaireId?: string; // requis si typeDetention === 'usufruit'
  // Pourcentage de la valeur en usufruit (barème art. 669 CGI), résolu en
  // amont à partir de l'âge de CE bénéficiaire à la date de référence —
  // dmtg/ reste agnostique des dates de naissance, comme pour l'usufruit
  // civil (cf. transmission/index.ts::getDemembrementPct). Requis si
  // typeDetention === 'usufruit', ignoré sinon.
  usufruitPct?: number;
}

export interface AVBeneficiaireNiveau {
  beneficiaires: AVBeneficiaireEntry[];
}

export interface AVContract {
  id: string;
  // niveaux[0] = bénéficiaires principaux, niveaux[1+] = "à défaut" —
  // remplace l'ancienne liste plate, insuffisante pour représenter une
  // clause à plusieurs rangs (cf. diagnostic renonciation clause AV).
  niveaux: AVBeneficiaireNiveau[];
  capitalDeces: Money;
  primesAvant70: Money; // pour 990 I (soumis au prélèvement)
  primesApres70: Money; // pour 757 B (à réintégrer au-delà de 30 500 partagé)
  isExonereBeneficiaireConjointPacs?: boolean; // true si conj/pacs applicable
  isSiblingExonEligible?: boolean; // conditions remplies (flags calculés ailleurs)
  // Détenteur réel du contrat (souscripteur/assuré, cf. assets.detenteur) —
  // détermine si ce contrat est dénoué par le décès simulé (transmission/
  // index.ts::computeTransmission filtre dessus avant le calcul fiscal
  // 990I/757B) ou non dénoué (réintégration civile éventuelle, doctrine Ciot
  // §9.6.1, via TransmissionContext.avReintegrationCivileMontant — jamais ici).
  detenteur?: 'user' | 'spouse';
  // Origine des fonds ayant alimenté le contrat (av_contract_details.
  // origine_fonds) — ne sert qu'à la réintégration civile d'un contrat non
  // dénoué sous régime de communauté ; sans effet sur le calcul fiscal.
  origineFonds?: 'deniers_propres' | 'deniers_communs';
}

export interface Donation {
  id: string;
  date: string; // ISO
  donorId: string; // défunt
  doneeId: string; // beneficiaryId
  valeurDon: Money; // valeur au jour de la donation (rappel = valeur à la donation)
  type?: 'simple'|'partage'|'familiale_790G'|'autre';
}

export interface DmtgParams {
  year: number;
  // Abattements
  abattements: {
    enfant_ascendant: Money; // 100000
    frere_soeur: Money; // 15932
    neveu_niece: Money; // 7967
    tiers: Money; // 1594
    handicap: Money; // 159325
    don_790G: Money; // param 31 865 etc., géré séparément (cumulable)
    apres70_AV_global: Money; // 30500 (art. 757B)
    av_990I_allowance: Money; // ex. 152500 par bénéficiaire
  };
  // Barèmes
  baremes: {
    ligne_directe: Array<{ upTo: number|null; rate: number }>;
    frere_soeur: Array<{ upTo: number|null; rate: number }>;
    collateral_4: Array<{ upTo: number|null; rate: number }>;
    autre: Array<{ upTo: number|null; rate: number }>;
  };
  av_990I_rates: Array<{ upTo: number|null; rate: number }>; // ex. 20% puis 31.25%
  // Démembrement (CGI 669) : table âge -> % usufruit/nue prop
  demembrementViager: Array<{ minAge: number; maxAge: number; usufruitPct: number; nuePropPct: number }>;
  // Autres règles
  corseEndDate: string; // "2027-12-31"
  fraisFunerairesForfait: Money; // 1500
}

export interface AssetValuationResult {
  lignes: Array<{ assetId: string; baseTaxableGlobale: Money; justifs: string[] }>;
  totalBaseTaxable: Money;
  // Forfait mobilier 5% (art. 764 CGI) : fiction fiscale, à ajouter à
  // l'assiette taxable pour le calcul des droits (beneficiary.ts,
  // dmtg/index.ts) mais jamais à `totalBaseTaxable` — cf. assets.ts.
  forfaitMobilier: Money;
}

export interface DismemberedRightResult {
  parts: Array<{ beneficiaryId: string; baseTaxable: Money }>;
  justifs: string[];
}

export interface TaxBaseResult {
  perBeneficiary: Record<string, Money>;
  // Quote-part du forfait mobilier (art. 764 CGI) imputée à chaque
  // bénéficiaire selon sa part civile — à ajouter uniquement à l'assiette
  // fiscale (calcul des droits), jamais à `perBeneficiary` (patrimoine réel).
  perBeneficiaryForfaitMobilier: Record<string, Money>;
  total: Money;
  justifs: string[];
}

export interface RecallAndAllowancesResult {
  allowanceGeneralResidual: Money; // ex. enfant 100k – dons rappelés
  consumedBracketsAmount: Money;  // somme imposable des dons après abattement alloué chronologiquement
  details: any;
}

export interface ProgressiveTaxResult {
  taxe: Money;
  trancheDetails: Array<{ from: Money; to: Money; rate: number; base: Money; duty: Money }>;
}

export interface AssuranceVieResult {
  perBeneficiary: Record<string, { prelev990I: Money; reintegration757B: Money }>;
  notes: string[];
}

export interface DMTGBeneficiaryResult {
  baseHorsAV: Money;
  fraisFunerairesImputes: Money;
  baseApresFrais: Money;
  // Quote-part du forfait mobilier 5% (art. 764 CGI) imputée à ce
  // bénéficiaire pour le calcul des droits — n'est PAS incluse dans
  // baseApresFrais (patrimoine réel), uniquement dans taxableAfterAllowance.
  forfaitMobilierImpute: Money;
  allowanceGeneralResidual: Money;
  taxableAfterAllowance: Money;
  consumedBracketsAmount: Money;
  droitsHorsAV: Money;
  prelev990I: Money;
  reintegration757B: Money;
  droitsTotaux: Money; // droitsHorsAV + prelev990I (hors 757B, déjà intégré dans base)
  netARecevoir?: Money; // optionnel si on veut
  notes: string[];
}

export interface DMTGResult {
  perBeneficiary: Record<string, DMTGBeneficiaryResult>;
  totals: { droitsHorsAV: Money; prelev990I: Money; droitsTotaux: Money };
  logs: string[];
}

export interface DMTGContext {
  deathDate: string;
  params: DmtgParams;
  regimeMatrimonial: any;
  assets: Asset[];
  civilShares: CivilShare[]; // venant du moteur civil
  beneficiaries: Beneficiary[];
  donations: Donation[]; // toutes donations ; on filtre <15 ans par date à date
  avContracts: AVContract[];
  // Inventaire notarié du mobilier produit (art. 764 CGI, §19.5 L1835) : si
  // absent/false, un forfait mobilier de 5% de l'actif brut successoral est
  // ajouté d'office à l'assiette taxable (présomption légale, seule
  // alternative à un inventaire réel). true = inventaire produit, pas de
  // forfait. Défaut false = comportement le plus prudent fiscalement.
  inventaireNotarieProduit?: boolean;
}