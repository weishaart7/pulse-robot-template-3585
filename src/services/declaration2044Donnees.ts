import { assetService, type Asset, type AssetCharge, type AssetRevenu } from '@/services/assetService';
import { passifService } from '@/services/passifService';
import {
  deficitFoncierService,
  type DeficitFoncierImputationRecord,
  type DeficitFoncierReporteRecord,
} from '@/services/deficitFoncierService';
import {
  declaration2044Service,
  toImmeuble2044Input,
  toPartSociete2044Input,
  type Declaration2044Complete,
} from '@/services/declaration2044Service';
import {
  calculerDeclaration2044,
  type Declaration2044Result,
  type DeficitAnterieur2044Input,
  type Immeuble2044Input,
  type PartSociete2044Input,
} from '@/lib/fiscalite/calculerDeclaration2044';
import {
  preremplirImmeuble,
  preremplirPart,
  repartirActifs2044,
  type PreremplissageImmeuble,
} from '@/lib/fiscalite/preremplissage2044';

// Assemble tout ce que la 2044 d'une année consomme : la déclaration persistée (surcharges), le
// préremplissage calculé depuis Immobilier / Actifs-Passifs et le stock de déficits antérieurs.
// Partagé par l'écran 2044 (useDeclaration2044) et la Vision générale (useFiscalOverview).

export interface Donnees2044 extends Declaration2044Complete {
  /** Préremplissage par id de ligne d'immeuble (lignes reliées à un actif). */
  prerempliImmeubles: Record<string, PreremplissageImmeuble>;
  prerempliParts: Record<string, Partial<PartSociete2044Input>>;
  deficitsAnterieurs: DeficitAnterieur2044Input[];
}

/**
 * Rubrique 450, colonne A : non imputé au 31/12/N-1 = restant actuel + imputations enregistrées
 * sur les années N et suivantes (reports déjà appliqués depuis Immobilier). Regroupé par année d'origine.
 */
export function toDeficitsAnterieurs2044(
  records: DeficitFoncierReporteRecord[],
  imputations: DeficitFoncierImputationRecord[],
  annee: number,
): DeficitAnterieur2044Input[] {
  const parAnnee = new Map<number, number>();
  for (const r of records) {
    const reimpute = imputations
      .filter((i) => i.deficit_id === r.id && i.annee_imputation >= annee)
      .reduce((s, i) => s + Number(i.montant), 0);
    parAnnee.set(r.annee_origine, (parAnnee.get(r.annee_origine) || 0) + Number(r.montant_restant) + reimpute);
  }
  return [...parAnnee.entries()].map(([anneeOrigine, montantNonImpute]) => ({ anneeOrigine, montantNonImpute }));
}

const parActif = <T extends { asset_id: string }>(lignes: T[]) => {
  const map: Record<string, T[]> = {};
  for (const l of lignes) (map[l.asset_id] ??= []).push(l);
  return map;
};

/** Charge la 2044 de l'année. `creer` : crée la déclaration et une ligne par actif éligible manquant ; sinon null si absente. */
export async function chargerDonnees2044(annee: number, creer: boolean): Promise<Donnees2044 | null> {
  const complete = await declaration2044Service.get(annee, creer);
  if (!complete) return null;

  const [biensNus, partsFoncieres, emprunts, deficits, imputations] = await Promise.all([
    assetService.getBiensLocationNue(),
    assetService.getPartsRevenusFonciers(),
    passifService.getEmprunts(),
    deficitFoncierService.list(),
    deficitFoncierService.listImputations(),
  ]);
  const actifs = repartirActifs2044(biensNus, partsFoncieres);

  if (creer) {
    const dejaImmeubles = new Set(complete.immeubles.map((i) => i.asset_id));
    const dejaParts = new Set(complete.parts.map((p) => p.asset_id));
    for (const a of actifs.immeubles.filter((a) => !dejaImmeubles.has(a.id!))) {
      complete.immeubles.push(await declaration2044Service.createImmeuble(complete.declaration.id, {
        asset_id: a.id, ordre: complete.immeubles.length,
      }));
    }
    for (const a of actifs.parts.filter((a) => !dejaParts.has(a.id!))) {
      complete.parts.push(await declaration2044Service.createPart(complete.declaration.id, {
        asset_id: a.id, ordre: complete.parts.length,
      }));
    }
  }

  const tous: Asset[] = [...actifs.immeubles, ...actifs.parts];
  const ids = tous.map((a) => a.id).filter((id): id is string => !!id);
  const [revenus, charges] = await Promise.all([
    assetService.getAssetRevenusByAssetIds(ids),
    assetService.getAssetChargesByAssetIds(ids),
  ]);
  const revenusParActif = parActif<AssetRevenu>(revenus);
  const chargesParActif = parActif<AssetCharge>(charges);
  const actifParId = new Map(tous.map((a) => [a.id, a]));

  const prerempliImmeubles: Donnees2044['prerempliImmeubles'] = {};
  for (const ligne of complete.immeubles) {
    const asset = ligne.asset_id ? actifParId.get(ligne.asset_id) : undefined;
    if (asset) prerempliImmeubles[ligne.id] = preremplirImmeuble(asset, revenusParActif[asset.id!] || [], chargesParActif[asset.id!] || [], emprunts, annee);
  }
  const prerempliParts: Donnees2044['prerempliParts'] = {};
  for (const ligne of complete.parts) {
    const asset = ligne.asset_id ? actifParId.get(ligne.asset_id) : undefined;
    if (asset) prerempliParts[ligne.id] = preremplirPart(asset, revenusParActif[asset.id!] || [], chargesParActif[asset.id!] || [], emprunts, annee);
  }

  return {
    ...complete,
    prerempliImmeubles,
    prerempliParts,
    deficitsAnterieurs: toDeficitsAnterieurs2044(deficits, imputations, annee),
  };
}

export function calculerDonnees2044(annee: number, d: Donnees2044): Declaration2044Result {
  const immeubles: Immeuble2044Input[] = d.immeubles.map((i) => toImmeuble2044Input(i, d.prerempliImmeubles[i.id]?.valeurs));
  const parts: PartSociete2044Input[] = d.parts.map((p) => toPartSociete2044Input(p, d.prerempliParts[p.id]));
  return calculerDeclaration2044({ annee, immeubles, parts, deficitsAnterieurs: d.deficitsAnterieurs });
}
