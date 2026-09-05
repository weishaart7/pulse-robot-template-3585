import { FoyerFiscalInput, PartsFiscalesResult } from './types';

/**
 * Barème progressif de l'impôt sur le revenu, revenus 2025 / impôt 2026
 * (art. 4 loi de finances pour 2026, revalorisation de 0,9 %).
 * `seuil` = borne supérieure cumulée de la tranche (revenu par part).
 */
export const BAREME_2026 = [
  { seuil: 11600, taux: 0 },
  { seuil: 29579, taux: 0.11 },
  { seuil: 84577, taux: 0.30 },
  { seuil: 181917, taux: 0.41 },
  { seuil: Infinity, taux: 0.45 },
] as const;

/**
 * Système du quotient pour revenus exceptionnels (art. 163-0 A CGI) :
 * coefficient fixe 4. Les revenus différés (coefficient = nombre d'années +1,
 * variable, sans case CERFA dédiée pour le nombre d'années) restent hors
 * périmètre — voir docs/fiscalite.md.
 */
const COEFFICIENT_QUOTIENT_EXCEPTIONNEL = 4;

const DECOTE_TAUX = 0.4525;
const DECOTE_SEUIL_CELIBATAIRE = 1982;
const DECOTE_MONTANT_CELIBATAIRE = 897;
const DECOTE_SEUIL_COUPLE = 3277;
const DECOTE_MONTANT_COUPLE = 1483;

const COUPLE_IMPOSITION_COMMUNE: FoyerFiscalInput['situationFamille'][] = ['marie', 'pacse'];

/**
 * Réduction d'impôt outre-mer (art. 197 I 3° CGI, revenus 2025 / impôt 2026) :
 * taux et plafond par territoire. Absente pour la métropole.
 */
const REDUCTION_OUTRE_MER: Record<FoyerFiscalInput['lieuResidence'], { taux: number; plafond: number }> = {
  metropole: { taux: 0, plafond: 0 },
  guadeloupe_martinique_reunion: { taux: 0.30, plafond: 2450 },
  guyane_mayotte: { taux: 0.40, plafond: 4050 },
};

export interface ImpotResult {
  revenuImposable: number;
  revenuExonereTauxEffectif: number;
  revenuMondialFictif: number;
  nombreParts: number;
  quotientFamilial: number;
  impotSansMajorations: number;
  impotAvecMajorations: number;
  avantageQuotientFamilial: number;
  plafondQuotientFamilial: number;
  plafonnementApplique: boolean;
  impotApresPlafonnement: number;
  tauxEffectif: number;
  impotProportionnel: number;
  reductionOutreMer: number;
  impotApresReductionOutreMer: number;
  decote: number;
  impotApresDecote: number;
  impotForfaitaire: number;
  creditImpotAssuranceVie: number;
  impotNet: number;
  tmi: number;
  revenuExceptionnelQuotient: number;
  impotSupplementaireQuotientExceptionnel: number;
}

/** Impôt dû sur un quotient (revenu par part), tranche par tranche. */
function impotPourQuotient(quotient: number): number {
  let impot = 0;
  let seuilPrecedent = 0;

  for (const tranche of BAREME_2026) {
    if (quotient <= seuilPrecedent) break;
    const borneSup = Math.min(quotient, tranche.seuil);
    impot += (borneSup - seuilPrecedent) * tranche.taux;
    seuilPrecedent = tranche.seuil;
  }

  return impot;
}

/** Taux marginal d'imposition (taux de la tranche contenant le quotient). */
function tmiPourQuotient(quotient: number): number {
  const tranche = BAREME_2026.find(t => quotient <= t.seuil);
  return tranche ? tranche.taux : BAREME_2026[BAREME_2026.length - 1].taux;
}

function impotBrut(revenuImposable: number, nombreParts: number): number {
  if (nombreParts <= 0) return 0;
  return impotPourQuotient(revenuImposable / nombreParts) * nombreParts;
}

