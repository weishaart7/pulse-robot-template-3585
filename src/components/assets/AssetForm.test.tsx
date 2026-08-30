// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssetForm } from './AssetForm';
import type { Asset } from '@/services/assetService';

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

const NON_ESSENTIEL_TAB_LABELS = ['Détention', 'Origine', 'Caractéristiques', 'Charges'];

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
    await user.click(screen.getByRole('button', { name: 'Détention' }));
    expect(screen.getByText("Renseignez d'abord la nature de l'actif")).toBeInTheDocument();
    expect(screen.queryByLabelText('Mode de détention')).not.toBeInTheDocument();

    // Renseigner la nature débloque tous les onglets.
    await user.type(screen.getByLabelText('nature'), 'Compte bancaire');

    await waitFor(() => {
      for (const label of NON_ESSENTIEL_TAB_LABELS) {
        expect(screen.getByRole('button', { name: label })).not.toHaveAttribute('aria-disabled', 'true');
      }
    });

    await user.click(screen.getByRole('button', { name: 'Détention' }));
    expect(await screen.findByText('Mode de détention')).toBeInTheDocument();
  });

  it('en édition, tous les onglets sont cliquables dès le montage', async () => {
    const user = userEvent.setup();
    const asset: Asset = { id: 'asset-1', nature: 'Compte bancaire' };
    render(<AssetForm asset={asset} onSubmit={noop} onCancel={() => {}} />);

    for (const label of NON_ESSENTIEL_TAB_LABELS) {
      expect(screen.getByRole('button', { name: label })).not.toHaveAttribute('aria-disabled', 'true');
    }

    await user.click(screen.getByRole('button', { name: 'Détention' }));
    expect(await screen.findByText('Mode de détention')).toBeInTheDocument();
    expect(screen.queryByText("Renseignez d'abord la nature de l'actif")).not.toBeInTheDocument();
  });
});
