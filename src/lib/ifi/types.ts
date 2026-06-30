export type Money = number;

export interface IFIBienDirectInput {
  valeurTotale: Money;
  bienMixte?: boolean;
  fractionTaxable?: number; // pourcentage 0-100
  abattementResidencePrincipale?: boolean; // -30%
  abattementBoisForets?: boolean; // -75%
}

export interface IFIBienIndirectInput {
  valeurBien: Money;
}

export interface IFIPassifInput {
  montant: Money;
}

export interface IFIPlafonnementInput {
  revenusN1: Money; // revenus mondiaux nets du foyer, année N-1
  irPsN: Money; // IR + prélèvements sociaux dus au titre de l'année N
}

export interface IFICalculInput {
  immeublesBatis: IFIBienDirectInput[];
  immeublesNonBatis: IFIBienDirectInput[];
  biensIndirects: IFIBienIndirectInput[];
  passifs: IFIPassifInput[];
  plafonnement?: IFIPlafonnementInput;
}

export interface IFITrancheDetail {
  min: number;
  max: number;
  taux: number;
  montantTranche: Money;
  impot: Money;
}

export interface IFICalculResult {
  totalActifBrut: Money;
  totalPassifs: Money;
  assietteTaxable: Money;
  tranches: IFITrancheDetail[];
  ifiTheorique: Money;
  decote: Money;
  montantApresDecote: Money;
  reductionPlafonnement: Money;
  ifiFinal: Money;
}
