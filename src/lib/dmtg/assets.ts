import { Asset, DmtgParams, AssetValuationResult } from './types';

export function filterAndValueEstateAssets(
  assets: Asset[],
  params: DmtgParams,
  deathDate: string,
  inventaireNotarieProduit: boolean = false
): AssetValuationResult {
  const lignes: Array<{ assetId: string; baseTaxableGlobale: number; justifs: string[] }> = [];
  let totalBaseTaxable = 0;
  let valeurRuraleAgricole = 0;
  let passifImputeSurBiens = 0;
  let valeurMeubles = 0;

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
      // Dette afférente à un bien exonéré en tout ou partie (art. 769 II
      // CGI) : imputée par priorité sur sa valeur, avant exonération — seule
      // sa fraction taxable reste déduite. L'excédent éventuel reste dans le
      // passif général. Abattement de la résidence principale exclu : c'est
      // une règle d'évaluation, pas une exonération.
      const bienExonere = asset.isMonumentHistoriqueOuvert || asset.isDutreil || asset.isExonere787C || !!asset.exonerationRurale;
      if (bienExonere && (asset.detteImputee || 0) > 0 && baseTaxable > 0) {
        const imputation = Math.min(asset.detteImputee!, baseTaxable);
        baseTaxable -= imputation;
        passifImputeSurBiens += imputation;
        justifs.push(`Dette imputée sur le bien (art. 769 II CGI) : -${Math.round(imputation)}€`);
      }

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

      // Titres sous pacte Dutreil (art. 787 B CGI) : exonération de 75 %,
      // hors fraction de la valeur adossée à des biens non affectés à
      // l'activité (LF 2026).
      if (asset.isDutreil) {
        const partNonExoneree = Math.min(1, Math.max(0, asset.partNonExonereeDutreil || 0));
        baseTaxable *= 1 - 0.75 * (1 - partNonExoneree);
        justifs.push(partNonExoneree > 0
          ? `Pacte Dutreil : exonération de 75 % hors biens non affectés à l'activité (${Math.round(partNonExoneree * 100)} %)`
          : "Pacte Dutreil : exonération de 75 %");
      }

      // Biens d'une entreprise individuelle (art. 787 C CGI) : exonération de 75 %.
      if (asset.isExonere787C) {
        baseTaxable *= 0.25;
        justifs.push("Entreprise individuelle (art. 787 C CGI) : exonération de 75 %");
      }

      // Bois, forêts, groupements forestiers (art. 793-1-3°, 793-2-2° CGI) :
      // exonération des 3/4, sans plafond.
      if (asset.exonerationRurale === 'forestier') {
        baseTaxable *= 1 - params.exonerationRurale.tauxForestier;
        justifs.push("Bois et forêts : exonération des 3/4 (art. 793 CGI)");
      }

      // GFA, GAF, GFV, biens ruraux à bail à long terme (art. 793 bis CGI) :
      // 3/4 exonérés ici ; la fraction de la part d'un bénéficiaire au-delà du
      // seuil (1/2 seulement) est réintégrée par beneficiary.ts.
      if (asset.exonerationRurale === 'agricole') {
        valeurRuraleAgricole += baseTaxable;
        baseTaxable *= 1 - params.exonerationRurale.tauxAgricole;
        justifs.push("Biens ruraux / GFA : exonération des 3/4 jusqu'au seuil par bénéficiaire (art. 793 bis CGI)");
      }
    }

    baseTaxable = Math.round(baseTaxable);
    totalBaseTaxable += baseTaxable;
    if (asset.isMeublesMeublants) valeurMeubles += baseTaxable;

    lignes.push({
      assetId: asset.id,
      baseTaxableGlobale: baseTaxable,
      justifs
    });
  }

  // Forfait mobilier de 5% (art. 764 CGI) : valeur minimale des meubles
  // meublants, à défaut d'inventaire ou de vente publique — 5 % de l'ensemble
  // des AUTRES biens (meubles exclus de la base, pas d'effet cumulatif). Les
  // meubles déclarés comptent déjà dans l'actif : seul l'excédent du forfait
  // sur leur valeur déclarée s'ajoute. Inventaire notarié produit : valeur
  // déclarée seule. Fiction fiscale pure : gonfle l'assiette
  // taxable (renvoyée séparément ci-dessous, consommée par
  // beneficiary.ts/dmtg/index.ts pour le calcul des droits) mais ne doit
  // JAMAIS s'ajouter à `totalBaseTaxable`, qui sert aussi de valeur de
  // patrimoine réel réparti entre héritiers (netBreakdown.ts) — un bien qui
  // n'existe pas ne peut pas être "reçu".
  const forfaitMobilier = inventaireNotarieProduit
    ? 0
    : Math.max(0, Math.round((totalBaseTaxable - valeurMeubles) * 0.05 - valeurMeubles));

  return {
    lignes,
    totalBaseTaxable: Math.round(totalBaseTaxable),
    forfaitMobilier,
    valeurRuraleAgricole: Math.round(valeurRuraleAgricole),
    passifImputeSurBiens: Math.round(passifImputeSurBiens)
  };
}