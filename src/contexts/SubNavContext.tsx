import React, { createContext, useContext, useState, useCallback } from 'react';

export interface SubNavItem {
  id: string;
  label: string;
}

interface SubNavState {
  items: SubNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
}

interface SubNavContextValue extends SubNavState {
  setSubNav: (items: SubNavItem[], activeId: string, onSelect: (id: string) => void) => void;
  clearSubNav: () => void;
}

const noop = () => {};
const defaultState: SubNavState = { items: [], activeId: '', onSelect: noop };

const SubNavContext = createContext<SubNavContextValue>({
  ...defaultState,
  setSubNav: noop,
  clearSubNav: noop,
});

export function SubNavProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SubNavState>(defaultState);

  const setSubNav = useCallback((items: SubNavItem[], activeId: string, onSelect: (id: string) => void) => {
    setState({ items, activeId, onSelect });
  }, []);

  const clearSubNav = useCallback(() => {
    setState(defaultState);
  }, []);

  return (
    <SubNavContext.Provider value={{ ...state, setSubNav, clearSubNav }}>
      {children}
    </SubNavContext.Provider>
  );
}

export function useSubNav() {
  return useContext(SubNavContext);
}
