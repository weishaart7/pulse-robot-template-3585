/**
 * Chaînage 2nd décès (réunion d'usufruit, art. 1133 CGI, sans taxation) —
 * rejoue le cas-test chiffré de l'étude Imeris Patrimoine (couple marié
 * régime légal, 2 enfants communs, conjoint survivant opte pour la totalité
 * en usufruit, aucune donation au dernier vivant).
 *
 * Écart connu et assumé sur les droits de succession du 2nd décès (≈300€,
 * cf. tests ci-dessous) : notre moteur impute le forfait de frais funéraires
 * (1 500€, art. 775 CGI, dmtg/beneficiary.ts) sur la base taxable avant
 * abattement — le tableau "Part nette taxable" de l'étude Imeris n'applique
 * pas cette déduction (321 785€ → 221 785€ net d'abattement dans le
 * document, sans les 750€/héritier de frais funéraires que notre moteur
 * retranche). Même nature de divergence méthodologique déjà documentée dans
 * goldenScenarios.test.ts (TOLERANCE) — pas un bug de ce chantier.
 */
import { describe, it, expect } from 'vitest';
import {
  computeChainedTransmission,
  FamilyGraph,
  PatrimonySnapshot,
  TransmissionParams
} from './index';
import transmissionParamsData from '../../data/transmission-params.json';

function buildParams(): TransmissionParams {
  return {
    abattements: {
      ...transmissionParamsData.abattements,
      conjoint: transmissionParamsData.abattements.conjoint === 'Infinity' ? Infinity : Number(transmissionParamsData.abattements.conjoint)
    },
    bareme: transmissionParamsData.bareme,
    prelevement990I: transmissionParamsData.prelevement990I
  };
}

