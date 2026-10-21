// Valeur d'une société calculée depuis ce qu'elle détient (biens : assets.societe_proprietaire_id)
// et ce qu'elle doit (emprunts : emprunts.societe_id, comptes courants d'associés), plus sa
// trésorerie. Enregistrée dans societes.valeur_estimee tant que valeur_auto = true, puis recopiée
// sur l'actif « parts » du foyer (partsFoyer.ts::actifDepuisSociete).

export interface ValeurSocieteInput {
  biens: { valeur_estimee?: number | null }[];
  emprunts: { capital_restant_du?: number | null }[];
  compteCourantAssocies?: number | null;
  tresorerie?: number | null;
}

export interface ValeurSocieteDetail {
  biens: number;
  tresorerie: number;
  emprunts: number;
  compteCourantAssocies: number;
  valeur: number;
}

const somme = (xs: (number | null | undefined)[]) => xs.reduce<number>((t, x) => t + (x ?? 0), 0);

/** Actif net : biens + trésorerie − emprunts − comptes courants d'associés (jamais négatif). */
export const calculerValeurSociete = (e: ValeurSocieteInput): ValeurSocieteDetail => {
  const biens = somme(e.biens.map((b) => b.valeur_estimee));
  const emprunts = somme(e.emprunts.map((x) => x.capital_restant_du));
  const tresorerie = e.tresorerie ?? 0;
  const compteCourantAssocies = e.compteCourantAssocies ?? 0;
  const valeur = Math.max(0, Math.round((biens + tresorerie - emprunts - compteCourantAssocies) * 100) / 100);
  return { biens, tresorerie, emprunts, compteCourantAssocies, valeur };
};

/** La valeur calculée ne remplace la saisie que si elle est demandée et que la société détient des biens. */
export const valeurSocieteRetenue = (
  valeurSaisie: number | null | undefined,
  valeurAuto: boolean | null | undefined,
  detail: ValeurSocieteDetail,
  nbBiens: number,
): number | null => (valeurAuto !== false && nbBiens > 0 ? detail.valeur : valeurSaisie ?? null);

/** Bien détenu par une société du foyer : hors totaux du foyer (qui n'en détient que des parts). */
export const estBienDeSociete = (asset: { societe_proprietaire_id?: string | null }): boolean =>
  !!asset.societe_proprietaire_id;

type BienComparable = { id?: string; nature?: string | null; valeur_estimee?: number | null; denomination?: string | null };

/**
 * Biens directs qui ressemblent à un bien de la société (même nature, valeur à ± 5 %) : risque que
 * le même bien soit compté deux fois, en direct et dans la valeur des parts. Simple signal.
 */
export const doublonsProbables = <T extends BienComparable>(directs: T[], deSociete: BienComparable[]): T[] =>
  directs.filter((d) => deSociete.some((s) => {
    const vd = d.valeur_estimee ?? 0;
    const vs = s.valeur_estimee ?? 0;
    return d.nature === s.nature && vs > 0 && Math.abs(vd - vs) <= 0.05 * vs;
  }));
