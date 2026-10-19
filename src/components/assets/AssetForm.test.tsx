// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssetForm } from './AssetForm';
import type { Asset } from '@/services/assetService';
import { familyService } from '@/services/familyService';

// jsdom ne fournit pas ResizeObserver ; Radix Checkbox (désormais rendu dans
// l'onglet fusionné "Propriété") en a besoin au montage.
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// La sélection de nature passe par un Popover/Command (cmdk) non pertinent
// pour ce test : on le remplace par un simple champ pilotable directement,
// tout en conservant le contrat FormField (value/onChange) qu'exerce le test.
vi.mock('@/components/assets/NaturePicker', () => ({
  NaturePicker: ({ value, onChange, placeholder }: { value?: string; onChange: (v: string) => void; placeholder?: string }) => (
    <input
      aria-label="nature"
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

vi.mock('@/services/familyService', () => ({
  familyService: {
    getFamilyProfile: vi.fn().mockResolvedValue(null),
    getMaritalStatus: vi.fn().mockResolvedValue(null),
    getFamilyLinks: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/services/assetIndivisaireService', () => ({
  assetIndivisaireService: {
    getByAsset: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/services/assetDemembrementService', () => ({
  assetDemembrementService: {
    getByAsset: vi.fn().mockResolvedValue([]),
  },
}));

const NON_ESSENTIEL_TAB_LABELS = ['Propriété', 'Caractéristiques', 'Charges'];

const noop = async () => {};

afterEach(() => cleanup());

describe('AssetForm — verrouillage des onglets', () => {
  it('à la création, verrouille les onglets autres que "Essentiel" tant que la nature est vide, puis les débloque', async () => {
    const user = userEvent.setup();
    render(<AssetForm onSubmit={noop} onCancel={() => {}} />);

    for (const label of NON_ESSENTIEL_TAB_LABELS) {
      const tab = screen.getByRole('button', { name: label });
      expect(tab).toHaveAttribute('aria-disabled', 'true');
    }

    // Cliquer sur un onglet verrouillé ne navigue pas et affiche l'indice.
    await user.click(screen.getByRole('button', { name: 'Propriété' }));
    expect(screen.getByText("Renseignez d'abord la nature de l'actif")).toBeInTheDocument();
    expect(screen.queryByLabelText('Mode de détention')).not.toBeInTheDocument();

    // Renseigner la nature débloque tous les onglets.
    await user.type(screen.getByLabelText('nature'), 'Compte bancaire');

    await waitFor(() => {
      for (const label of NON_ESSENTIEL_TAB_LABELS) {
        expect(screen.getByRole('button', { name: label })).not.toHaveAttribute('aria-disabled', 'true');
      }
    });

    await user.click(screen.getByRole('button', { name: 'Propriété' }));
    expect(await screen.findByText('Mode de détention')).toBeInTheDocument();
  });

  it('en édition, tous les onglets sont cliquables dès le montage', async () => {
    const user = userEvent.setup();
    const asset: Asset = { id: 'asset-1', nature: 'Compte bancaire' };
    render(<AssetForm asset={asset} onSubmit={noop} onCancel={() => {}} />);

    for (const label of NON_ESSENTIEL_TAB_LABELS) {
      expect(screen.getByRole('button', { name: label })).not.toHaveAttribute('aria-disabled', 'true');
    }

    await user.click(screen.getByRole('button', { name: 'Propriété' }));
    expect(await screen.findByText('Mode de détention')).toBeInTheDocument();
    expect(screen.queryByText("Renseignez d'abord la nature de l'actif")).not.toBeInTheDocument();
  });
});

describe('AssetForm — indivision hors couple masque origine/clauses', () => {
  it('masque "Origine de l\'actif" et "Bien propre par nature" quand la case est cochée, les réaffiche au décoché', async () => {
    const user = userEvent.setup();
    // Statut "en couple" pour que "Bien propre par nature" soit affiché avant coche.
    vi.mocked(familyService.getMaritalStatus).mockResolvedValueOnce({
      statut_couple: 'Marié(e)',
      regime_matrimonial: 'Communauté réduite aux acquêts',
      date_mariage: '2010-01-01',
    } as any);
    const asset: Asset = { id: 'asset-1', nature: 'Compte bancaire' };
    render(<AssetForm asset={asset} onSubmit={noop} onCancel={() => {}} />);

    await user.click(screen.getByRole('button', { name: 'Propriété' }));
    expect(await screen.findByText("Origine de l'actif")).toBeInTheDocument();
    expect(await screen.findByText('Bien propre par nature (art. 1404)')).toBeInTheDocument();

    const indivisionCheckbox = screen.getByLabelText('Ce bien est détenu en indivision avec un tiers (hors couple)');
    await user.click(indivisionCheckbox);

    expect(await screen.findByText(/Sans effet pour un bien en indivision hors couple/)).toBeInTheDocument();
    expect(screen.queryByText("Origine de l'actif")).not.toBeInTheDocument();
    expect(screen.queryByText('Bien propre par nature (art. 1404)')).not.toBeInTheDocument();

    await user.click(indivisionCheckbox);

    expect(await screen.findByText("Origine de l'actif")).toBeInTheDocument();
    expect(screen.queryByText(/Sans effet pour un bien en indivision hors couple/)).not.toBeInTheDocument();
  });
});

describe('AssetForm — coût de revient détaillé d\'un bien immobilier', () => {
  const residence = {
    id: 'a1',
    nature: 'Résidence principale',
    denomination: 'Appartement Lyon',
    detenteur: 'user',
    valeur_acquisition: 300000,
    frais_acquisition: 8000,
    date_acquisition: '2020-05-01',
    origine_actif: ['Acquisition à titre onéreux'],
    mode_detention: 'Pleine propriété',
  } as unknown as Asset;

  const submitted = () => {
    // Le formulaire ne se pré-remplit qu'une fois le prénom de l'utilisateur chargé.
    vi.mocked(familyService.getFamilyProfile).mockResolvedValueOnce({ prenom: 'Camille' } as never);
    const onSubmit = vi.fn().mockResolvedValue(true);
    return onSubmit;
  };

  it('garde les frais globaux d\'un actif sans détail tant qu\'aucun frais détaillé n\'est touché', async () => {
    const user = userEvent.setup();
    const onSubmit = submitted();
    render(<AssetForm asset={residence} onSubmit={onSubmit} onCancel={() => {}} />);
    await waitFor(() => expect(screen.getByDisplayValue('Appartement Lyon')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.frais_acquisition).toBe(8000);
    expect(payload.montant_immeuble).toBe(300000);
  });

  it('remplace les frais globaux par la somme des frais détaillés', async () => {
    const user = userEvent.setup();
    const onSubmit = submitted();
    render(<AssetForm asset={residence} onSubmit={onSubmit} onCancel={() => {}} />);
    await waitFor(() => expect(screen.getByDisplayValue('Appartement Lyon')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Propriété' }));
    expect(screen.queryByLabelText("Frais d'acquisition")).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Frais d'agence"), '5000');
    await user.type(screen.getByLabelText('Travaux de rénovation'), '10000');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.frais_agence).toBe(5000);
    expect(payload.travaux_renovation).toBe(10000);
    expect(payload.frais_acquisition).toBe(15000);
    expect(payload.frais_notaire).toBeNull();
  });

  it('n\'envoie pas les champs immobiliers pour une autre nature', async () => {
    const user = userEvent.setup();
    const onSubmit = submitted();
    render(<AssetForm asset={{ ...residence, nature: 'Compte bancaire' } as Asset} onSubmit={onSubmit} onCancel={() => {}} />);
    await waitFor(() => expect(screen.getByDisplayValue('Appartement Lyon')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0];
    expect(payload).not.toHaveProperty('surface_m2');
    expect(payload).not.toHaveProperty('montant_immeuble');
  });
});

describe('AssetForm — location d\'un bien locatif', () => {
  it('enregistre type et régime, sans champs de saisie seule', async () => {
    const user = userEvent.setup();
    vi.mocked(familyService.getFamilyProfile).mockResolvedValueOnce({ prenom: 'Camille' } as never);
    const onSubmit = vi.fn().mockResolvedValue(true);
    const bien = {
      id: 'a2', nature: 'Immeubles locatifs (loués nus)', denomination: 'Studio Nantes', detenteur: 'user',
      type_location: 'Location nue', regime_location: 'Réel',
      date_acquisition: '2020-05-01', valeur_acquisition: 150000, mode_detention: 'Pleine propriété',
    } as unknown as Asset;
    render(<AssetForm asset={bien} onSubmit={onSubmit} onCancel={() => {}} />);
    await waitFor(() => expect(screen.getByDisplayValue('Studio Nantes')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Caractéristiques' }));
    expect(screen.getByText('Type de location')).toBeInTheDocument();
    expect(screen.queryByText('Loyer mensuel hors charges')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const [payload, , , , extras] = onSubmit.mock.calls[0];
    expect(payload.type_location).toBe('Location nue');
    expect(payload.regime_location).toBe('Réel');
    expect(payload).not.toHaveProperty('loyer_mensuel');
    expect(payload).not.toHaveProperty('finance_par_credit');
    expect(extras.loyerMensuel).toBeUndefined();
    expect(extras.financeParCredit).toBe(false);
  });
});

describe('AssetForm — champs obligatoires en modification', () => {
  it("ouvre l'onglet du champ manquant et n'enregistre pas", async () => {
    const user = userEvent.setup();
    vi.mocked(familyService.getFamilyProfile).mockResolvedValueOnce({ prenom: 'Camille' } as never);
    const onSubmit = vi.fn().mockResolvedValue(true);
    const ancien = {
      id: 'a3', nature: 'Compte bancaire', denomination: 'Compte joint', detenteur: 'user',
      date_acquisition: '2018-01-01', valeur_acquisition: 0,
    } as unknown as Asset;
    render(<AssetForm asset={ancien} onSubmit={onSubmit} onCancel={() => {}} />);
    await waitFor(() => expect(screen.getByDisplayValue('Compte joint')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByText('Choisissez un mode de détention')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Propriété' })).toHaveAttribute('aria-pressed', 'true');
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
