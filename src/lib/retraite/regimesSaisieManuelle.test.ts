import { describe, it, expect } from 'vitest';
import { estRegimeSaisieManuelle } from './regimesSaisieManuelle';
import type { RegimeDetecte } from './parseRIS';

describe('estRegimeSaisieManuelle (correction double comptage fonction publique, cf. docs/audit/correction-double-comptage-fp-ris.md et écart #16 RAFP, docs/audit/audit-retraite.md)', () => {
  it.each([
    ['CNAVPL', true],
    ['SRE', true],
    ['CNRACL', true],
    ["Service des Retraites de l'État", true],
    ["Service des Retraites de l'Etat", true], // sans accent, tel qu'il peut apparaître après extraction PDF
    ['Caisse Nationale de Retraite des Agents des Collectivités Locales', true],
    ['cnavpl', true], // insensible à la casse
    ['sre', true],
    ['RAFP', true], // écart #16 : panier "points", même principe que SRE/CNRACL pour les trimestres
    ['rafp', true], // insensible à la casse
    ['Retraite Additionnelle de la Fonction Publique (RAFP)', true],
  ])('« %s » est un régime à saisie manuelle (exclu des paniers génériques)', (nom, attendu) => {
    expect(estRegimeSaisieManuelle(nom)).toBe(attendu);
  });

  it.each([
    ["L'Assurance retraite", false],
    ['MSA Salariés', false],
    ['Sécurité Sociale des Indépendants', false],
    ['Agirc-Arrco', false],
  ])('« %s » n\'est pas un régime à saisie manuelle (non-régression)', (nom, attendu) => {
    expect(estRegimeSaisieManuelle(nom)).toBe(attendu);
  });

  it('ne matche pas "sre" comme sous-chaîne d\'un mot non lié (borne \\b)', () => {
    // Garde-fou : "sre" est un sigle très court, non borné il matcherait
    // n'importe quelle sous-chaîne contenant ces 3 lettres consécutives. Mot
    // construit pour verrouiller le comportement de la borne \b (aucun
    // libellé RIS réel ne ressemble à ceci) — sans cette borne, ce test
    // échouerait.
    expect(estRegimeSaisieManuelle('Besreau')).toBe(false);
  });

  it('ne matche pas "rafp" comme sous-chaîne d\'un mot non lié (borne \\b)', () => {
    expect(estRegimeSaisieManuelle('Parafpluie')).toBe(false);
  });

  // Reproduit exactement le filtre appliqué par handleValidateRIS()
  // (Carriere.tsx) : regimesValides.filter(r => !estRegimeSaisieManuelle(r.nom)),
  // puis répartition par r.type. Vérifie le scénario de l'écart #16 : un RIS
  // détectant à la fois un régime "trimestres" fonction publique (SRE) et un
  // régime "points" RAFP ne doit alimenter ni trimestresValides ni
  // regimesPoints pour ces deux blocs — laissant la carte fonction publique
  // dédiée (CarriereFonctionPublique.tsx, trimestres liquidables + points
  // RAFP saisis à la main) seule responsable de ces montants, sans doublon.
  describe('scénario RIS avec fonction publique (SRE) + RAFP + régime général', () => {
    const regimesDetectes: RegimeDetecte[] = [
      { nom: "L'Assurance retraite", type: 'trimestres', trimestres: 120 },
      { nom: 'SRE', type: 'trimestres', trimestres: 80 },
      { nom: 'RAFP', type: 'points', points: 4200, valeurPoint: 0.05671 },
      { nom: 'Agirc-Arrco', type: 'points', points: 15000, valeurPoint: 1.3498 },
    ];
    const regimesHorsSaisieManuelle = regimesDetectes.filter((r) => !estRegimeSaisieManuelle(r.nom));
    const panierTrimestres = regimesHorsSaisieManuelle.filter((r) => r.type === 'trimestres');
    const panierPoints = regimesHorsSaisieManuelle.filter((r) => r.type === 'points');

    it('exclut SRE du panier trimestres régime général (ne conserve que le régime général)', () => {
      expect(panierTrimestres).toEqual([{ nom: "L'Assurance retraite", type: 'trimestres', trimestres: 120 }]);
    });

    it('exclut RAFP du panier regimesPoints (ne conserve que l\'Agirc-Arrco)', () => {
      expect(panierPoints).toEqual([
        { nom: 'Agirc-Arrco', type: 'points', points: 15000, valeurPoint: 1.3498 },
      ]);
    });

    it('ne compte donc le RAFP détecté sur le RIS nulle part dans les paniers génériques (seule la carte fonction publique le porte)', () => {
      expect(panierPoints.some((r) => estRegimeSaisieManuelle(r.nom))).toBe(false);
      expect(panierPoints.find((r) => /rafp/i.test(r.nom))).toBeUndefined();
    });
  });

  it('non-régression : un profil sans fonction publique (RAFP absent du RIS) garde tous ses régimes points génériques inchangés', () => {
    const regimesDetectes: RegimeDetecte[] = [
      { nom: "L'Assurance retraite", type: 'trimestres', trimestres: 168 },
      { nom: 'Agirc-Arrco', type: 'points', points: 20000, valeurPoint: 1.3498 },
    ];
    const regimesHorsSaisieManuelle = regimesDetectes.filter((r) => !estRegimeSaisieManuelle(r.nom));
    expect(regimesHorsSaisieManuelle.filter((r) => r.type === 'points')).toEqual([
      { nom: 'Agirc-Arrco', type: 'points', points: 20000, valeurPoint: 1.3498 },
    ]);
    expect(regimesHorsSaisieManuelle.filter((r) => r.type === 'trimestres')).toEqual([
      { nom: "L'Assurance retraite", type: 'trimestres', trimestres: 168 },
    ]);
  });
});
