// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssetCreationWizard } from './AssetCreationWizard';

// Radix Select (mode de détention) a besoin de ces API absentes de jsdom.
Element.prototype.hasPointerCapture = () => false;
Element.prototype.releasePointerCapture = () => {};
Element.prototype.scrollIntoView = () => {};

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

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

const noop = async () => {};

afterEach(() => cleanup());

describe('AssetCreationWizard — navigation entre étapes', () => {
  it("bloque l'étape 1 tant que la nature n'est pas renseignée, puis avance", async () => {
    const user = userEvent.setup();
    render(<AssetCreationWizard onSubmit={noop} onCancel={() => {}} />);

    expect(screen.getByRole('heading', { name: 'Le bien' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(screen.getByRole('heading', { name: 'Le bien' })).toBeInTheDocument();

    await user.type(screen.getByLabelText('nature'), 'Compte bancaire');
    await user.type(screen.getByLabelText(/Dénomination/), 'Compte courant');
    await user.click(screen.getByRole('button', { name: 'Suivant' }));

    expect(await screen.findByRole('heading', { name: 'Origine et propriété' })).toBeInTheDocument();
    expect(screen.getByText('Détenteur')).toBeInTheDocument();
  });

  it("enchaîne les étapes dans l'ordre : origine et propriété (avec le mode de détention), prix, valeur", async () => {
    const user = userEvent.setup();
    render(<AssetCreationWizard onSubmit={noop} onCancel={() => {}} />);

    await user.type(screen.getByLabelText('nature'), 'Compte bancaire');
    await user.type(screen.getByLabelText(/Dénomination/), 'Compte courant');

    const etapes = [
      { label: 'Origine et propriété', champs: ["Date d'acquisition", 'Mode de détention', 'Détenteur', 'Qualification du bien'] },
      { label: 'Prix', champs: ["Valeur d'achat / réception", "Frais d'acquisition"] },
      { label: 'Valeur', champs: ['Valeur actuelle estimée'] },
    ];
    for (const { label, champs } of etapes) {
      await user.click(screen.getByRole('button', { name: 'Suivant' }));
      expect(await screen.findByRole('heading', { name: label })).toBeInTheDocument();
      champs.forEach((champ) => expect(screen.getByText((_, el) => el?.tagName === 'LABEL' && el.textContent?.replace('*', '').trim() === champ)).toBeInTheDocument());
      if (label === 'Origine et propriété') {
        expect(screen.queryByText(/Valeur d'achat \/ réception/)).not.toBeInTheDocument();
        // Champs obligatoires de l'étape, remplis pour pouvoir avancer.
        await user.type(screen.getByPlaceholderText('jj/mm/aaaa'), '01/01/2020');
        await user.click(screen.getByRole('combobox', { name: /Mode de détention/ }));
        await user.click(await screen.findByRole('option', { name: 'Pleine propriété' }));
      }
      if (label === 'Prix') await user.type(screen.getByLabelText(/Valeur d'achat/), '1000');
    }
  });

  it('revient en arrière sans perdre la nature déjà saisie', async () => {
    const user = userEvent.setup();
    render(<AssetCreationWizard onSubmit={noop} onCancel={() => {}} />);

    await user.type(screen.getByLabelText('nature'), 'Compte bancaire');
    await user.type(screen.getByLabelText(/Dénomination/), 'Compte courant');
    await user.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(await screen.findByText(/Étape 2/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Précédent' }));
    expect(await screen.findByText(/Étape 1/)).toBeInTheDocument();
    expect(screen.getByLabelText('nature')).toHaveValue('Compte bancaire');
  });
});

describe('AssetCreationWizard — confirmations intégrées (pas de window.confirm)', () => {
  it('annule tout de suite quand rien n\'a été saisi', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<AssetCreationWizard onSubmit={noop} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('demande confirmation dans un dialogue avant de quitter une saisie en cours', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    // window.confirm renvoie false dans le navigateur de l'app desktop : le wizard ne doit plus en dépendre.
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<AssetCreationWizard onSubmit={noop} onCancel={onCancel} />);

    await user.type(screen.getByLabelText('nature'), 'Compte bancaire');
    await user.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(await screen.findByText('Quitter sans enregistrer ?')).toBeInTheDocument();
    expect(onCancel).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Continuer la saisie' }));
    expect(onCancel).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    await user.click(await screen.findByRole('button', { name: 'Quitter' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(confirmSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('demande confirmation avant de changer la nature après l\'étape 1, et la restaure en cas de refus', async () => {
    const user = userEvent.setup();
    render(<AssetCreationWizard onSubmit={noop} onCancel={() => {}} />);

    await user.type(screen.getByLabelText('nature'), 'Compte bancaire');
    await user.type(screen.getByLabelText(/Dénomination/), 'Compte courant');
    await user.click(screen.getByRole('button', { name: 'Suivant' }));
    await screen.findByText(/Étape 2/);
    await user.click(screen.getByRole('button', { name: 'Précédent' }));

    fireEvent.change(screen.getByLabelText('nature'), { target: { value: 'Livret A' } });
    expect(await screen.findByText("Changer la nature de l'actif ?")).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Garder la nature actuelle' }));
    await waitFor(() => expect(screen.getByLabelText('nature')).toHaveValue('Compte bancaire'));
  });

  it('applique le changement de nature une fois confirmé', async () => {
    const user = userEvent.setup();
    render(<AssetCreationWizard onSubmit={noop} onCancel={() => {}} />);

    await user.type(screen.getByLabelText('nature'), 'Compte bancaire');
    await user.type(screen.getByLabelText(/Dénomination/), 'Compte courant');
    await user.click(screen.getByRole('button', { name: 'Suivant' }));
    await screen.findByText(/Étape 2/);
    await user.click(screen.getByRole('button', { name: 'Précédent' }));

    fireEvent.change(screen.getByLabelText('nature'), { target: { value: 'Livret A' } });
    await user.click(await screen.findByRole('button', { name: 'Changer la nature' }));

    await waitFor(() => expect(screen.queryByText("Changer la nature de l'actif ?")).not.toBeInTheDocument());
    expect(screen.getByLabelText('nature')).toHaveValue('Livret A');
  });
});

describe('AssetCreationWizard — champs obligatoires', () => {
  it("bloque l'étape 1 sans dénomination et le signale sur le champ", async () => {
    const user = userEvent.setup();
    render(<AssetCreationWizard onSubmit={noop} onCancel={() => {}} />);

    await user.type(screen.getByLabelText('nature'), 'Compte bancaire');
    await user.click(screen.getByRole('button', { name: 'Suivant' }));

    expect(await screen.findByText('Donnez un nom à cet actif')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Le bien' })).toBeInTheDocument();
  });

  it("bloque l'étape Origine sans date d'acquisition", async () => {
    const user = userEvent.setup();
    render(<AssetCreationWizard onSubmit={noop} onCancel={() => {}} />);

    await user.type(screen.getByLabelText('nature'), 'Compte bancaire');
    await user.type(screen.getByLabelText(/Dénomination/), 'Compte courant');
    await user.click(screen.getByRole('button', { name: 'Suivant' }));
    await screen.findByRole('heading', { name: 'Origine et propriété' });
    await user.click(screen.getByRole('button', { name: 'Suivant' }));

    expect(await screen.findByText('Indiquez la date')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Origine et propriété' })).toBeInTheDocument();
  });
});
