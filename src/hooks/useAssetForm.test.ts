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

  it('garde le titulaire individuel d\'un PEA commun (pas de « Le couple »)', async () => {
    const { result } = renderHook(() => useAssetForm({ onSubmit: vi.fn() }));
    await waitFor(() => expect(result.current.maritalContext.statutCouple).toBe('Marié(e)'));

    act(() => {
      result.current.form.setValue('nature', 'PEA');
      result.current.form.setValue('origine_actif', ['Acquisition à titre onéreux']);
      result.current.form.setValue('date_acquisition', new Date('2020-01-01'));
    });
    await waitFor(() => expect(result.current.form.getValues('qualification_bien')).toBe('Bien commun'));
    // Création : aucun titulaire proposé d'office (on ne sait pas lequel des deux).
    expect(result.current.form.getValues('detenteur')).toBeFalsy();

    act(() => {
      result.current.form.setValue('detenteur', 'Titouan', { shouldDirty: true });
    });
    act(() => {
      result.current.form.trigger('detenteur');
    });

    await new Promise((r) => setTimeout(r, 20));
    expect(result.current.form.getValues('qualification_bien')).toBe('Bien commun');
    expect(result.current.form.getValues('detenteur')).toBe('Titouan');
  });

  it("FCPR / FPCI : montant appelé = somme des appels, date de souscription = premier appel", async () => {
    const { result } = renderHook(() => useAssetForm({ onSubmit: vi.fn() }));
    await waitFor(() => expect(result.current.maritalContext.statutCouple).toBe('Marié(e)'));

    act(() => {
      result.current.form.setValue('nature', 'Fonds de capital-investissement');
      result.current.form.setValue('type_fonds', 'fcpr_fpci');
    });
    act(() => {
      result.current.form.setValue('mouvements_fonds', [
        { type_mouvement: 'appel', date_mouvement: new Date('2023-05-10'), montant: 20000 },
        { type_mouvement: 'appel', date_mouvement: new Date('2022-03-15'), montant: 30000 },
        { type_mouvement: 'distribution', date_mouvement: new Date('2025-01-10'), montant: 5000 },
      ]);
    });

    await waitFor(() => expect(result.current.form.getValues('valeur_acquisition')).toBe(50000));
    expect(result.current.form.getValues('date_acquisition')).toEqual(new Date('2022-03-15'));
  });

  it("garde le titulaire individuel d'un Livret A commun (pas de « Le couple »)", async () => {
    const { result } = renderHook(() => useAssetForm({ onSubmit: vi.fn() }));
    await waitFor(() => expect(result.current.maritalContext.statutCouple).toBe('Marié(e)'));

    act(() => {
      result.current.form.setValue('nature', 'Livret A');
    });
    await waitFor(() => expect(result.current.form.getValues('qualification_bien')).toBe('Bien commun'));
    act(() => {
      result.current.form.setValue('detenteur', 'Titouan', { shouldDirty: true });
    });
    act(() => {
      result.current.form.trigger('detenteur');
    });

    await new Promise((r) => setTimeout(r, 20));
    expect(result.current.form.getValues('detenteur')).toBe('Titouan');
  });
});
