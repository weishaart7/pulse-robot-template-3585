// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssetCreationWizard } from './AssetCreationWizard';

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

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

const noop = async () => {};

afterEach(() => cleanup());

describe('AssetCreationWizard — navigation entre étapes', () => {
  it("bloque l'étape 1 tant que la nature n'est pas renseignée, puis avance", async () => {
    const user = userEvent.setup();
    render(<AssetCreationWizard onSubmit={noop} onCancel={() => {}} />);

    expect(screen.getByText(/Étape 1\/\d+ — Quoi/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(screen.getByText(/Étape 1\/\d+ — Quoi/)).toBeInTheDocument();

    await user.type(screen.getByLabelText('nature'), 'Compte bancaire');
    await user.click(screen.getByRole('button', { name: 'Suivant' }));

    expect(await screen.findByText(/Étape 2\/\d+ — À qui appartient-il/)).toBeInTheDocument();
    expect(screen.getByText('Mode de détention')).toBeInTheDocument();
  });

  it('revient en arrière sans perdre la nature déjà saisie', async () => {
    const user = userEvent.setup();
    render(<AssetCreationWizard onSubmit={noop} onCancel={() => {}} />);

    await user.type(screen.getByLabelText('nature'), 'Compte bancaire');
    await user.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(await screen.findByText(/Étape 2/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Précédent' }));
    expect(await screen.findByText(/Étape 1/)).toBeInTheDocument();
    expect(screen.getByLabelText('nature')).toHaveValue('Compte bancaire');
  });
});
