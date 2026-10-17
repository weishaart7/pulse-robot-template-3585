import type { Asset, AssetCharge, AssetRevenu } from '@/services/assetService';
import type { Emprunt } from '@/services/passifService';
import { computeQuotePart, creditsBien } from './rentabilite';
import { computeFluxBien } from './portefeuille';
import { projeterBien, type HypothesesProjection, type PeriodeProjection } from './projection';
import type { CreditBien } from './credit';

// Assemblage d'une projection pour un bien à partir des données brutes (fiche du bien, Vue d'ensemble) :
// flux de l'année (computeFluxBien), crédits (emprunt Patrimoine relié ou champs Financement), valeur
// actuelle à la part du foyer. Fonction pure, testée via projection.test.ts / credit.test.ts.

export interface DonneesProjectionBien {
  asset: Asset;
  revenus: AssetRevenu[];
  charges: AssetCharge[];
  emprunts: Emprunt[];
  /** Fraction de démembrement (1 en pleine propriété, null si non calculable). */
  fraction: number | null;
}

export interface PreparationProjection {
  flux: { loyerAnnuel: number; chargesAnnuelles: number };
  credits: CreditBien[];
  valeurActuelle: number | null;
  avertissements: string[];
}

export function preparerProjectionBien({ asset, revenus, charges, emprunts, fraction }: DonneesProjectionBien): PreparationProjection {
  const flux = computeFluxBien(asset, revenus, charges, emprunts);
  const credits = creditsBien(asset, emprunts);
  const quotePart = computeQuotePart(asset) / 100;
  const valeurActuelle = fraction === null ? null : (asset.valeur_estimee || 0) * fraction * quotePart;
  const nom = asset.denomination || asset.nature;

  const avertissements: string[] = [];
  for (const c of credits) {
    if (!c.echeancier.complet) {
      avertissements.push(
        `${nom}${c.libelle ? ` — ${c.libelle}` : ''} : mensualité ou durée restante manquante (ou mensualité inférieure aux intérêts) dans Patrimoine ; ce crédit n'est pas projeté et son capital restant dû reste constant.`,
      );
    }
  }
  if (fraction === null) {
    avertissements.push(`${nom} : valeur non projetée (démembrement dont l'âge de l'usufruitier n'est pas calculable).`);
  }
  return { flux, credits, valeurActuelle, avertissements };
}

export function projeterPreparation(p: PreparationProjection, hypotheses: HypothesesProjection, nbPeriodes: number, aujourdhui = new Date()): PeriodeProjection[] {
  return projeterBien({ flux: p.flux, credits: p.credits, valeurActuelle: p.valeurActuelle, hypotheses, nbPeriodes, aujourdhui });
}
