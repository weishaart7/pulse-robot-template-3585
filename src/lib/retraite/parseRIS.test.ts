import { describe, it, expect, vi } from 'vitest';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';

// pdfjs-dist (import top-level de parseRIS.ts) référence `DOMMatrix`, absent
// de l'environnement `node` de vitest.config.ts (pas de DOM) — cf.
// docs/audit/audit-import-ris.md (absence de tests sur ce module avant cette
// session, précisément à cause de cet import). On ne teste ici que les
// fonctions pures exportées (parseRegimesDepuisTexte,
// parseDetailCarriereDepuisTexte, reconstruireLignes), qui n'utilisent
// jamais pdfjs-dist elles-mêmes : le stub évite le crash au chargement du
// module sans avoir besoin d'un vrai environnement DOM/jsdom.
vi.mock('pdfjs-dist', () => ({ GlobalWorkerOptions: {}, getDocument: vi.fn() }));
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: '' }));

const { parseRegimesDepuisTexte, parseDetailCarriereDepuisTexte, reconstruireLignes } = await import('./parseRIS');

/**
 * Cas de test synthétiques (texte brut / items pdf.js fabriqués), sans PDF
 * réel — couvre ce que les deux échantillons réels disponibles dans
 * exemples/ (non commités, RGPD) ne peuvent pas tester : un régime spécial
 * jamais observé dans un échantillon réel, et une carrière démarrant avant
 * 1989. Cf. docs/audit/audit-import-ris.md pour le détail des 4 correctifs
 * couverts ici.
 */

// Fabrique un TextItem minimal pour reconstruireLignes() (seuls `str` et
// `transform[5]` — l'ordonnée — sont lus).
function item(str: string, y: number, x = 0): TextItem {
  return { str, transform: [1, 0, 0, 1, x, y] } as unknown as TextItem;
}

describe('parserRevenu (via parseDetailCarriereDepuisTexte) — conversion francs→euros', () => {
  it('convertit un montant FRF au taux officiel 6,55957, arrondi au centime', () => {
    const periodes = parseDetailCarriereDepuisTexte([
      'TITANE MOTOR',
      '01/01/1997 31/12/1997 92 251 FRF L’Assurance retraite, Agirc-Arrco',
    ]);
    expect(periodes).toHaveLength(1);
    // 92 251 / 6,55957 = 14 063,566... → 14 063,57
    expect(periodes[0].revenu).toBeCloseTo(14063.57, 2);
    expect(periodes[0].deviseOrigine).toBe('FRF');
    expect(periodes[0].regimes).toEqual(["L’Assurance retraite", 'Agirc-Arrco']);
  });

  it('ne convertit pas un montant déjà en euros', () => {
    const periodes = parseDetailCarriereDepuisTexte([
      'TITANE MOTOR',
      '01/01/2003 31/12/2003 15 389 € L’Assurance retraite',
    ]);
    expect(periodes[0].revenu).toBe(15389);
    expect(periodes[0].deviseOrigine).toBe('EUR');
  });

  it('reconnaît une notation franc alternative ("F" seul) sans confondre avec le texte suivant', () => {
    const periodes = parseDetailCarriereDepuisTexte(['EMPLOYEUR ANCIEN', '01/01/1975 31/12/1975 4000 F L’Assurance retraite']);
    expect(periodes[0].deviseOrigine).toBe('FRF');
    expect(periodes[0].revenu).toBeCloseTo(609.8, 1); // 4000 / 6,55957 ≈ 609,80
    expect(periodes[0].regimes).toEqual(["L’Assurance retraite"]);
  });

  it('une ligne de continuation sans régime propre hérite du régime du bloc, pas du texte franc précédent (non-régression cascade §3)', () => {
    // Reproduit la structure réelle observée : un employeur avec un premier
    // revenu en francs (régime explicite), puis des lignes de continuation
    // en euros sans texte de régime propre — le champ `regimes` de CES
    // lignes ne doit jamais se retrouver pollué par le montant franc d'une
    // ligne antérieure (cause racine du problème #3, cf. audit).
    const periodes = parseDetailCarriereDepuisTexte([
      'TITANE MOTOR',
      '01/01/2001 31/12/2001 148 974 FRF',
      '01/01/2003 31/12/2003 15 389 €',
    ]);
    expect(periodes).toHaveLength(2);
    expect(periodes[0].regimes).toEqual([]); // pas de régime sur cette ligne dans ce fixture
    expect(periodes[1].regimes).toEqual([]); // et surtout pas "148 974 FRF"
    expect(periodes[1].revenu).toBe(15389);
  });
});

