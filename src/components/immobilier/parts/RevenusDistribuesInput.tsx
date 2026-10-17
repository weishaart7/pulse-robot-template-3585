import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Unite = 'eur' | 'pct';

interface RevenusDistribuesInputProps {
  /** Montant en euros — seule valeur stockée (`revenus_distribues_12m`). */
  value: number | undefined;
  onChange: (montant: number | undefined) => void;
  /** Base du taux : valeur estimée actuelle des parts. */
  valeurEstimee: number | undefined;
  className?: string;
}

const arrondi = (v: number, decimales: number) => Math.round(v * 10 ** decimales) / 10 ** decimales;
const fmtEur = (v: number) => v.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €';
const fmtPct = (v: number) => v.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' %';

// Revenus distribués saisis en € ou en % de la valeur estimée actuelle des parts. Le montant en euros
// reste la seule donnée stockée : en mode %, le taux est converti (taux × valeur estimée) et suit les
// changements de valeur estimée tant que l'utilisateur reste en %.
export const RevenusDistribuesInput: React.FC<RevenusDistribuesInputProps> = ({ value, onChange, valeurEstimee, className }) => {
  const base = valeurEstimee && valeurEstimee > 0 ? valeurEstimee : undefined;
  const tauxDepuis = (montant: number | undefined, b: number) =>
    montant != null ? String(arrondi((montant / b) * 100, 2)) : '';
  // % par défaut dès qu'une valeur estimée existe ; € sinon (pas de base pour convertir).
  const [unite, setUnite] = useState<Unite>(base ? 'pct' : 'eur');
  const [taux, setTaux] = useState(base ? tauxDepuis(value, base) : '');
  const uniteChoisie = useRef(false);

  // Valeur estimée renseignée après coup (formulaire de création) : bascule en % si l'utilisateur
  // n'a pas choisi d'unité lui-même.
  useEffect(() => {
    if (base && unite === 'eur' && !uniteChoisie.current) {
      setTaux(tauxDepuis(value, base));
      setUnite('pct');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base]);

  useEffect(() => {
    if (unite !== 'pct') return;
    if (!base) { setUnite('eur'); return; }
    // Taux simplement affiché depuis le montant stocké : ne pas réécrire ce montant (arrondi du taux).
    if (taux === tauxDepuis(value, base)) return;
    const t = taux.trim() === '' ? undefined : Number(taux);
    const montant = t === undefined ? undefined : arrondi((t / 100) * base, 2);
    if (montant !== value) onChange(montant);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taux, base, unite]);

  const basculer = (u: Unite) => {
    if (u === unite) return;
    uniteChoisie.current = true;
    if (u === 'pct' && base) setTaux(tauxDepuis(value, base));
    setUnite(u);
  };

  const equivalent = unite === 'pct'
    ? (value != null ? `soit ${fmtEur(value)} par an` : null)
    : (value != null && base ? `soit ${fmtPct((value / base) * 100)} de la valeur estimée` : null);

  return (
    <div className="space-y-1">
      <div className="relative">
        <Input
          type="number"
          step="0.01"
          min={0}
          value={unite === 'pct' ? taux : (value ?? '')}
          onChange={(e) => {
            if (unite === 'pct') setTaux(e.target.value);
            else onChange(e.target.value === '' ? undefined : Number(e.target.value));
          }}
          className={cn('bg-background border-border pr-16 shadow-none tabular-nums', className)}
        />
        <div className="absolute inset-y-0 right-1.5 flex items-center gap-0.5" role="radiogroup" aria-label="Unité">
          {(['eur', 'pct'] as const).map((u) => (
            <button
              key={u}
              type="button"
              role="radio"
              aria-checked={unite === u}
              disabled={u === 'pct' && !base}
              title={u === 'pct' && !base ? 'Renseignez la valeur estimée pour saisir un taux' : undefined}
              onClick={() => basculer(u)}
              className={cn(
                'h-6 w-6 rounded-[2px] text-[12px] transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                unite === u ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {u === 'eur' ? '€' : '%'}
            </button>
          ))}
        </div>
      </div>
      {equivalent && <p className="text-[12px] text-muted-foreground tabular-nums">{equivalent}</p>}
    </div>
  );
};
