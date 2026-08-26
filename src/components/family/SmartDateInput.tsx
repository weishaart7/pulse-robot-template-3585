import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { FormControl } from '@/components/ui/form';

interface SmartDateInputProps {
  value: Date | string | undefined;
  onChange: (value: Date | string) => void;
  className?: string;
}

// Saisie de date JJ/MM/AAAA avec auto-formatage pendant la frappe et sélecteur calendrier
// en complément. La valeur reste une string tant que le format n'est pas complet et valide ;
// elle ne devient un Date qu'une fois JJ/MM/AAAA entièrement saisi et vérifié (jour/mois/année
// réels, année dans [1900, aujourd'hui]).
export function SmartDateInput({ value, onChange, className }: SmartDateInputProps) {
  return (
    <div className="flex items-center gap-2">
      <FormControl className="flex-1">
        <Input
          placeholder="JJ/MM/AAAA"
          className={className}
          value={value instanceof Date ? format(value, 'dd/MM/yyyy') : value || ''}
          onChange={(e) => {
            const raw = e.target.value;

            // Permettre seulement chiffres et /
            const cleanValue = raw.replace(/[^\d/]/g, '');

            // Limiter à 10 caractères
            if (cleanValue.length > 10) return;

            // Auto-formatage pendant la saisie
            let formattedValue = cleanValue;
            if (cleanValue.length >= 2 && !cleanValue.includes('/')) {
              formattedValue = cleanValue.slice(0, 2) + '/' + cleanValue.slice(2);
            }
            if (cleanValue.length >= 5 && cleanValue.split('/').length === 2) {
              const parts = formattedValue.split('/');
              formattedValue = parts[0] + '/' + parts[1].slice(0, 2) + '/' + cleanValue.slice(4);
            }

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
                year <= new Date().getFullYear()
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
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0" type="button">
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value instanceof Date ? value : undefined}
            onSelect={(date) => {
              if (date) {
                onChange(date);
              }
            }}
            disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
