import { describe, it, expect } from 'vitest';
import {
  pensionBaseFonctionPublique,
  decoteSurAgeFonctionPublique,
  tauxDecoteParTrimestreFonctionPublique,
  minimumGaranti,
  pensionFonctionPubliqueFinale,
  majorationEnfantsFonctionPublique,
  supplementNBI,
  pensionFonctionPubliqueAvecMajorationEnfants,
  VALEUR_REFERENCE_MIGA_ANNUELLE_2025,
  VALEUR_REFERENCE_MIGA_MENSUELLE_2025,
} from './calculFonctionPublique';
import {
  tauxProratisation,
  decoteSurTrimestresPlafond25,
  surcotePourTrimestresCotises,
  surcoteParentale,
  surcoteTotale,
} from './calcul';

describe('tauxDecoteParTrimestreFonctionPublique — barème par année d\'ouverture des droits (référentiel §7.3, écart #12)', () => {
  it.each([
    [2011, 0.75],
    [2012, 0.875],
    [2013, 1],
    [2014, 1.125],
    [2015, 1.25],
  ])('année d\'ouverture des droits %s → taux %s%% par trimestre', (annee, tauxAttendu) => {
    expect(tauxDecoteParTrimestreFonctionPublique(annee)).toBe(tauxAttendu);
  });

  it('année postérieure à 2015 reste à 1,25 % (palier final, pas de nouveau seuil)', () => {
    expect(tauxDecoteParTrimestreFonctionPublique(2026)).toBe(1.25);
  });

  it('année antérieure à 2011 retombe sur 0,75 % par repli (borne basse du barème)', () => {
    expect(tauxDecoteParTrimestreFonctionPublique(2005)).toBe(0.75);
  });

  it('non renseigné (undefined) → 1,25 % par défaut, comportement historique inchangé', () => {
    expect(tauxDecoteParTrimestreFonctionPublique(undefined)).toBe(1.25);
    expect(tauxDecoteParTrimestreFonctionPublique()).toBe(1.25);
  });
});

describe('decoteSurAgeFonctionPublique — millésime figé à l\'année d\'ouverture des droits, indépendant de la date de liquidation (référentiel §7.3)', () => {
  it('un agent ayant ouvert ses droits en 2014 garde 1,125 %/trimestre même en liquidant après 2015', () => {
    const taux2014 = tauxDecoteParTrimestreFonctionPublique(2014);
    // 2 ans d'écart (62 vs 64) = 8 trimestres manquants.
    const decote = decoteSurAgeFonctionPublique(62, 64, taux2014);
    expect(decote).toBeCloseTo(-9, 5); // -8 × 1,125
  });

  it('sans année d\'ouverture des droits renseignée, le taux par défaut (1,25 %) s\'applique (non-régression)', () => {
    const decoteParDefaut = decoteSurAgeFonctionPublique(62, 64);
    const decoteExplicite = decoteSurAgeFonctionPublique(62, 64, tauxDecoteParTrimestreFonctionPublique(undefined));
    expect(decoteParDefaut).toBe(decoteExplicite);
    expect(decoteParDefaut).toBeCloseTo(-10, 5); // -8 × 1,25
  });

  it('plafond à -25 %, quel que soit le taux par trimestre appliqué', () => {
    const taux2015 = tauxDecoteParTrimestreFonctionPublique(2015);
    // Écart d'âge large (20 trimestres manquants) : -20 × 1,25 = -25, déjà au plafond.
    expect(decoteSurAgeFonctionPublique(57, 62, taux2015)).toBe(-25);
  });

  it('aucune décote si l\'âge de départ atteint ou dépasse l\'âge d\'annulation, quel que soit le taux', () => {
    expect(decoteSurAgeFonctionPublique(67, 67, tauxDecoteParTrimestreFonctionPublique(2011))).toBe(0);
  });
});

