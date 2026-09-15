import React, { useRef, useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { format, parse, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface DateInputProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const DateInput: React.FC<DateInputProps> = ({
  value,
  onChange,
  placeholder = "jj/mm/aaaa",
  disabled = false,
  className
}) => {
  const safeValue = value instanceof Date && isValid(value) ? value : undefined;
  const [inputValue, setInputValue] = useState(() => {
    return safeValue ? format(safeValue, 'dd/MM/yyyy') : '';
  });
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const caret = e.target.selectionStart ?? raw.length;

    // Ne garder que les chiffres, et reconstruire les "/" à partir du nombre de
    // chiffres saisis (plutôt que de manipuler la chaîne formatée précédente),
    // pour que la saisie reste correcte quel que soit le mode de saisie (frappe
    // touche par touche, collage d'une date complète, suppression en cours...).
    const digitsBeforeCaret = raw.slice(0, caret).replace(/\D/g, '').length;
    const digits = raw.replace(/\D/g, '').slice(0, 8);

    let formattedValue = digits;
    if (digits.length > 4) {
      formattedValue = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    } else if (digits.length > 2) {
      formattedValue = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }

    setInputValue(formattedValue);

    // Repositionner le curseur juste après le dernier chiffre saisi :
    // l'insertion automatique des "/" décale le texte, et React restaure sinon
    // le curseur à son index numérique d'avant, ce qui le place avant le
    // chiffre qu'on vient de taper (les chiffres suivants s'insèrent alors au
    // mauvais endroit).
    const digitCount = Math.min(digitsBeforeCaret, digits.length);
    let caretPos = digitCount;
    if (digitCount > 2) caretPos += 1;
    if (digitCount > 4) caretPos += 1;
    caretPos = Math.min(caretPos, formattedValue.length);
    // setTimeout(0), comme Input, pour s'exécuter après la restauration de
    // curseur déjà planifiée par le composant Input et la gagner.
    setTimeout(() => {
      inputRef.current?.setSelectionRange(caretPos, caretPos);
    }, 0);

    // Essayer de parser la date au format jj/mm/aaaa
    if (formattedValue.length === 10) {
      try {
        const parsedDate = parse(formattedValue, 'dd/MM/yyyy', new Date());
        if (isValid(parsedDate)) {
          onChange(parsedDate);
        }
      } catch {
        // Si le parsing échoue, on ne fait rien
      }
    } else if (formattedValue === '') {
      onChange(undefined);
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    onChange(date);
    if (date) {
      setInputValue(format(date, 'dd/MM/yyyy'));
    } else {
      setInputValue('');
    }
    setIsOpen(false);
  };

  const handleInputBlur = () => {
    if (inputValue && inputValue.length === 10) {
      try {
        const parsedDate = parse(inputValue, 'dd/MM/yyyy', new Date());
        if (isValid(parsedDate)) {
          setInputValue(format(parsedDate, 'dd/MM/yyyy'));
          onChange(parsedDate);
        } else {
          setInputValue(safeValue ? format(safeValue, 'dd/MM/yyyy') : '');
        }
      } catch {
        setInputValue(safeValue ? format(safeValue, 'dd/MM/yyyy') : '');
      }
    }
  };

  // Synchroniser l'input avec la valeur externe
  React.useEffect(() => {
    if (safeValue) {
      const formatted = format(safeValue, 'dd/MM/yyyy');
      if (inputValue !== formatted) {
        setInputValue(formatted);
      }
    } else if (inputValue && !safeValue) {
      setInputValue('');
    }
  }, [value]);

  return (
    <div className={cn("relative", className)}>
      <div className="flex">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          disabled={disabled}
          className="pr-10"
          maxLength={10}
        />
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="absolute right-0 top-0 h-full rounded-l-none border-l-0"
              disabled={disabled}
              type="button"
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={safeValue}
              onSelect={handleCalendarSelect}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};