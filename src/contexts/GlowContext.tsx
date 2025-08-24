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
  if (context === undefined) {
    throw new Error('useGlow must be used within a GlowProvider');
  }
  return context;
}