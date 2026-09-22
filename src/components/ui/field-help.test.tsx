// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FieldHelp } from './field-help';

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

afterEach(() => cleanup());

describe('FieldHelp', () => {
  it("n'affiche pas la précision par défaut, l'ouvre au survol et la referme en quittant", async () => {
    const user = userEvent.setup();
    render(<FieldHelp>Précision utile</FieldHelp>);

    expect(screen.queryByText('Précision utile')).not.toBeInTheDocument();

    const bouton = screen.getByRole('button', { name: 'Aide' });
    await user.hover(bouton);
    expect(await screen.findByText('Précision utile')).toBeInTheDocument();

    await user.unhover(bouton);
    await waitFor(() => expect(screen.queryByText('Précision utile')).not.toBeInTheDocument());
  });

  it("ne referme pas la précision au clic sur le « ? » et ne soumet aucun formulaire", async () => {
    const user = userEvent.setup();
    let soumis = false;
    render(
      <form onSubmit={(e) => { e.preventDefault(); soumis = true; }}>
        <FieldHelp>Précision utile</FieldHelp>
      </form>
    );

    const bouton = screen.getByRole('button', { name: 'Aide' });
    await user.hover(bouton);
    await user.click(bouton);

    expect(await screen.findByText('Précision utile')).toBeInTheDocument();
    expect(soumis).toBe(false);
  });
});
