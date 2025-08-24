import React, { createContext, useContext, useState, ReactNode } from 'react';

interface GlowContextType {
  focusedInputId: string | null;
  setFocusedInputId: (id: string | null) => void;
}

const GlowContext = createContext<GlowContextType | undefined>(undefined);

export function GlowProvider({ children }: { children: ReactNode }) {
  const [focusedInputId, setFocusedInputId] = useState<string | null>(null);

  return (
    <GlowContext.Provider value={{ focusedInputId, setFocusedInputId }}>
      {children}
    </GlowContext.Provider>
  );
}

export function useGlow() {
  const context = useContext(GlowContext);
  // Rendre le contexte optionnel - retourner des valeurs par défaut si pas de provider
  if (context === undefined) {
    return {
      focusedInputId: null,
      setFocusedInputId: () => {} // fonction vide si pas de provider
    };
  }
  return context;
}