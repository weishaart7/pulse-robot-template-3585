import { Asset, DmtgParams, AssetValuationResult } from './types';

export function filterAndValueEstateAssets(
  assets: Asset[],
  params: DmtgParams,
  deathDate: string,
  inventaireNotarieProduit: boolean = false
): AssetValuationResult {
  const lignes: Array<{ assetId: string; baseTaxableGlobale: number; justifs: string[] }> = [];
  let totalBaseTaxable = 0;

  for (const asset of assets) {
    let baseTaxable = asset.valeurVenale;
    const justifs: string[] = [`Valeur vénale : ${asset.valeurVenale}€`];

    // Exclusions fiscales
    if (asset.exclurePour.avantageMatrimonial) {
      baseTaxable = 0;
      justifs.push("Exclu : avantage matrimonial");
    } else if (asset.exclurePour.retourLegal || asset.exclurePour.retourConventionnel) {
      baseTaxable = 0;
      justifs.push("Exclu : droit de retour");
    } else if (asset.exclurePour.reversionUsufruitExoneree) {
      baseTaxable = 0;
      justifs.push("Exclu : réversion d'usufruit exonérée");
    } else if (asset.exclurePour.liberaliteGraduelleResiduelle) {
      baseTaxable = 0;
      justifs.push("Exclu : libéralité graduelle/résiduelle");
    } else {
      // Applications des abattements
      
      // Résidence principale -20%
      if (asset.isResidencePrincipale) {
        baseTaxable *= 0.8;
        justifs.push("Résidence principale : -20%");
      }

      // Corse -50% (si applicable)
      if (asset.location === 'corse' && new Date(deathDate) <= new Date(params.corseEndDate)) {
        baseTaxable *= 0.5;
        justifs.push("Corse : -50% (applicable jusqu'au 31/12/2027)");
      }

      // Monument historique ouvert : exonération totale
      if (asset.isMonumentHistoriqueOuvert) {
        baseTaxable = 0;
        justifs.push("Monument historique ouvert : exonération totale");
      }

      // Bois/forêts & parts de GF : abattement 75%
      if (asset.isBoisForetOuGF) {
        baseTaxable *= 0.25;
        justifs.push("Bois/forêts ou parts de GF : abattement 75%");
      }
    }

    baseTaxable = Math.round(baseTaxable);
    totalBaseTaxable += baseTaxable;

    lignes.push({
      assetId: asset.id,
      baseTaxableGlobale: baseTaxable,
      justifs
    });
  }

  // Forfait mobilier de 5% (art. 764 CGI, présomption légale sur l'actif
  // brut successoral hors le forfait lui-même — pas d'effet cumulatif), sauf
  // inventaire notarié produit. Fiction fiscale pure : gonfle l'assiette
  // taxable (renvoyée séparément ci-dessous, consommée par
  // beneficiary.ts/dmtg/index.ts pour le calcul des droits) mais ne doit
  // JAMAIS s'ajouter à `totalBaseTaxable`, qui sert aussi de valeur de
  // patrimoine réel réparti entre héritiers (netBreakdown.ts) — un bien qui
  // n'existe pas ne peut pas être "reçu".
  const forfaitMobilier = inventaireNotarieProduit ? 0 : Math.round(totalBaseTaxable * 0.05);

  return {
    lignes,
    totalBaseTaxable: Math.round(totalBaseTaxable),
    forfaitMobilier
  };
}