describe('minimumGaranti — barème par palier (référentiel §7.5, art. L. 17 CPCMR)', () => {
  // Valeur de référence utilisée sous sa forme MENSUELLE ici, pour comparer
  // directement aux exemples chiffrés du référentiel (eux-mêmes exprimés en
  // €/mois) — le reste du module (pensionBaseFonctionPublique, etc.) reste
  // en annuel, cf. describes suivants qui utilisent
  // VALEUR_REFERENCE_MIGA_ANNUELLE_2025.
  const VALEUR_REF = VALEUR_REFERENCE_MIGA_MENSUELLE_2025; // 1 248,33 €

  describe('Moins de 15 ans, hors invalidité', () => {
    it('13 ans de services (52 trimestres), 168 trimestres requis', () => {
      // Référentiel : "(1 248,33 × 52) / 168 = 389,48 €". Recalcul exact :
      // 1 248,33 × 52 / 168 = 386,3879 € — le référentiel affiche 389,48 €,
      // qui ne se reconstitue qu'avec une valeur de référence ≈ 1 258,33 €
      // (soit +0,80 %, l'écart exact entre 386,39 € et 389,48 €), un chiffre
      // absent du texte de prose du référentiel (qui, lui, confirme bien
      // 1 248,33 € pour 2025) et non retrouvé dans une source externe
      // recoupée pour ce calcul précis. Traité comme une coquille du
      // référentiel (cf. implementation-miga.md §2) : le test porte sur le
      // résultat mathématiquement exact de la formule documentée, pas sur le
      // chiffre affiché tel quel.
      expect(minimumGaranti(52, 168, VALEUR_REF)).toBeCloseTo(386.39, 2);
    });

    it("dépend de trimestresRequis (propre à la génération), pas d'un pourcentage fixe", () => {
      // Même durée de services, trimestres requis différents (génération
      // différente) → résultat différent, contrairement aux paliers ≥ 15 ans
      // qui ne dépendent que de la durée de services.
      const avec168 = minimumGaranti(52, 168, VALEUR_REF);
      const avec172 = minimumGaranti(52, 172, VALEUR_REF);
      expect(avec168).toBeGreaterThan(avec172);
    });
  });

  describe('Moins de 15 ans, invalidité', () => {
    it('13 ans de services, cas invalidité', () => {
      // Référentiel : "(723,53 / 15) × 13 = 627,06 €" où "723,53 = 57,5 % de
      // 1 248,33". Or 57,5 % de 1 248,33 € = 717,7898 €, pas 723,53 € — même
      // écart de +0,80 % que l'exemple précédent (cohérent avec une valeur
      // de référence ≈ 1 258,33 € utilisée par erreur dans les DEUX exemples
      // du référentiel pour le palier "moins de 15 ans"). Recalcul exact :
      // (57,5 % × 1 248,33 / 15) × 13 = 622,0844 €.
      expect(minimumGaranti(52, 168, VALEUR_REF, true)).toBeCloseTo(622.08, 2);
    });

    it('ignore trimestresRequis, contrairement au cas général', () => {
      const avec168 = minimumGaranti(52, 168, VALEUR_REF, true);
      const avec172 = minimumGaranti(52, 172, VALEUR_REF, true);
      expect(avec168).toBe(avec172);
    });

    it('strictement supérieur au cas général à durée de services égale (57,5 % de la valeur de référence prorata temporis, contre un ratio de trimestres requis souvent moins favorable)', () => {
      const casGeneral = minimumGaranti(52, 168, VALEUR_REF, false);
      const casInvalidite = minimumGaranti(52, 168, VALEUR_REF, true);
      expect(casInvalidite).toBeGreaterThan(casGeneral);
    });
  });

  describe('15 à 39 ans', () => {
    it('35 ans de services : 57,5 % + (15 × 2,5) + (5 × 0,5) = 97,5 %', () => {
      // Référentiel : "1 248,33 × 97,5 % = 1 217,12 €" — seul exemple des
      // trois dont l'arithmétique se reconstitue exactement avec la valeur
      // de référence 1 248,33 € confirmée en prose.
      expect(minimumGaranti(140, 172, VALEUR_REF)).toBeCloseTo(1217.12, 2);
    });

    it('exactement 15 ans : 57,5 % pile, aucun point supplémentaire', () => {
      expect(minimumGaranti(60, 172, VALEUR_REF)).toBeCloseTo(VALEUR_REF * 0.575, 6);
    });

    it('exactement 30 ans : 57,5 % + 15 × 2,5 % = 95 %, borne du palier +2,5 pts/an', () => {
      expect(minimumGaranti(120, 172, VALEUR_REF)).toBeCloseTo(VALEUR_REF * 0.95, 6);
    });

    it('calcul continu en trimestres, pas arrondi à l’année inférieure (pas d’effet de seuil artificiel)', () => {
      // 15 ans et 1 trimestre (61 trimestres) doit être strictement
      // supérieur à 15 ans pile (60 trimestres), pas identique — un
      // arrondi à l'année inférieure produirait une valeur plate jusqu'au
      // prochain anniversaire, ce qui sous-évaluerait le minimum garanti
      // pour tout trimestre entamé au-delà d'un multiple de 4.
      const quinzeAnsPile = minimumGaranti(60, 172, VALEUR_REF);
      const quinzeAnsUnTrimestre = minimumGaranti(61, 172, VALEUR_REF);
      expect(quinzeAnsUnTrimestre).toBeGreaterThan(quinzeAnsPile);
    });
  });

  describe('40 ans et plus', () => {
    it('exactement 40 ans : 100 % de la valeur de référence', () => {
      expect(minimumGaranti(160, 172, VALEUR_REF)).toBeCloseTo(VALEUR_REF, 6);
    });

    it('au-delà de 40 ans : plafonné à 100 %, pas de dépassement', () => {
      expect(minimumGaranti(180, 172, VALEUR_REF)).toBeCloseTo(VALEUR_REF, 6); // 45 ans
    });
  });
});