interface QuotientFamilialResult {
  impotSansMajorations: number;
  impotAvecMajorations: number;
  avantageQuotientFamilial: number;
  plafondQuotientFamilial: number;
  plafonnementApplique: boolean;
  impotApresPlafonnement: number;
}

/**
 * Barème + quotient familial + plafonnement (art. 197 CGI), en fonction du
 * revenu mondial fictif — factorisé pour être appelé deux fois par le système
 * du quotient (revenus exceptionnels, voir calculerImpot ci-dessous) : une
 * fois sur le revenu ordinaire, une fois sur le revenu ordinaire augmenté du
 * quotient (0XX / 4).
 */
function calculerImpotApresQuotientFamilial(
  revenuMondial: number,
  parts: PartsFiscalesResult,
): QuotientFamilialResult {
  const impotAvecMajorations = impotBrut(revenuMondial, parts.nombreParts);
  const impotSansMajorations = impotBrut(revenuMondial, parts.partsBase);
  const avantageQuotientFamilial = Math.max(0, impotSansMajorations - impotAvecMajorations);

  const majorationSansPlafond = parts.majorations.some(m => m.plafondUnitaire === undefined);
  const plafondQuotientFamilial = majorationSansPlafond
    ? Infinity
    : parts.majorations.reduce((total, m) => total + (m.plafondUnitaire ?? 0), 0);

  const plafonnementApplique = avantageQuotientFamilial > plafondQuotientFamilial;
  const avantageRetenu = Math.min(avantageQuotientFamilial, plafondQuotientFamilial);
  const impotApresPlafonnement = impotSansMajorations - avantageRetenu;

  return {
    impotSansMajorations,
    impotAvecMajorations,
    avantageQuotientFamilial,
    plafondQuotientFamilial,
    plafonnementApplique,
    impotApresPlafonnement,
  };
}

