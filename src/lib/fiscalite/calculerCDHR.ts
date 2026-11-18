import type { FoyerFiscalInput } from './types';
import { PARAMETRES_PAR_DEFAUT, type ParametresFiscaux } from './parametres';

/**
 * Contribution différentielle sur les hauts revenus (art. 224 CGI, BOI-IR-CDHR-10) :
 * CDHR = 20 % × RREF − décote − (IR1 + CEHR1 + PREL1 + majorations), si positive, arrondie à l'euro.
 * Fonction pure : l'appelant construit le revenu de référence et l'impôt retenu (voir useFiscalOverview).
 */
export interface CDHRInput {
  /** Revenu fiscal de référence (revenus au quotient comptés pour 1/4, comme l'avis). */
  revenuFiscalReference: number;
  /** Revenus au quotient (0XX) : retenus pour leur montant total dans le RREF. */
  revenuExceptionnelQuotient: number;
  /** Abattement de 40 % sur les dividendes au barème, retiré du RREF (§160). */
  abattementDividendes: number;
  /** Produits de brevets imposés à 10 %, retirés du RREF (§180). */
  produitsBrevets: number;
  /**
   * IR1 (§250) : impôt après décote, à taux proportionnel compris, diminué des seuls avantages
   * non réintégrés ; hors impôt sur les brevets (§310), hors acomptes (2CK) et crédits restituables
   * d'acompte.
   */
  impotRetenu: number;
  /** CEHR1 (§330). */
  cehr: number;
  /** PREL1 (§340) : prélèvements libératoires (2DH). */
  prelevementsLiberatoires: number;
  situationFamille: FoyerFiscalInput['situationFamille'];
  /** Personnes à charge au sens des art. 196, 196 A bis et 196 B (résidence alternée comptée en entier). */
  personnesCharge: number;
}

export interface CDHRResult {
  revenuReference: number;
  /** Le revenu de référence dépasse le seuil d'entrée. */
  assujetti: boolean;
  impositionMinimale: number;
  decote: number;
  majorations: number;
  /** IR1 + CEHR1 + PREL1 + majorations. */
  impositionsRetenues: number;
  cdhr: number;
}

const COUPLE: FoyerFiscalInput['situationFamille'][] = ['marie', 'pacse'];

export function calculerCDHR(input: CDHRInput, parametres: ParametresFiscaux = PARAMETRES_PAR_DEFAUT): CDHRResult {
  const p = parametres.cdhr;
  const couple = COUPLE.includes(input.situationFamille);
  const facteur = couple ? 2 : 1;
  const seuil = p.seuilPersonneSeule * facteur;
  const plafondDecote = p.plafondDecotePersonneSeule * facteur;

  const revenuReference = Math.max(0,
    input.revenuFiscalReference
    + Math.max(0, input.revenuExceptionnelQuotient) * 3 / 4
    - Math.max(0, input.abattementDividendes)
    - Math.max(0, input.produitsBrevets));
  const assujetti = revenuReference > seuil;
  const impositionMinimale = revenuReference * p.tauxMinimum;
  const decote = assujetti && revenuReference <= plafondDecote
    ? Math.max(0, impositionMinimale - (revenuReference - seuil) * p.tauxDecote)
    : 0;
  const majorations = (couple ? p.majorationCouple : 0) + Math.max(0, input.personnesCharge) * p.majorationPersonneCharge;
  const impositionsRetenues = Math.max(0, input.impotRetenu) + Math.max(0, input.cehr)
    + Math.max(0, input.prelevementsLiberatoires) + majorations;
  const cdhr = assujetti ? Math.max(0, Math.round(impositionMinimale - decote - impositionsRetenues)) : 0;

  return { revenuReference, assujetti, impositionMinimale, decote, majorations, impositionsRetenues, cdhr };
}
