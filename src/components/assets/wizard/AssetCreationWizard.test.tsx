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

    expect(screen.getByText(/Étape 1\/\d+ — Le bien/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(screen.getByText(/Étape 1\/\d+ — Le bien/)).toBeInTheDocument();

    await user.type(screen.getByLabelText('nature'), 'Compte bancaire');
    await user.click(screen.getByRole('button', { name: 'Suivant' }));

    expect(await screen.findByText(/Étape 2\/\d+ — Qui/)).toBeInTheDocument();
    expect(screen.getByText('Détenteur')).toBeInTheDocument();
  });

  it("enchaîne les étapes dans l'ordre : le bien, qui, acquisition, qualification, droits détenus, valeur", async () => {
    const user = userEvent.setup();
    render(<AssetCreationWizard onSubmit={noop} onCancel={() => {}} />);

    await user.type(screen.getByLabelText('nature'), 'Compte bancaire');

    const etapes = [
      { label: 'Qui', champ: 'Détenteur' },
      { label: 'Acquisition', champ: "Date d'acquisition" },
      { label: 'Qualification', champ: 'Qualification du bien' },
      { label: 'Droits détenus', champ: 'Mode de détention' },
      { label: 'Valeur', champ: 'Valeur actuelle estimée (€)' },
    ];
    for (const { label, champ } of etapes) {
      await user.click(screen.getByRole('button', { name: 'Suivant' }));
      expect(await screen.findByText(new RegExp(`Étape \\d+/\\d+ — ${label}$`))).toBeInTheDocument();
      expect(screen.getByText(champ)).toBeInTheDocument();
    }
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
