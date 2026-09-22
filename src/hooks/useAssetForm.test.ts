// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act, cleanup } from '@testing-library/react';
import { useAssetForm } from './useAssetForm';

vi.mock('@/services/familyService', () => ({
  familyService: {
    getFamilyProfile: vi.fn().mockResolvedValue({ prenom: 'Titouan', date_naissance: '1990-01-01' }),
    getMaritalStatus: vi.fn().mockResolvedValue({
      statut_couple: 'Marié(e)',
      prenom_conjoint: 'Alex',
      regime_matrimonial: 'Communauté réduite aux acquêts',
      date_mariage: '2015-06-01',
      clauses_contrat: {},
    }),
    getFamilyLinks: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/services/assetIndivisaireService', () => ({
  assetIndivisaireService: { getByAsset: vi.fn().mockResolvedValue([]) },
}));

vi.mock('@/services/assetDemembrementService', () => ({
  assetDemembrementService: { getByAsset: vi.fn().mockResolvedValue([]) },
}));

afterEach(() => cleanup());

describe('useAssetForm — cohérence détenteur / qualification (régime légal)', () => {
  it('force le détenteur à "Le couple" (50/50) quand un détenteur individuel est choisi sur un bien qui reste "Bien commun"', async () => {
    const { result } = renderHook(() => useAssetForm({ onSubmit: vi.fn() }));

    await waitFor(() => expect(result.current.maritalContext.statutCouple).toBe('Marié(e)'));

    act(() => {
      result.current.form.setValue('nature', 'Compte bancaire');
      result.current.form.setValue('origine_actif', ['Acquisition à titre onéreux']);
      result.current.form.setValue('date_acquisition', new Date('2020-01-01'));
    });

    await waitFor(() => expect(result.current.form.getValues('qualification_bien')).toBe('Bien commun'));

    // Sous régime légal, le détenteur n'entre pas dans qualifierBien() : le
    // choisir seul ne provoque aucune transition de qualification — c'est
    // exactement le cas rapporté où le garde-fou basé sur une transition ne
    // se déclenchait pas.
    act(() => {
      result.current.form.setValue('detenteur', 'Titouan', { shouldDirty: true });
    });
    // Déclenche manuellement l'événement watch (setValue seul ne le fait pas dans ce test) :
    act(() => {
      result.current.form.trigger('detenteur');
    });

    await waitFor(() => {
      expect(result.current.form.getValues('qualification_bien')).toBe('Bien commun');
      expect(result.current.form.getValues('detenteur')).toBe('Le couple');
      expect(result.current.form.getValues('pourcentage_utilisateur')).toBe(50);
      expect(result.current.form.getValues('pourcentage_conjoint')).toBe(50);
    });
  });
});