describe('parseDetailCarriereDepuisTexte — carrière démarrant avant 1989 (non couvert par les échantillons réels)', () => {
  it('parse une carrière débutant en 1962 (montant en francs, avant la naissance du RIS informatisé)', () => {
    const periodes = parseDetailCarriereDepuisTexte([
      'PREMIER EMPLOYEUR',
      '01/01/1962 31/12/1962 3500 FRF L’Assurance retraite',
      'DEUXIEME EMPLOYEUR',
      '01/01/1963 31/12/1963 3800 FRF L’Assurance retraite',
    ]);
    expect(periodes).toHaveLength(2);
    expect(periodes[0].dateDebut).toBe('1962-01-01');
    expect(periodes[0].deviseOrigine).toBe('FRF');
    expect(periodes[0].revenu).toBeCloseTo(533.58, 1); // 3500 / 6,55957
    expect(periodes[1].dateDebut).toBe('1963-01-01');
  });
});

describe('parseRegimesDepuisTexte — liste blanche des régimes (mise en page à 2 colonnes)', () => {
  it('reconnaît un régime spécial jamais observé dans les échantillons réels (SNCF)', () => {
    const regimes = parseRegimesDepuisTexte([
      'CPRP SNCF',
      'Total des trimestres',
      'Cheminots',
      '80',
      'Salarié : 80',
    ]);
    expect(regimes).toEqual([{ nom: 'CPRP SNCF', type: 'trimestres', trimestres: 80 }]);
  });

  it('reconnaît une caisse de profession libérale jamais observée (CARMF)', () => {
    const regimes = parseRegimesDepuisTexte(['CARMF', 'Total des points', '1500']);
    expect(regimes[0]).toMatchObject({ nom: 'CARMF', type: 'points', points: 1500 });
  });

  it('ne confond plus un fragment de texte descriptif de la colonne voisine avec un nom de régime (non-régression §4)', () => {
    // Reproduit la structure réelle observée : la ligne descriptive
    // "artistes-auteurs" (fragment de la colonne de droite) ne doit plus
    // être prise pour le nom du régime de points qui suit — repli honnête
    // sur 'Régime non identifié' plutôt qu'un nom plausible mais faux.
    const regimes = parseRegimesDepuisTexte([
      'L’Assurance retraite',
      'Total des trimestres',
      'Salariés, travailleurs indépendants,',
      '117',
      'contractuels de droit public et',
      'artistes-auteurs',
      'Total des points',
      '0',
    ]);
    const pointsRegime = regimes.find((r) => r.type === 'points');
    expect(pointsRegime?.nom).toBe('Régime non identifié');
    expect(pointsRegime?.nom).not.toBe('artistes-auteurs');
  });
});

describe('reconstruireLignes — collision de coordonnée Y avec un artefact de page (non-régression §2/§4)', () => {
  it("retire l'item de code document avant regroupement, au lieu de le laisser polluer la ligne de contenu", () => {
    const items = [
      // Le code document et "Agirc-Arrco" atterrissent, par coïncidence,
      // sur la même ordonnée arrondie — cas observé sur un relevé dense réel.
      item('DAICRISE01V03 12345678', 495, 19),
      item('Agirc-Arrco', 495, 150),
    ];
    expect(reconstruireLignes(items)).toEqual(['Agirc-Arrco']);
  });

  it("retire l'item de code document même quand il collisionne avec une ligne de données (la ligne reste exploitable par la regex de données)", () => {
    const items = [
      item('DAICRISE01V03 12345678', 495, 19),
      item('01/01/2002', 495, 183),
      item('31/12/2002', 495, 239),
      item('10 405 €', 495, 294),
    ];
    expect(reconstruireLignes(items)).toEqual(['01/01/2002 31/12/2002 10 405 €']);
  });

  it('retire le bandeau de pagination ("Edité le ...") en collision', () => {
    const items = [item('Edité le 13/08/2026 6 / 8', 100, 10), item('Ligne utile', 100, 200)];
    expect(reconstruireLignes(items)).toEqual(['Ligne utile']);
  });
});
