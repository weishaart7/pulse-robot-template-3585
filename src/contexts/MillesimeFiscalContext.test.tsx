// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
  CLE_STOCKAGE_MILLESIME,
  lireMillesimeMemorise,
  MillesimeFiscalProvider,
  useMillesimeFiscal,
} from './MillesimeFiscalContext';

const wrapper = ({ children }: { children: ReactNode }) => <MillesimeFiscalProvider>{children}</MillesimeFiscalProvider>;

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('MillesimeFiscalContext', () => {
  it('sans provider : millésime par défaut (revenus 2025)', () => {
    const { result } = renderHook(() => useMillesimeFiscal());
    expect(result.current.anneeRevenus).toBe(2025);
    expect(result.current.parametres.anneeRevenus).toBe(2025);
  });

  it('choisir un millésime change les paramètres et le mémorise', () => {
    const { result } = renderHook(() => useMillesimeFiscal(), { wrapper });
    act(() => result.current.choisirAnneeRevenus(2026));
    expect(result.current.anneeRevenus).toBe(2026);
    expect(result.current.parametres.statut).toBe('provisoire');
    expect(window.localStorage.getItem(CLE_STOCKAGE_MILLESIME)).toBe('2026');
  });

  it('un millésime inconnu est ignoré, en mémoire comme au choix', () => {
    window.localStorage.setItem(CLE_STOCKAGE_MILLESIME, '2019');
    expect(lireMillesimeMemorise()).toBe(2025);
    const { result } = renderHook(() => useMillesimeFiscal(), { wrapper });
    act(() => result.current.choisirAnneeRevenus(2030));
    expect(result.current.anneeRevenus).toBe(2025);
  });

  it('stockage indisponible : repli sur 2025 et choix gardé pour la session', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqué'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqué'); });
    const { result } = renderHook(() => useMillesimeFiscal(), { wrapper });
    expect(result.current.anneeRevenus).toBe(2025);
    act(() => result.current.choisirAnneeRevenus(2026));
    expect(result.current.anneeRevenus).toBe(2026);
  });
});
