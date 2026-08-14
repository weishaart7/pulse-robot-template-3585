import { describe, it, expect } from 'vitest';
import { estRegimeSaisieManuelle } from './regimesSaisieManuelle';

describe('estRegimeSaisieManuelle (correction double comptage fonction publique, cf. docs/audit/correction-double-comptage-fp-ris.md)', () => {
  it.each([
    ['CNAVPL', true],
    ['SRE', true],
    ['CNRACL', true],
    ["Service des Retraites de l'État", true],
    ["Service des Retraites de l'Etat", true], // sans accent, tel qu'il peut apparaître après extraction PDF
    ['Caisse Nationale de Retraite des Agents des Collectivités Locales', true],
    ['cnavpl', true], // insensible à la casse
    ['sre', true],
  ])('« %s » est un régime à saisie manuelle (exclu des paniers génériques)', (nom, attendu) => {
    expect(estRegimeSaisieManuelle(nom)).toBe(attendu);
  });

  it.each([
    ["L'Assurance retraite", false],
    ['MSA Salariés', false],
    ['Sécurité Sociale des Indépendants', false],
    ['Agirc-Arrco', false],
    ['RAFP', false], // points fonction publique, panier distinct — hors périmètre de cette correction (trimestres)
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
});