describe('computeChainedTransmission — cas-test Imeris Patrimoine (Titouan/Julie TEST)', () => {
  describe('Ordre Titouan d\'abord', () => {
    // 1er décès : Titouan, régime légal, 2 enfants communs (Romy, Austin),
    // Julie (25 ans au 20/07/2026) opte pour la totalité en usufruit — mêmes
    // valeurs que l'étude Imeris (masse successorale 394 000€, pages 6/13/15).
    const familyTitouan: FamilyGraph = {
      persons: [
        { id: 'titouan', nom: 'TEST', prenom: 'Titouan' },
        { id: 'julie', nom: 'TEST', prenom: 'Julie', lienFamilial: 'Conjoint', dateNaissance: '2000-09-25' },
        { id: 'romy', nom: 'TEST', prenom: 'Romy', lienFamilial: 'Enfant' },
        { id: 'austin', nom: 'TEST', prenom: 'Austin', lienFamilial: 'Enfant' }
      ],
      links: [
        { from: 'titouan', to: 'romy', relation: 'child' },
        { from: 'titouan', to: 'austin', relation: 'child' }
      ],
      marriages: [{ spouseA: 'titouan', spouseB: 'julie', regime: 'communauté légale' }],
      decedentId: 'titouan',
      hasSurvivingSpouse: true,
      survivingSpouseId: 'julie',
      childrenOfDecedent: ['romy', 'austin'],
      childrenCommonWithSpouse: ['romy', 'austin'],
      hasDDV: false
    };
    const patrimonyTitouan: PatrimonySnapshot = { date: '2026-07-20', biensExistants: 394000, passifs: 0, assuranceVieTotal: 0 };
    const rawAssetsTitouan = [
      { id: 'a1', denomination: 'Patrimoine de Titouan', valeur_estimee: 394000, nature: 'valeur_mobiliere', qualification_bien: 'Bien personnel' }
    ];

    // 2nd décès : patrimoine PROPRE de Julie (sa moitié de communauté déjà en
    // pleine propriété), SANS l'usufruit réuni — construit à la main ici
    // (pas via buildSurvivingSpousePatrimony, qui a sa propre couverture
    // ailleurs) mais représentatif de ce que produirait cette fonction :
    // valeur ronde choisie pour retomber exactement sur la masse fiscale de
    // référence (643 570€, page 25 de l'étude), sans lien arithmétique avec
    // patrimonyTitouan ci-dessus — c'est précisément le point de la décision
    // actée (Option 1) : le patrimoine propre du conjoint n'est jamais
    // dérivé du résultat du 1er décès, seule la réunion d'usufruit l'est.
    const familyJulieVeuve: FamilyGraph = {
      persons: [
        { id: 'julie', nom: 'TEST', prenom: 'Julie' },
        { id: 'romy', nom: 'TEST', prenom: 'Romy', lienFamilial: 'Enfant' },
        { id: 'austin', nom: 'TEST', prenom: 'Austin', lienFamilial: 'Enfant' }
      ],
      links: [
        { from: 'julie', to: 'romy', relation: 'child' },
        { from: 'julie', to: 'austin', relation: 'child' }
      ],
      marriages: [],
      decedentId: 'julie',
      hasSurvivingSpouse: false,
      childrenOfDecedent: ['romy', 'austin'],
      childrenCommonWithSpouse: [],
      hasDDV: false
    };
    const patrimonyJulieVeuve: PatrimonySnapshot = { date: '2026-07-20', biensExistants: 643570, passifs: 0, assuranceVieTotal: 0 };
    const rawAssetsJulieVeuve = [
      { id: 'a2', denomination: 'Patrimoine propre de Julie', valeur_estimee: 643570, nature: 'valeur_mobiliere', qualification_bien: 'Bien personnel' }
    ];

    const result = computeChainedTransmission({
      firstDeath: {
        family: familyTitouan,
        patrimony: patrimonyTitouan,
        liberalites: [],
        params: buildParams(),
        conjointOption: 'usufruit_total',
        referenceDate: '2026-07-20',
        rawAssets: rawAssetsTitouan
      },
      secondDeath: {
        family: familyJulieVeuve,
        patrimony: patrimonyJulieVeuve,
        liberalites: [],
        params: buildParams(),
        referenceDate: '2026-07-20',
        rawAssets: rawAssetsJulieVeuve
      }
    });

    it('1er décès (Titouan) : Julie usufruit 315 200€ (80% à 25 ans), Romy/Austin nue-propriété 39 400€ chacun, 0€ de droits (conjoint + abattement enfant)', () => {
      const julie = result.firstDeath.heirs.find(h => h.personId === 'julie')!;
      const romy = result.firstDeath.heirs.find(h => h.personId === 'romy')!;
      const austin = result.firstDeath.heirs.find(h => h.personId === 'austin')!;
      expect(julie.partFinale).toBeCloseTo(315200, 0);
      expect(romy.partFinale).toBeCloseTo(39400, 0);
      expect(austin.partFinale).toBeCloseTo(39400, 0);
      expect(result.firstDeath.dmtg.totals.droitsTotaux).toBe(0);
    });

    it('2nd décès (Julie) : masse fiscale 643 570€ (patrimoine propre seul, sans l\'usufruit réuni)', () => {
      expect(result.secondDeath.masseCalcul).toBeCloseTo(643570, 0);
    });

    it('2nd décès (Julie) : droits de succession ≈85 103€ (écart ≈300€ vs Imeris dû au forfait de frais funéraires, cf. en-tête du fichier)', () => {
      // Valeur produite par notre moteur (forfait frais funéraires art. 775
      // CGI inclus) — volontairement pas toBe(85103), cf. en-tête du fichier.
      expect(result.secondDeath.dmtg.totals.droitsTotaux).toBeCloseTo(84802, 0);
      expect(Math.abs(result.secondDeath.dmtg.totals.droitsTotaux - 85103)).toBeLessThan(500);
    });

    it('réunion d\'usufruit : 315 200€ au total, répartis 157 600€ chacun entre Romy et Austin (nu-propriétaires du 1er décès), hors taxation', () => {
      expect(result.reunionUsufruit.total).toBeCloseTo(315200, 0);
      const partRomy = result.reunionUsufruit.parNuProprietaire.find(r => r.personId === 'romy')!;
      const partAustin = result.reunionUsufruit.parNuProprietaire.find(r => r.personId === 'austin')!;
      expect(partRomy.montant).toBeCloseTo(157600, 0);
      expect(partAustin.montant).toBeCloseTo(157600, 0);

      // Hors taxation : la réunion ne modifie jamais les droits du 2nd décès,
      // déjà vérifiés ci-dessus indépendamment de ce montant.
      expect(result.secondDeath.dmtg.totals.droitsTotaux).toBeLessThan(90000);
    });

    it('transmission nette combinée : Romy et Austin reçoivent leur héritage net du 2nd décès + leur part de réunion', () => {
      const romyNetSeul = result.secondDeath.netBreakdown.heirs.find(h => h.personId === 'romy')!.netARecevoir;
      const romyCombinee = result.transmissionNetteCombinee.find(r => r.personId === 'romy')!.montant;
      const partReunionRomy = result.reunionUsufruit.parNuProprietaire.find(r => r.personId === 'romy')!.montant;

      expect(romyCombinee).toBeCloseTo(romyNetSeul + partReunionRomy, 0);
    });
  });

  describe('Ordre inversé — Julie d\'abord', () => {
    // 1er décès : Julie, mêmes enfants communs, Titouan (26 ans) opte pour
    // la totalité en usufruit — valeurs propres à ce test (pas besoin de
    // reproduire l'intégralité du détail Imeris de l'ordre inversé, dont
    // l'attribution exacte du passif de 1 500€ entre les deux ordres n'est
    // pas spécifiée par ce chantier, cf. résumé remis à l'utilisateur).
    const familyJulie: FamilyGraph = {
      persons: [
        { id: 'julie', nom: 'TEST', prenom: 'Julie' },
        { id: 'titouan', nom: 'TEST', prenom: 'Titouan', lienFamilial: 'Conjoint', dateNaissance: '2000-02-07' },
        { id: 'romy', nom: 'TEST', prenom: 'Romy', lienFamilial: 'Enfant' },
        { id: 'austin', nom: 'TEST', prenom: 'Austin', lienFamilial: 'Enfant' }
      ],
      links: [
        { from: 'julie', to: 'romy', relation: 'child' },
        { from: 'julie', to: 'austin', relation: 'child' }
      ],
      marriages: [{ spouseA: 'julie', spouseB: 'titouan', regime: 'communauté légale' }],
      decedentId: 'julie',
      hasSurvivingSpouse: true,
      survivingSpouseId: 'titouan',
      childrenOfDecedent: ['romy', 'austin'],
      childrenCommonWithSpouse: ['romy', 'austin'],
      hasDDV: false
    };
    const patrimonyJulie: PatrimonySnapshot = { date: '2026-07-20', biensExistants: 382000, passifs: 0, assuranceVieTotal: 0 };
    const rawAssetsJulie = [
      { id: 'a1', denomination: 'Patrimoine de Julie', valeur_estimee: 382000, nature: 'valeur_mobiliere', qualification_bien: 'Bien personnel' }
    ];

    // 2nd décès : patrimoine propre de Titouan, valeur choisie pour retomber
    // exactement sur la masse fiscale de référence (386 183€, page 7 de
    // l'étude, tableau "ordre inversé") — même logique que le test
    // précédent (Option 1 : jamais dérivé du 1er décès).
    const familyTitouanVeuf: FamilyGraph = {
      persons: [
        { id: 'titouan', nom: 'TEST', prenom: 'Titouan' },
        { id: 'romy', nom: 'TEST', prenom: 'Romy', lienFamilial: 'Enfant' },
        { id: 'austin', nom: 'TEST', prenom: 'Austin', lienFamilial: 'Enfant' }
      ],
      links: [
        { from: 'titouan', to: 'romy', relation: 'child' },
        { from: 'titouan', to: 'austin', relation: 'child' }
      ],
      marriages: [],
      decedentId: 'titouan',
      hasSurvivingSpouse: false,
      childrenOfDecedent: ['romy', 'austin'],
      childrenCommonWithSpouse: [],
      hasDDV: false
    };
    const patrimonyTitouanVeuf: PatrimonySnapshot = { date: '2026-07-20', biensExistants: 386183, passifs: 0, assuranceVieTotal: 0 };
    const rawAssetsTitouanVeuf = [
      { id: 'a2', denomination: 'Patrimoine propre de Titouan', valeur_estimee: 386183, nature: 'valeur_mobiliere', qualification_bien: 'Bien personnel' }
    ];

    const result = computeChainedTransmission({
      firstDeath: {
        family: familyJulie,
        patrimony: patrimonyJulie,
        liberalites: [],
        params: buildParams(),
        conjointOption: 'usufruit_total',
        referenceDate: '2026-07-20',
        rawAssets: rawAssetsJulie
      },
      secondDeath: {
        family: familyTitouanVeuf,
        patrimony: patrimonyTitouanVeuf,
        liberalites: [],
        params: buildParams(),
        referenceDate: '2026-07-20',
        rawAssets: rawAssetsTitouanVeuf
      }
    });

    it('2nd décès (Titouan) : masse fiscale 386 183€', () => {
      expect(result.secondDeath.masseCalcul).toBeCloseTo(386183, 0);
    });

    it('2nd décès (Titouan) : droits de succession ≈33 625€ (même écart méthodologique que l\'ordre normal, cf. en-tête du fichier)', () => {
      expect(Math.abs(result.secondDeath.dmtg.totals.droitsTotaux - 33625)).toBeLessThan(500);
    });

    it('le même chemin de code (computeChainedTransmission) produit les deux ordres — aucune fonction dédiée à "Julie d\'abord"', () => {
      // Preuve par construction : ce describe entier n'appelle que
      // computeChainedTransmission, la même fonction que le describe
      // précédent, avec firstDeath/secondDeath simplement inversés.
      expect(result.firstDeath.family.decedentId).toBe('julie');
      expect(result.secondDeath.family.decedentId).toBe('titouan');
    });
  });

  describe('Famille recomposée — enfant non commun du conjoint survivant (pas du 1er défunt)', () => {
    // Hypothèses explicites de ce scénario construit pour ce test :
    // - 1er décès (Titouan) : Romy et Austin sont ses SEULS enfants, tous
    //   deux communs avec Julie → l'option usufruit total reste disponible
    //   (art. 757, tousCommuns=true côté Titouan), exactement comme le cas
    //   Imeris. La réunion d'usufruit ne porte donc que sur Romy/Austin.
    // - 2nd décès (Julie) : Julie a EN PLUS un enfant issu d'une précédente
    //   union (Chloé), qui n'est pas un enfant de Titouan et n'a donc jamais
    //   été nu-propriétaire d'aucun bien de Titouan au 1er décès. Julie a 3
    //   enfants à son propre décès (Romy, Austin, Chloé) : succession
    //   légale branche B (pas de conjoint), 3 souches à parts égales
    //   (1/3 chacun), Chloé y participe normalement.
    // Ce que ce test vérifie : la réunion d'usufruit (315 200€) va
    // uniquement à Romy/Austin (nu-propriétaires identifiés au 1er décès),
    // JAMAIS à Chloé — même si Chloé est un héritier à part entière de
    // Julie au 2nd décès.
    const familyTitouan: FamilyGraph = {
      persons: [
        { id: 'titouan', nom: 'TEST', prenom: 'Titouan' },
        { id: 'julie', nom: 'TEST', prenom: 'Julie', lienFamilial: 'Conjoint', dateNaissance: '2000-09-25' },
        { id: 'romy', nom: 'TEST', prenom: 'Romy', lienFamilial: 'Enfant' },
        { id: 'austin', nom: 'TEST', prenom: 'Austin', lienFamilial: 'Enfant' }
      ],
      links: [
        { from: 'titouan', to: 'romy', relation: 'child' },
        { from: 'titouan', to: 'austin', relation: 'child' }
      ],
      marriages: [{ spouseA: 'titouan', spouseB: 'julie', regime: 'communauté légale' }],
      decedentId: 'titouan',
      hasSurvivingSpouse: true,
      survivingSpouseId: 'julie',
      childrenOfDecedent: ['romy', 'austin'],
      childrenCommonWithSpouse: ['romy', 'austin'],
      hasDDV: false
    };
    const patrimonyTitouan: PatrimonySnapshot = { date: '2026-07-20', biensExistants: 394000, passifs: 0, assuranceVieTotal: 0 };
    const rawAssetsTitouan = [
      { id: 'a1', denomination: 'Patrimoine de Titouan', valeur_estimee: 394000, nature: 'valeur_mobiliere', qualification_bien: 'Bien personnel' }
    ];

    const familyJulieAvecChloe: FamilyGraph = {
      persons: [
        { id: 'julie', nom: 'TEST', prenom: 'Julie' },
        { id: 'romy', nom: 'TEST', prenom: 'Romy', lienFamilial: 'Enfant' },
        { id: 'austin', nom: 'TEST', prenom: 'Austin', lienFamilial: 'Enfant' },
        { id: 'chloe', nom: 'PREVIOUS', prenom: 'Chloé', lienFamilial: 'Enfant' }
      ],
      links: [
        { from: 'julie', to: 'romy', relation: 'child' },
        { from: 'julie', to: 'austin', relation: 'child' },
        { from: 'julie', to: 'chloe', relation: 'child' }
      ],
      marriages: [],
      decedentId: 'julie',
      hasSurvivingSpouse: false,
      childrenOfDecedent: ['romy', 'austin', 'chloe'],
      childrenCommonWithSpouse: [],
      hasDDV: false
    };
    // Patrimoine propre de Julie : valeur ronde, sans lien avec le cas
    // Imeris (ce scénario n'est pas une reproduction chiffrée de l'étude,
    // seulement une vérification de la règle d'attribution de la réunion).
    const patrimonyJulieAvecChloe: PatrimonySnapshot = { date: '2026-07-20', biensExistants: 600000, passifs: 0, assuranceVieTotal: 0 };
    const rawAssetsJulieAvecChloe = [
      { id: 'a2', denomination: 'Patrimoine propre de Julie', valeur_estimee: 600000, nature: 'valeur_mobiliere', qualification_bien: 'Bien personnel' }
    ];

    const result = computeChainedTransmission({
      firstDeath: {
        family: familyTitouan,
        patrimony: patrimonyTitouan,
        liberalites: [],
        params: buildParams(),
        conjointOption: 'usufruit_total',
        referenceDate: '2026-07-20',
        rawAssets: rawAssetsTitouan
      },
      secondDeath: {
        family: familyJulieAvecChloe,
        patrimony: patrimonyJulieAvecChloe,
        liberalites: [],
        params: buildParams(),
        referenceDate: '2026-07-20',
        rawAssets: rawAssetsJulieAvecChloe
      }
    });

    it('2nd décès (Julie) : 3 enfants à parts égales (1/3 chacun), Chloé incluse normalement', () => {
      const chloe = result.secondDeath.heirs.find(h => h.personId === 'chloe')!;
      const romy = result.secondDeath.heirs.find(h => h.personId === 'romy')!;
      expect(chloe.partFinale).toBeCloseTo(600000 / 3, 0);
      expect(romy.partFinale).toBeCloseTo(600000 / 3, 0);
    });

    it('réunion d\'usufruit : uniquement Romy et Austin (nu-propriétaires du 1er décès), jamais Chloé', () => {
      const beneficiaires = result.reunionUsufruit.parNuProprietaire.map(r => r.personId).sort();
      expect(beneficiaires).toEqual(['austin', 'romy']);
      expect(result.reunionUsufruit.parNuProprietaire.some(r => r.personId === 'chloe')).toBe(false);
    });

    it('transmission nette combinée : Chloé n\'a que son héritage propre (pas de réunion), Romy/Austin ont héritage + réunion', () => {
      const chloeCombinee = result.transmissionNetteCombinee.find(r => r.personId === 'chloe')!.montant;
      const chloeNetSeul = result.secondDeath.netBreakdown.heirs.find(h => h.personId === 'chloe')!.netARecevoir;
      expect(chloeCombinee).toBeCloseTo(chloeNetSeul, 0);

      const romyCombinee = result.transmissionNetteCombinee.find(r => r.personId === 'romy')!.montant;
      const romyNetSeul = result.secondDeath.netBreakdown.heirs.find(h => h.personId === 'romy')!.netARecevoir;
      expect(romyCombinee).toBeGreaterThan(romyNetSeul);
    });
  });
});
