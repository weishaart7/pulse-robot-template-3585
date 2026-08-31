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
vi.mock('@/components/ui/searchable-select', () => ({
  SearchableSelect: ({ value, onChange, placeholder }: { value?: string; onChange: (v: string) => void; placeholder?: string }) => (
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
