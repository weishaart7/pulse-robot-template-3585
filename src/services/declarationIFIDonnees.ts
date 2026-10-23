import { assetService } from '@/services/assetService';
import { passifService } from '@/services/passifService';
import {
  declarationIFIService,
  toLigneActifIFI,
  toLigneDetteIFI,
  type DeclarationIFIComplete,
} from '@/services/declarationIFIService';
import { calculerDeclarationIFI, type DeclarationIFIResultat } from '@/lib/fiscalite/calculerDeclarationIFI';
import { preremplirIFI, type LigneActifIFI, type LigneDetteIFI } from '@/lib/fiscalite/preremplissageIFI';

// Assemble tout ce que la 2042-IFI d'une année consomme : la déclaration persistée (surcharges) et le
// préremplissage calculé depuis Patrimoine / Passifs. Partagé par l'écran IFI (useDeclarationIFI) et
// la Vision générale (useFiscalOverview).

export interface DonneesIFI extends DeclarationIFIComplete {
  /** Préremplissage par id de ligne (lignes reliées à un actif ou un emprunt). */
  prerempliActifs: Record<string, LigneActifIFI>;
  prerempliDettes: Record<string, LigneDetteIFI>;
}

/** Cases 9PR et 9PX préremplies depuis le calcul de la 2042 des revenus N−1 (null : année non couverte). */
export interface Plafonnement2042 {
  impots: number;
  revenus: number;
}

/** Charge la 2042-IFI de l'année. `creer` : crée la déclaration et une ligne par actif ou dette préremplis manquants ; sinon null si absente. */
export async function chargerDonneesIFI(annee: number, creer: boolean): Promise<DonneesIFI | null> {
  const complete = await declarationIFIService.get(annee, creer);
  if (!complete) return null;

  const [assets, emprunts] = await Promise.all([assetService.getAssets(), passifService.getEmprunts()]);
  const prerempli = preremplirIFI(assets, emprunts, annee);

  if (creer) {
    const dejaActifs = new Set(complete.actifs.map((a) => a.asset_id));
    const dejaDettes = new Set(complete.dettes.map((d) => d.emprunt_id));
    for (const a of prerempli.actifs.filter((a) => a.assetId && !dejaActifs.has(a.assetId))) {
      complete.actifs.push(await declarationIFIService.createActif(complete.declaration.id, {
        asset_id: a.assetId, ordre: complete.actifs.length,
      }));
    }
    for (const d of prerempli.dettes.filter((d) => d.empruntId && !dejaDettes.has(d.empruntId))) {
      complete.dettes.push(await declarationIFIService.createDette(complete.declaration.id, {
        emprunt_id: d.empruntId, ordre: complete.dettes.length,
      }));
    }
  }

  const actifParAsset = new Map(prerempli.actifs.map((a) => [a.assetId, a]));
  const detteParEmprunt = new Map(prerempli.dettes.map((d) => [d.empruntId, d]));
  const prerempliActifs: DonneesIFI['prerempliActifs'] = {};
  for (const ligne of complete.actifs) {
    const p = ligne.asset_id ? actifParAsset.get(ligne.asset_id) : undefined;
    if (p) prerempliActifs[ligne.id] = p;
  }
  const prerempliDettes: DonneesIFI['prerempliDettes'] = {};
  for (const ligne of complete.dettes) {
    const p = ligne.emprunt_id ? detteParEmprunt.get(ligne.emprunt_id) : undefined;
    if (p) prerempliDettes[ligne.id] = p;
  }
  return { ...complete, prerempliActifs, prerempliDettes };
}

/** Lignes fusionnées (surcharges sur préremplissage), dans l'ordre de la déclaration. */
export function lignesIFI(d: DonneesIFI) {
  return {
    actifs: d.actifs.map((a) => toLigneActifIFI(a, d.prerempliActifs[a.id])),
    dettes: d.dettes.map((x) => toLigneDetteIFI(x, d.prerempliDettes[x.id])),
  };
}

/** 9PR et 9PX retenus : saisie, sinon reprise de la 2042 ; 9PX augmenté des revenus hors 2042. */
export function plafonnementRetenu(d: DonneesIFI, depuis2042: Plafonnement2042 | null) {
  const { impots_revenus_n1: impots, revenus_n1: revenus, revenus_hors_2042: horsDeclaration } = d.declaration;
  const revenusBase = revenus !== null ? Number(revenus) : depuis2042?.revenus ?? null;
  return {
    impots: impots !== null ? Number(impots) : depuis2042?.impots ?? 0,
    revenus: revenusBase === null && horsDeclaration === null ? null : (revenusBase ?? 0) + Number(horsDeclaration ?? 0),
  };
}

export function calculerDonneesIFI(annee: number, d: DonneesIFI, depuis2042: Plafonnement2042 | null): DeclarationIFIResultat {
  const { actifs, dettes } = lignesIFI(d);
  const retenus = actifs.filter((a) => !a.exclu);
  const plafonnement = plafonnementRetenu(d, depuis2042);
  return calculerDeclarationIFI({
    annee,
    biens: retenus.filter((a) => a.categorie).map((a) => ({ categorie: a.categorie!, valeur: a.valeur, fractionTaxable: a.fractionTaxable })),
    biensIndirects: retenus.filter((a) => !a.categorie).map((a) => a.valeur),
    dettes: dettes.filter((x) => !x.exclue),
    deduireIFITheorique: d.declaration.deduire_ifi_theorique,
    donsFrance: Number(d.declaration.dons_france ?? 0),
    donsUE: Number(d.declaration.dons_ue ?? 0),
    impotsRevenusN1: plafonnement.impots,
    revenusN1: plafonnement.revenus,
  });
}