describe('Comparaison pension de droit commun / MIGA — le plus élevé des deux retenu (référentiel §7.5, déjà implémenté par pensionFonctionPubliqueFinale)', () => {
  it('pension de droit commun supérieure au MIGA : le droit commun est retenu, pas le minimum garanti', () => {
    // Carrière complète (40 ans, trimestresRequis 172) et traitement élevé :
    // la pension calculée (75 % du traitement à taux plein) dépasse
    // largement le MIGA plafonné à 100 % de la valeur de référence.
    const traitementAnnuel = 60000;
    const trimestresLiquidables = 172;
    const trimestresRequis = 172;
    const taux = Math.min(trimestresLiquidables / trimestresRequis, 1);

    const pensionCalculee = pensionBaseFonctionPublique(traitementAnnuel, taux, 0);
    const mg = minimumGaranti(trimestresLiquidables, trimestresRequis, VALEUR_REFERENCE_MIGA_ANNUELLE_2025);
    const pensionFinale = pensionFonctionPubliqueFinale(pensionCalculee, mg);

    expect(pensionCalculee).toBeGreaterThan(mg);
    expect(pensionFinale).toBe(pensionCalculee);
    expect(pensionFinale).not.toBe(mg);
  });
});

describe('majorationEnfantsFonctionPublique — dégressif 10 % + 5 %/enfant (référentiel §7.6)', () => {
  it.each([
    [0, 0],
    [2, 0],
    [3, 10], // 10 % pile pour 3 enfants
    [4, 15], // +5 % pour le 4e enfant — cas explicitement demandé par la mission
    [5, 20],
    [6, 25],
  ] as const)('%i enfant(s) éligible(s) → majoration=%i%%', (nombreEnfants, majorationAttendue) => {
    expect(majorationEnfantsFonctionPublique(nombreEnfants)).toBe(majorationAttendue);
  });

  it("diffère de majorationTroisEnfants() (taux flat) : la fonction publique n'a pas un taux unique à 10 %", () => {
    // 4 enfants → 15 % ici, contre 10 % flat pour le régime général
    // (majorationTroisEnfants(4) === 10, testé dans calcul.test.ts).
    expect(majorationEnfantsFonctionPublique(4)).not.toBe(10);
    expect(majorationEnfantsFonctionPublique(4)).toBe(15);
  });
});

