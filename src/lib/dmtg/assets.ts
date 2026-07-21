import { Asset, DmtgParams, AssetValuationResult, DismemberedRightResult } from './types';

export function filterAndValueEstateAssets(
  assets: Asset[], 
  params: DmtgParams, 
  deathDate: string
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

  return {
    lignes,
    totalBaseTaxable: Math.round(totalBaseTaxable)
  };
}

export function valueDismemberedRight(asset: Asset, params: DmtgParams): DismemberedRightResult {
  const parts: Array<{ beneficiaryId: string; baseTaxable: number }> = [];
  const justifs: string[] = [];

  if (!asset.demembrement) {
    return { parts, justifs: ["Aucun démembrement"] };
  }

  const { type, usufruitierAge, dureeAns, usufruitierId, nueProprietaires } = asset.demembrement;
  let usufruitPct = 0;
  let nuePropPct = 0;

  if (type === 'viager' && usufruitierAge !== undefined) {
    // Barème CGI art. 669
    const baremeEntry = params.demembrementViager.find(
      entry => usufruitierAge >= entry.minAge && usufruitierAge <= entry.maxAge
    );
    
    if (baremeEntry) {
      usufruitPct = baremeEntry.usufruitPct;
      nuePropPct = baremeEntry.nuePropPct;
      justifs.push(`Usufruit viager (âge ${usufruitierAge}) : ${(usufruitPct * 100)}% / ${(nuePropPct * 100)}%`);
    }
  } else if (type === 'temporaire' && dureeAns !== undefined) {
    // 23% par tranche indivisible de 10 ans
    const tranches = Math.ceil(dureeAns / 10);
    usufruitPct = Math.min(tranches * 0.23, 1);
    nuePropPct = 1 - usufruitPct;
    justifs.push(`Usufruit temporaire (${dureeAns} ans = ${tranches} tranches) : ${(usufruitPct * 100)}% / ${(nuePropPct * 100)}%`);
  }

  // Calcul des parts
  if (usufruitierId) {
    parts.push({
      beneficiaryId: usufruitierId,
      baseTaxable: Math.round(asset.valeurVenale * usufruitPct)
    });
  }

  nueProprietaires.forEach(np => {
    parts.push({
      beneficiaryId: np.id,
      baseTaxable: Math.round(asset.valeurVenale * nuePropPct * np.quotePart)
    });
  });

  return { parts, justifs };
}