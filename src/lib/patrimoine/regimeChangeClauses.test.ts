import { describe, it, expect } from 'vitest';
import { toRegimeType, getClausesIncompatibles } from './regimeChangeClauses';
import { ClausesData } from '@/types/matrimonial';

describe('toRegimeType', () => {
  it('mappe chaque libellé humain vers son RegimeType simplifié', () => {
    expect(toRegimeType('Communauté réduite aux acquêts')).toBe('communaute_reduite');
    expect(toRegimeType("Communauté de meubles et d'acquêts")).toBe('communaute_meubles');
    expect(toRegimeType('Communauté universelle')).toBe('communaute_universelle');
    expect(toRegimeType('Séparation de biens')).toBe('separation_biens');
    expect(toRegimeType("Séparation de biens avec société d'acquêts")).toBe('separation_societe_acquets');
    expect(toRegimeType('Participation aux acquêts')).toBe('participation_acquets');
  });
});

describe('getClausesIncompatibles — changement de régime sans clause active incompatible', () => {
  it('aucune clause active → liste vide, quel que soit le régime cible', () => {
    const clauses: ClausesData = {};
    expect(getClausesIncompatibles(clauses, 'participation_acquets')).toEqual([]);
  });

  it('clause active déjà compatible avec le nouveau régime → liste vide', () => {
    // partage_inegal_acquets : compatible avec participation_acquets (cf. CLAUSES_BY_REGIME).
    const clauses: ClausesData = {
      partage_inegal_acquets: { enabled: true },
    };
    expect(getClausesIncompatibles(clauses, 'participation_acquets')).toEqual([]);
  });

  it('clause désactivée (enabled: false) → jamais signalée, même si incompatible avec le nouveau régime', () => {
    const clauses: ClausesData = {
      preciput: { enabled: false, selectedAssets: ['residence'] },
    };
    expect(getClausesIncompatibles(clauses, 'participation_acquets')).toEqual([]);
  });
});

describe('getClausesIncompatibles — changement de régime avec clause(s) active(s) incompatible(s)', () => {
  it("reproduit le scénario du diagnostic : résidu de préciput actif, passage vers participation aux acquêts → signalé avec son libellé", () => {
    const clauses: ClausesData = {
      preciput: { enabled: true, options: { pleineProprietee: true }, selectedAssets: ['residence'] },
    };

    const incompatibles = getClausesIncompatibles(clauses, 'participation_acquets');

    expect(incompatibles).toHaveLength(1);
    expect(incompatibles[0].key).toBe('preciput');
    expect(incompatibles[0].label).toBe('Clause de préciput');
  });

  it('plusieurs clauses actives incompatibles à la fois → toutes signalées', () => {
    const clauses: ClausesData = {
      preciput: { enabled: true, selectedAssets: ['residence'] },
      mise_en_communaute: { enabled: true },
      partage_inegal_acquets: { enabled: true }, // compatible, ne doit pas apparaître
    };

    const incompatibles = getClausesIncompatibles(clauses, 'participation_acquets');
    const keys = incompatibles.map((c) => c.key).sort();

    expect(keys).toEqual(['mise_en_communaute', 'preciput']);
  });

  it("décision validée (option A) : attribution_integrale/partage_inegal actifs sont signalés incompatibles vers participation_acquets (absents de CLAUSES_BY_REGIME.participation_acquets, même si listés dans la matrice légale CLAUSE_REGIME_COMPATIBILITY)", () => {
    const clauses: ClausesData = {
      attribution_integrale: { enabled: true },
      partage_inegal: { enabled: true, partPleineProprietee: 70 },
    };

    const incompatibles = getClausesIncompatibles(clauses, 'participation_acquets');
    const keys = incompatibles.map((c) => c.key).sort();

    expect(keys).toEqual(['attribution_integrale', 'partage_inegal']);
  });
});

describe('getClausesIncompatibles — annulation (le composant ne doit rien persister)', () => {
  it("la fonction est pure : elle ne modifie pas l'objet clausesActuelles passé en entrée (le composant peut donc ignorer son résultat sans effet de bord, cas de l'annulation)", () => {
    const clauses: ClausesData = {
      preciput: { enabled: true, selectedAssets: ['residence'] },
    };
    const clausesAvant = JSON.parse(JSON.stringify(clauses));

    getClausesIncompatibles(clauses, 'participation_acquets');

    expect(clauses).toEqual(clausesAvant);
  });
});