describe('supplementNBI — supplément de pension NBI (référentiel §7.7.1, écart #13-NBI)', () => {
  it('cas CNRACL — reproduit la formule du texte source (Décret n° 2003-1306, art. 28) : moyenne × trimestres × (75% / durée requise)', () => {
    // Profil arbitraire mais réaliste : 800 €/an de moyenne NBI revalorisée,
    // perçue pendant 40 trimestres liquidables (10 ans), durée requise 172.
    const moyenneAnnuelleNBI = 800;
    const trimestresPerceptionNBI = 40;
    const dureeRequise = 172;

    const supplement = supplementNBI(moyenneAnnuelleNBI, trimestresPerceptionNBI, dureeRequise);

    const attendu = moyenneAnnuelleNBI * trimestresPerceptionNBI * (0.75 / dureeRequise);
    expect(supplement).toBeCloseTo(attendu, 6);
    expect(supplement).toBeCloseTo(139.53, 2); // 800 × 40 × 0,75/172
  });

  it('0 trimestre de perception → non-éligibilité, supplément nul', () => {
    expect(supplementNBI(1000, 0, 172)).toBe(0);
  });

  it('trimestres de perception négatifs (saisie incohérente) → supplément nul, pas une valeur négative', () => {
    expect(supplementNBI(1000, -5, 172)).toBe(0);
  });

  it('aucun seuil minimal au-delà de 0 : 1 seul trimestre de perception ouvre déjà droit à un supplément non nul', () => {
    const supplement = supplementNBI(1000, 1, 172);
    expect(supplement).toBeGreaterThan(0);
    expect(supplement).toBeCloseTo(1000 * (0.75 / 172), 6);
  });

  it('cas limite : trimestres de perception = durée requise → le ratio atteint exactement 1, supplément = moyenne × 75 % (plafond du taux plein)', () => {
    const moyenneAnnuelleNBI = 500;
    const dureeRequise = 172;
    const supplement = supplementNBI(moyenneAnnuelleNBI, dureeRequise, dureeRequise);
    expect(supplement).toBeCloseTo(moyenneAnnuelleNBI * 0.75, 6);
  });

  it('garde-fou : trimestres de perception supérieurs à la durée requise (saisie incohérente) → ratio plafonné à 1, jamais au-delà de 75 %', () => {
    const moyenneAnnuelleNBI = 500;
    const dureeRequise = 172;
    const supplementAuPlafond = supplementNBI(moyenneAnnuelleNBI, dureeRequise, dureeRequise);
    const supplementAuDela = supplementNBI(moyenneAnnuelleNBI, dureeRequise + 20, dureeRequise);
    expect(supplementAuDela).toBe(supplementAuPlafond); // pas d'effet au-delà du plafond
    expect(supplementAuDela).toBeCloseTo(moyenneAnnuelleNBI * 0.75, 6);
  });

  it('proportionnalité : deux fois plus de trimestres de perception (sous le plafond) → deux fois le supplément', () => {
    const moyenneAnnuelleNBI = 600;
    const dureeRequise = 172;
    const supplement20 = supplementNBI(moyenneAnnuelleNBI, 20, dureeRequise);
    const supplement40 = supplementNBI(moyenneAnnuelleNBI, 40, dureeRequise);
    expect(supplement40).toBeCloseTo(supplement20 * 2, 6);
  });
});

