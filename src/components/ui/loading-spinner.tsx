import React from 'react';
import { cn } from '@/lib/utils';
import { Benday } from '@/components/ui/benday';

interface LoadingSpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

// Taille du logo tramé selon le contexte : bloc compact, section, écran entier.
const SIZES = { sm: 56, md: 112, lg: 256 } as const;

// Chargeur commun : logo Aurevia en trame Ben-Day animée (vague « shimmer »).
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  className,
  size = 'md',
  text = 'Chargement...'
}) => (
  <div role="status" aria-live="polite" className={cn("flex flex-col items-center justify-center p-8 text-foreground", className)}>
    <Benday
      src="/logo.svg"
      bake={{ grid: 52, threshold: 0.52, gamma: 0.85 }}
      preset="shimmer"
      size={SIZES[size]}
      fit="natural"
    />
    {text ? <p className="mt-4 text-sm text-muted-foreground">{text}</p> : <span className="sr-only">Chargement</span>}
  </div>
);