/**
 * Impôt sur le revenu (art. 197 CGI, revenus 2025 / impôt 2026), limité au
 * périmètre actuellement calculable (salaires, gains d'actionnariat au
 * barème, quotient familial), avec application de la méthode du taux
 * effectif pour les revenus exonérés de source étrangère et de la réduction
 * d'impôt outre-mer.
 *
 * Étapes : barème progressif appliqué au quotient du revenu mondial fictif
 * (revenu imposable en France + revenu exonéré retenu pour le taux effectif),
 * puis plafonnement de l'avantage du quotient familial, puis proratisation
 * (méthode du taux effectif : seule la part du revenu imposable en France
 * paie, mais au taux moyen calculé sur le revenu mondial), puis réduction
 * outre-mer (30 % dans la limite de 2 450 € en Guadeloupe/Martinique/Réunion,
 * 40 % dans la limite de 4 050 € en Guyane/Mayotte — BOI-IR-LIQ-20-30-10 :
 * appliquée après plafonnement du quotient familial, avant la décote), puis
 * décote sur ce montant, puis arrondi à l'euro, puis ajout de l'impôt à taux
 * forfaitaire (`impotForfaitaire`, hors barème — voir plus bas).
 *
 * Plafonnement : la somme des `plafondUnitaire` de chaque majoration
 * (`calculerPartsFiscales`) borne l'avantage. Une majoration sans
 * `plafondUnitaire` renseigné (ex. personne invalide à charge, art. 196 A bis
 * CGI — cas non encore chiffré dans `calculerPartsFiscales.ts`) désactive tout
 * plafonnement pour l'ensemble du foyer plutôt que de risquer une sous- ou
 * sur-estimation : simplification à lever quand ce cas sera modélisé. Le
 * `plafondComplementaire` (cumul de majorations sur une même personne) n'est
 * pas non plus appliqué pour l'instant.
 *
 * `revenuExonereTauxEffectif` (optionnel, 0 par défaut) : revenu exonéré net
 * retenu pour le taux effectif (`calculerRevenuExonereTauxEffectif.ts`),
 * additionné par `useFiscalOverview.ts` au revenu ouvrant droit à un crédit
 * d'impôt égal à l'impôt français (1AF/1BF, 1AL/1BL, 1AR/1BR/1CR/1DR) — les
 * deux mécanismes sont mathématiquement équivalents (même formule de prorata)
 * lorsque le crédit est imputé avant réduction outre-mer et décote, hypothèse
 * retenue faute de confirmation BOFiP explicite de l'ordre exact (voir
 * docs/fiscalite.md).
 * `lieuResidence` (optionnel, 'metropole' par défaut) : détermine la
 * réduction outre-mer.
 * `impotForfaitaire` (optionnel, 0 par défaut) : impôt à taux forfaitaire
 * (carried-interest 12,8 % PFU, gains d'actionnariat à taux historique
 * 18 %/30 %/41 %, `calculerGainsActionnariatSalarie.ts`), ajouté tel quel
 * après la décote — ce sont des impositions proportionnelles, étrangères au
 * barème progressif : ni le quotient familial, ni son plafonnement, ni la
 * réduction outre-mer, ni la décote (art. 197 I 4° CGI, limitée à la
 * « cotisation résultant du barème ») ne s'y appliquent.
 * `revenuExceptionnelQuotient` (optionnel, 0 par défaut) : revenus
 * exceptionnels soumis au système du quotient (case 0XX, art. 163-0 A CGI,
 * coefficient fixe 4 — voir calculerGainsActionnariatSalarie.ts). Formule
 * BOFiP BOI-IR-LIQ-20-30-20 : ID1 = barème+quotient familial+plafonnement sur
 * le revenu ordinaire seul ; ID2 = même calcul sur revenu ordinaire + 0XX/4 ;
 * supplément = (ID2 - ID1) × 4 ; impôt brut = ID1 + supplément. La décote
 * porte sur ce total (art. 197 I 4° CGI : « cotisation résultant du barème, y
 * compris [...] revenus soumis à un système de quotient »). Traité comme un
 * revenu français à part entière pour la proratisation du taux effectif.
 * Périmètre limité aux revenus exceptionnels (coefficient fixe) : les revenus
 * différés à coefficient variable (nombre d'années + 1, sans case CERFA dédiée
 * pour ce nombre) ne sont pas couverts.
 * `creditImpotAssuranceVie` (optionnel, 0 par défaut) : crédit d'impôt sur
 * l'abattement de 4 600 €/9 200 € imputé sur 2DH (art. 125-0 A CGI,
 * BOI-RPPM-RCM-20-10-20-50 §330-365 — voir calculerRevenuCapitauxMobiliers.ts),
 * imputé en tout dernier, après la décote et l'impôt forfaitaire, **sans
 * plancher à 0** : le BOFiP le qualifie explicitement de restituable
 * (« s'il excède l'impôt dû, l'excédent est restitué ») — `impotNet` peut
 * donc devenir négatif, ce qui représente une restitution au foyer plutôt
 * qu'un impôt à payer.
 */