describe('Ordre d’application fonction publique, majoration enfants incluse : base → décote/surcote → minimum garanti → majoration (référentiel §7.2, §7.6)', () => {
  // Traitement modeste et carrière incomplète : pension calculée sous le
  // plancher du minimum garanti, pour vérifier que la majoration est bien
  // assise sur la pension PORTÉE AU MINIMUM GARANTI, pas sur la pension
  // calculée brute (même logique que le MICO du régime général).
  const traitementAnnuel = 20000;
  const trimestresRequis = 172;
  const trimestresLiquidables = 140;
  const tauxProrata = Math.min(trimestresLiquidables / trimestresRequis, 1);
  const decote = 0; // isolé pour ce scénario, non testé ici

  const pensionCalculee = pensionBaseFonctionPublique(traitementAnnuel, tauxProrata, decote);
  const mg = minimumGaranti(trimestresLiquidables, trimestresRequis, VALEUR_REFERENCE_MIGA_ANNUELLE_2025);
  const pensionApresMinimumGaranti = pensionFonctionPubliqueFinale(pensionCalculee, mg);
  const majorationPct = majorationEnfantsFonctionPublique(3); // 10 %

  it('préconditions du scénario : la pension calculée est sous le plancher du minimum garanti', () => {
    expect(pensionCalculee).toBeLessThan(mg);
    expect(pensionApresMinimumGaranti).toBe(mg);
  });

  it('ordre CORRECT : la majoration est assise sur la pension portée au minimum garanti, sans dépasser le dernier traitement', () => {
    const pensionFinale = pensionFonctionPubliqueAvecMajorationEnfants(
      pensionApresMinimumGaranti,
      majorationPct,
      traitementAnnuel
    );
    const attendueAvantPlafond = mg * 1.1;
    expect(attendueAvantPlafond).toBeLessThan(traitementAnnuel); // le plafond ne joue pas dans ce scénario
    expect(pensionFinale).toBeCloseTo(attendueAvantPlafond, 6);
  });

  it('ordre INCORRECT (régression à ne jamais réintroduire) : majoration assise sur la pension calculée brute, avant minimum garanti', () => {
    const pensionIncorrecte = Math.max(pensionCalculee * (1 + majorationPct / 100), mg);
    const pensionCorrecte = pensionFonctionPubliqueAvecMajorationEnfants(
      pensionApresMinimumGaranti,
      majorationPct,
      traitementAnnuel
    );
    expect(pensionIncorrecte).not.toBeCloseTo(pensionCorrecte, 6);
    expect(pensionIncorrecte).toBeLessThan(pensionCorrecte);
  });
});

describe('Plafonnement au dernier traitement (référentiel §7.6 : « le total pension + majoration ne peut excéder le dernier traitement »)', () => {
  it('la majoration est écrêtée dès que pension + majoration dépasse le dernier traitement', () => {
    const pensionPorteeAuMinimumGaranti = 19000;
    const dernierTraitementAnnuel = 20000;
    const majorationPct = majorationEnfantsFonctionPublique(6); // 25 %, 19 000 × 1,25 = 23 750 > 20 000

    const pensionFinale = pensionFonctionPubliqueAvecMajorationEnfants(
      pensionPorteeAuMinimumGaranti,
      majorationPct,
      dernierTraitementAnnuel
    );

    expect(pensionFinale).toBe(dernierTraitementAnnuel);
  });

  it('sans dépassement, la majoration s’applique intégralement (pas de plafond artificiel en dessous du dernier traitement)', () => {
    const pensionPorteeAuMinimumGaranti = 10000;
    const dernierTraitementAnnuel = 20000;
    const majorationPct = majorationEnfantsFonctionPublique(3); // 10 %, 10 000 × 1,10 = 11 000 < 20 000

    const pensionFinale = pensionFonctionPubliqueAvecMajorationEnfants(
      pensionPorteeAuMinimumGaranti,
      majorationPct,
      dernierTraitementAnnuel
    );

    expect(pensionFinale).toBeCloseTo(11000, 6);
  });
});

