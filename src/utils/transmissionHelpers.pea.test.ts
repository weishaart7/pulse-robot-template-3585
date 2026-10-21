/**
 * PEA / PEA-PME : titulaire unique, valeur éventuellement commune. Le plan n'est clôturé
 * que par le décès de son titulaire ; un PEA commun détenu par le conjoint survivant
 * n'entre dans la succession que pour la moitié de sa valeur, sans clôture.
 */
import { describe, it, expect } from 'vitest';
import { computeTransmission, TransmissionParams } from '@/lib/transmission';
import { buildPatrimonySnapshot, buildFamilyGraph } from './transmissionHelpers';
import transmissionParamsData from '@/data/transmission-params.json';

const params: TransmissionParams = {
  abattements: { ...transmissionParamsData.abattements, conjoint: Infinity } as TransmissionParams['abattements'],
  bareme: transmissionParamsData.bareme,
  prelevement990I: transmissionParamsData.prelevement990I,
  debours: transmissionParamsData.debours as TransmissionParams['debours']
};

const REF = '2026-10-21';
const REGIME = 'Communauté réduite aux acquêts';
const familyProfile = { id: 'fp', civility: 'M.', nom: 'Test', prenom: 'Paul', date_naissance: '1972-03-15' };
const maritalStatus = {
  statut_couple: 'Marié(e)', regime_matrimonial: REGIME, option_conjoint: 'usufruit_total',
  civilite_conjoint: 'Mme', nom_conjoint: 'Test', prenom_conjoint: 'Claire', date_naissance_conjoint: '1973-06-10'
};
const familyLinks = [{
  id: 'enfant-hugo', lien_familial: 'Enfant', nom: 'Test', prenom: 'Hugo', date_naissance: '2002-09-01',
  parent_de: 'both_parents', enfant_de: 'both_parents', enfant_adopte: 'Non'
}];

const pea = (id: string, nature: string, detenteur: 'user' | 'spouse', qualification_bien: string) => ({
  id, nature, denomination: id, mode_detention: 'Pleine propriété', valeur_estimee: 100000, detenteur, qualification_bien
});

function explications(assets: ReturnType<typeof pea>[]) {
  const family = buildFamilyGraph(familyProfile as never, maritalStatus as never, familyLinks as never);
  const result = computeTransmission({
    family, patrimony: buildPatrimonySnapshot(assets as never, []), liberalites: [], params,
    conjointOption: 'usufruit_total', referenceDate: REF, rawAssets: assets as never, regimeMatrimonial: REGIME
  });
  return (result.explicationsTexte || []).join('\n');
}

describe('PEA au décès', () => {
  it('clôture le PEA (commun ou propre) dont le défunt est titulaire', () => {
    const texte = explications([pea('PEA Paul', 'PEA', 'user', 'Bien commun'), pea('PME Paul', 'PEA-PME', 'user', 'Bien propre')]);
    expect(texte).toContain('PEA Paul, PME Paul : le plan est clôturé par le décès');
  });

  it("ne clôture pas un PEA commun dont le conjoint survivant est titulaire : moitié de la valeur en succession", () => {
    const texte = explications([pea('PEA Claire', 'PEA', 'spouse', 'Bien commun')]);
    expect(texte).toContain("PEA Claire : plan commun dont le conjoint survivant est titulaire. Il n'est pas clôturé");
    expect(texte).not.toContain('le plan est clôturé par le décès');
  });

  it('ignore un PEA propre du conjoint survivant (hors succession)', () => {
    const texte = explications([pea('PEA Claire', 'PEA', 'spouse', 'Bien propre')]);
    expect(texte).not.toContain('PEA Claire');
  });
});