export function calculerImpot(
  revenuImposable: number,
  parts: PartsFiscalesResult,
  situationFamille: FoyerFiscalInput['situationFamille'],
  revenuExonereTauxEffectif = 0,
  lieuResidence: FoyerFiscalInput['lieuResidence'] = 'metropole',
  impotForfaitaire = 0,
  revenuExceptionnelQuotient = 0,
  creditImpotAssuranceVie = 0,
): ImpotResult {
  const revenu = Math.max(0, revenuImposable);
  const revenuExonere = Math.max(0, revenuExonereTauxEffectif);
  const revenuExceptionnel = Math.max(0, revenuExceptionnelQuotient);
  const revenuMondialFictifOrdinaire = revenu + revenuExonere;

  const qfOrdinaire = calculerImpotApresQuotientFamilial(revenuMondialFictifOrdinaire, parts);

  let impotApresPlafonnement = qfOrdinaire.impotApresPlafonnement;
  let impotSupplementaireQuotientExceptionnel = 0;
  let revenuMondialFictif = revenuMondialFictifOrdinaire;

  if (revenuExceptionnel > 0) {
    const qfAvecQuotient = calculerImpotApresQuotientFamilial(
      revenuMondialFictifOrdinaire + revenuExceptionnel / COEFFICIENT_QUOTIENT_EXCEPTIONNEL,
      parts,
    );
    impotSupplementaireQuotientExceptionnel =
      (qfAvecQuotient.impotApresPlafonnement - qfOrdinaire.impotApresPlafonnement) * COEFFICIENT_QUOTIENT_EXCEPTIONNEL;
    impotApresPlafonnement = qfOrdinaire.impotApresPlafonnement + impotSupplementaireQuotientExceptionnel;
    revenuMondialFictif = revenuMondialFictifOrdinaire + revenuExceptionnel;
  }

  const { impotSansMajorations, impotAvecMajorations, avantageQuotientFamilial, plafondQuotientFamilial, plafonnementApplique } = qfOrdinaire;

  const baseFrance = revenu + revenuExceptionnel;
  const tauxEffectif = revenuMondialFictif > 0 ? impotApresPlafonnement / revenuMondialFictif : 0;
  const impotProportionnel = revenuExonere > 0 ? tauxEffectif * baseFrance : impotApresPlafonnement;

  const { taux: tauxReductionOutreMer, plafond: plafondReductionOutreMer } = REDUCTION_OUTRE_MER[lieuResidence];
  const reductionOutreMer = Math.min(plafondReductionOutreMer, impotProportionnel * tauxReductionOutreMer);
  const impotApresReductionOutreMer = impotProportionnel - reductionOutreMer;

  const estCoupleImpositionCommune = COUPLE_IMPOSITION_COMMUNE.includes(situationFamille);
  const seuilDecote = estCoupleImpositionCommune ? DECOTE_SEUIL_COUPLE : DECOTE_SEUIL_CELIBATAIRE;
  const montantDecoteBase = estCoupleImpositionCommune ? DECOTE_MONTANT_COUPLE : DECOTE_MONTANT_CELIBATAIRE;
  const decote = impotApresReductionOutreMer < seuilDecote
    ? Math.max(0, montantDecoteBase - impotApresReductionOutreMer * DECOTE_TAUX)
    : 0;

  const impotApresDecote = Math.max(0, Math.round(impotApresReductionOutreMer - decote));
  const creditImpotAssuranceVieApplique = Math.max(0, creditImpotAssuranceVie);
  const impotNet = impotApresDecote + Math.max(0, impotForfaitaire) - creditImpotAssuranceVieApplique;

  return {
    revenuImposable: revenu,
    revenuExonereTauxEffectif: revenuExonere,
    revenuMondialFictif,
    nombreParts: parts.nombreParts,
    quotientFamilial: parts.nombreParts > 0 ? revenuMondialFictif / parts.nombreParts : 0,
    impotSansMajorations,
    impotAvecMajorations,
    avantageQuotientFamilial,
    plafondQuotientFamilial,
    plafonnementApplique,
    impotApresPlafonnement,
    tauxEffectif,
    impotProportionnel,
    reductionOutreMer,
    impotApresReductionOutreMer,
    decote,
    impotApresDecote,
    impotForfaitaire: Math.max(0, impotForfaitaire),
    creditImpotAssuranceVie: creditImpotAssuranceVieApplique,
    impotNet,
    tmi: tmiPourQuotient(parts.nombreParts > 0 ? revenuMondialFictif / parts.nombreParts : 0),
    revenuExceptionnelQuotient: revenuExceptionnel,
    impotSupplementaireQuotientExceptionnel,
  };
}
