// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CasesInformatives2027 } from './CasesInformatives2027';
import type { CasesInformatives2042 } from '@/hooks/useCasesInformatives2042';

const cases = (actif: boolean, valeurs = {}): CasesInformatives2042 => ({
  actif, formulaire: 'nonSalaries', valeurs, modifier: vi.fn(), enregistrer: vi.fn(),
});
const rendre = (c: CasesInformatives2042) => render(<TooltipProvider><CasesInformatives2027 cases={c} /></TooltipProvider>);

afterEach(() => cleanup());

describe('CasesInformatives2027', () => {
  it('rien avant les revenus 2026', () => {
    const { container } = rendre(cases(false));
    expect(container.textContent).toBe('');
  });

  it('les 77 cases du cadre 5, groupées par régime', () => {
    rendre(cases(true, { case5ad: 6, case5af: true }));
    expect(screen.getByText('Revenus agricoles (déclaration 2027)')).toBeTruthy();
    expect(screen.getByText('Revenus non commerciaux non professionnels (déclaration 2027)')).toBeTruthy();
    expect(document.querySelectorAll('[id^="case-5"]')).toHaveLength(77);
    expect((document.getElementById('case-5AD') as HTMLInputElement).value).toBe('6');
    expect(document.getElementById('case-5AF')?.getAttribute('data-state')).toBe('checked');
  });

  it('une saisie remonte au hook', () => {
    const c = cases(true);
    rendre(c);
    fireEvent.change(document.getElementById('case-5BD') as HTMLInputElement, { target: { value: '12' } });
    fireEvent.click(document.getElementById('case-5CM') as HTMLElement);
    expect(c.modifier).toHaveBeenCalledWith('case5bd', 12);
    expect(c.modifier).toHaveBeenCalledWith('case5cm', true);
  });
});