describe('Profil complet — fonction publique (mission : branchement des majorations sur la pension finale)', () => {
  // Assemblage désormais utilisé par CarriereFonctionPublique.tsx : base →
  // décote → MIGA → surcote (assise sur la pension avant décote, ajoutée
  // après MIGA, exclusive — la plus élevée des deux) → majoration enfants
  // (plafonnée au dernier traitement).
  const trimestresRequis = 172;
  const tib = 30000;

  it('profil avec décote (durée de services insuffisante) : la pension calculée est sous le MIGA, qui l’emporte', () => {
    const trimestresLiquidables = 100;
    const taux = tauxProratisation(trimestresLiquidables, trimestresRequis);
    const decote = Math.min(decoteSurTrimestresPlafond25(trimestresLiquidables, trimestresRequis), 0);
    expect(decote).toBe(-25); // plafond -25 %

    const pensionCalculee = pensionBaseFonctionPublique(tib, taux, decote);
    const mg = minimumGaranti(trimestresLiquidables, trimestresRequis, VALEUR_REFERENCE_MIGA_ANNUELLE_2025);
    const pensionApresMiga = pensionFonctionPubliqueFinale(pensionCalculee, mg);

    expect(pensionApresMiga).toBe(mg);
    expect(pensionApresMiga).toBeGreaterThan(pensionCalculee);
  });

  it('profil avec surcote classique et parentale — EXCLUSIVE (le plus élevé des deux, pas la somme, référentiel §7.4)', () => {
    // ⚠️ Comme pour CNAVPL, trimestresCotisesAnneeReference vaut toujours 0
    // en production pour ce régime (pas de détail carrière par année) : la
    // surcote fonction publique affichée à l'écran est donc actuellement
    // toujours nulle. Ce test valide l'assemblage (surcoteTotale, exclusif)
    // indépendamment de cette limitation actuelle,
    // cf. docs/audit/branchement-majorations-pension-finale.md §1.c.
    const trimestresLiquidables = 180; // carrière complète, surcote éligible
    const taux = tauxProratisation(trimestresLiquidables, trimestresRequis);
    const decote = Math.min(decoteSurTrimestresPlafond25(trimestresLiquidables, trimestresRequis), 0);
    expect(decote).toBe(0);

    const pensionCalculee = pensionBaseFonctionPublique(tib, taux, decote);
    const mg = minimumGaranti(trimestresLiquidables, trimestresRequis, VALEUR_REFERENCE_MIGA_ANNUELLE_2025);
    const pensionApresMiga = pensionFonctionPubliqueFinale(pensionCalculee, mg);

    const trimestresCotisesAnneeReference = 4;
    const surcoteClassiquePct = surcotePourTrimestresCotises(trimestresCotisesAnneeReference, true, true);
    const surcoteParentalePct = surcoteParentale(true, true, true, trimestresCotisesAnneeReference);
    const surcoteTotalePct = surcoteTotale(surcoteClassiquePct, surcoteParentalePct, false);
    expect(surcoteTotalePct).toBe(5); // max(5, 5) — PAS 10, contrairement au régime général/CNAVPL

    const surcoteMontant = pensionCalculee * (surcoteTotalePct / 100);
    const pensionFinale = pensionApresMiga + surcoteMontant;
    expect(pensionFinale).toBeCloseTo(pensionApresMiga * 1.05, 6);
  });

  it('profil réel (donnée manquante) : surcote nulle malgré une éligibilité complète, faute de trimestresCotisesAnneeReference', () => {
    const surcoteClassiquePct = surcotePourTrimestresCotises(0, true, true);
    const surcoteParentalePct = surcoteParentale(true, true, true, 0);
    expect(surcoteTotale(surcoteClassiquePct, surcoteParentalePct, false)).toBe(0);
  });

  it('profil avec majoration pour 4 enfants (dégressif) assise après MIGA et surcote, plafonnée au dernier traitement', () => {
    const trimestresLiquidables = 180;
    const taux = tauxProratisation(trimestresLiquidables, trimestresRequis);
    const pensionCalculee = pensionBaseFonctionPublique(tib, taux, 0);
    const mg = minimumGaranti(trimestresLiquidables, trimestresRequis, VALEUR_REFERENCE_MIGA_ANNUELLE_2025);
    const pensionApresMiga = pensionFonctionPubliqueFinale(pensionCalculee, mg);

    const surcoteTotalePct = surcoteTotale(
      surcotePourTrimestresCotises(4, true, true),
      surcoteParentale(true, true, true, 4),
      false
    ); // 5 %
    const pensionApresSurcote = pensionApresMiga + pensionCalculee * (surcoteTotalePct / 100);

    const majorationPct = majorationEnfantsFonctionPublique(4); // 15 %
    const pensionFinale = pensionFonctionPubliqueAvecMajorationEnfants(pensionApresSurcote, majorationPct, tib);

    const pensionSansPlafond = pensionApresSurcote * 1.15;
    if (pensionSansPlafond > tib) {
      expect(pensionFinale).toBe(tib); // écrêtée
    } else {
      expect(pensionFinale).toBeCloseTo(pensionSansPlafond, 6);
    }

    // Régression à ne jamais réintroduire : majoration assise sur la pension
    // calculée brute, avant MIGA et surcote.
    const pensionIncorrecte = pensionFonctionPubliqueAvecMajorationEnfants(
      pensionCalculee,
      majorationPct,
      tib
    );
    expect(pensionIncorrecte).not.toBeCloseTo(pensionFinale, 6);
  });
});
