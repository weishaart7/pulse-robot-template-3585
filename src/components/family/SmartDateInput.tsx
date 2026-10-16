import { useRef, useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { DatePickerPanel } from '@/components/ui/date-picker-panel';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { FormControl } from '@/components/ui/form';

// Borne haute sans maxDate : même horizon que le calendrier (date-picker-panel.tsx).
const MAX_YEARS_AHEAD = 50;

interface SmartDateInputProps {
  value: Date | string | undefined;
  onChange: (value: Date | string) => void;
  className?: string;
  /** Date maximale acceptée (saisie et calendrier). Par défaut aujourd'hui ; `null` pour autoriser
   *  les dates futures (jusqu'à la borne haute du calendrier). */
  maxDate?: Date | null;
}

// Saisie de date JJ/MM/AAAA avec auto-formatage pendant la frappe et sélecteur calendrier
// en complément. La valeur reste une string tant que le format n'est pas complet et valide ;
// elle ne devient un Date qu'une fois JJ/MM/AAAA entièrement saisi et vérifié (jour/mois/année
// réels, année dans [1900, maxDate] — aujourd'hui par défaut).
export function SmartDateInput({ value, onChange, className, maxDate = new Date() }: SmartDateInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <FormControl className="flex-1">
        <Input
          ref={inputRef}
          placeholder="JJ/MM/AAAA"
          className={className}
          value={value instanceof Date ? format(value, 'dd/MM/yyyy') : value || ''}
          onChange={(e) => {
            const raw = e.target.value;
            const caret = e.target.selectionStart ?? raw.length;

            // Ne garder que les chiffres, et reconstruire les "/" à partir du
            // nombre de chiffres saisis (plutôt que de manipuler la chaîne
            // formatée précédente), pour que la saisie reste correcte quel
            // que soit le mode de saisie (frappe touche par touche, collage
            // d'une date complète, suppression en cours de saisie...).
            const digitsBeforeCaret = raw.slice(0, caret).replace(/\D/g, '').length;
            const digits = raw.replace(/\D/g, '').slice(0, 8);

            let formattedValue = digits;
            if (digits.length > 4) {
              formattedValue = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
            } else if (digits.length > 2) {
              formattedValue = `${digits.slice(0, 2)}/${digits.slice(2)}`;
            }

            // Repositionner le curseur juste après le dernier chiffre saisi :
            // l'insertion automatique des "/" décale le texte, et React restaure
            // sinon le curseur à son index numérique d'avant, ce qui le place
            // avant le chiffre qu'on vient de taper (les chiffres suivants
            // s'insèrent alors au mauvais endroit).
            const digitCount = Math.min(digitsBeforeCaret, digits.length);
            let caretPos = digitCount;
            if (digitCount > 2) caretPos += 1;
            if (digitCount > 4) caretPos += 1;
            caretPos = Math.min(caretPos, formattedValue.length);
            // setTimeout(0), comme Input, pour s'exécuter après la restauration
            // de curseur déjà planifiée par le composant Input et la gagner.
            setTimeout(() => {
              inputRef.current?.setSelectionRange(caretPos, caretPos);
            }, 0);

            // Validation finale si format complet
            if (formattedValue.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
              const [day, month, year] = formattedValue.split('/').map(Number);
              const date = new Date(year, month - 1, day);

              // Vérifier que la date est valide
              if (
                date.getDate() === day &&
                date.getMonth() === month - 1 &&
                date.getFullYear() === year &&
                year >= 1900 &&
                (maxDate ? date <= maxDate : year <= new Date().getFullYear() + MAX_YEARS_AHEAD)
              ) {
                onChange(date);
                return;
              }
            }

            // Stocker la valeur formatée comme string pendant la saisie
            onChange(formattedValue);
          }}
        />
      </FormControl>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0" type="button" aria-label="Ouvrir le calendrier">
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto rounded-[4px] border-border p-0 shadow-md" align="end">
          <DatePickerPanel
            selected={value instanceof Date ? value : undefined}
            maxDate={maxDate ?? undefined}
            onSelect={(date) => {
              onChange(date);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
