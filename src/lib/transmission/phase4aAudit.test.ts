/**
 * Phase 4a de l'audit Transmission (2026-09) : passif pondéré comme l'actif
 * du même régime, au 1er comme au 2nd décès (dette commune à 50 %, dette
 * propre selon son détenteur).
 */
import { describe, it, expect } from 'vitest';
import {
  buildPatrimonySnapshot,
  buildSpouseOwnBasePatrimony,
  PassifLine
} from '../../utils/transmissionHelpers';

const empruntCommun: PassifLine = { montant_du: 100000, qualification_bien: 'Bien commun' };
const dettePropreUser: PassifLine = { montant_du: 40000, qualification_bien: 'Bien propre', detenteur: 'Utilisateur' };
const dettePropreConjoint: PassifLine = { montant_du: 30000, qualification_bien: 'Bien propre', detenteur: 'Conjoint' };
const detteNonQualifiee: PassifLine = { montant_du: 10000 };

describe('Phase 4a — passif pondéré par régime', () => {
  it('emprunt commun de 100 k€ : 50 k€ au 1er décès, 50 k€ côté conjoint', () => {
    expect(buildPatrimonySnapshot([], [empruntCommun]).passifs).toBe(50000);
    expect(buildSpouseOwnBasePatrimony([], [empruntCommun]).passifs).toBe(50000);
  });

  it('dette propre du défunt : absente du patrimoine du conjoint, et inversement', () => {
    expect(buildSpouseOwnBasePatrimony([], [dettePropreUser]).passifs).toBe(0);
    expect(buildSpouseOwnBasePatrimony([], [dettePropreConjoint]).passifs).toBe(30000);
    expect(buildPatrimonySnapshot([], [dettePropreConjoint]).passifs).toBe(0);
  });

  it('dette sans qualification : toujours déduite à 100 %, des deux côtés', () => {
    expect(buildPatrimonySnapshot([], [detteNonQualifiee]).passifs).toBe(10000);
    expect(buildSpouseOwnBasePatrimony([], [detteNonQualifiee]).passifs).toBe(10000);
  });
});
