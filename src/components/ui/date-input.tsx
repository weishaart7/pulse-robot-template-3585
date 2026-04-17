import React, { useState } from 'react';
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setInputValue(input);

    // Essayer de parser la date au format jj/mm/aaaa
    if (input.length === 10) {
      try {
        const parsedDate = parse(input, 'dd/MM/yyyy', new Date());
        if (isValid(parsedDate)) {
          onChange(parsedDate);
        }
      } catch {
        // Si le parsing échoue, on ne fait rien
      }
    } else if (input === '') {
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