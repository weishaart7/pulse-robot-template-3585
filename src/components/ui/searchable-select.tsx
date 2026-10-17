import React, { useState, useMemo, useEffect } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: string[] | SearchableSelectOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Choisir une option...",
  className
}) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Cleanup effect to reset state when unmounted
  useEffect(() => {
    return () => {
      setOpen(false);
      setSearchValue("");
    };
  }, []);

  // Normalise les options en { value, label } : accepte à la fois un
  // string[] (comportement historique, label === value) et un tableau
  // { value, label } pour les cas où le libellé affiché doit différer de
  // la valeur technique stockée/comparée ailleurs dans l'app.
  const normalizedOptions = useMemo<SearchableSelectOption[]>(
    () => options.map(option => typeof option === 'string' ? { value: option, label: option } : option),
    [options]
  );

  const filteredOptions = useMemo(() => {
    if (!searchValue) return normalizedOptions;
    return normalizedOptions.filter(option =>
      option.label.toLowerCase().includes(searchValue.toLowerCase())
    );
  }, [normalizedOptions, searchValue]);

  const selectedLabel = useMemo(
    () => normalizedOptions.find(option => option.value === value)?.label ?? value,
    [normalizedOptions, value]
  );

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setOpen(false);
    setSearchValue("");
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearchValue(""); }} modal={false}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex w-full items-center justify-between bg-muted border border-transparent shadow-none transition-colors",
            "text-foreground focus-visible:bg-background focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20",
            "disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
            "h-9 px-3 text-sm gap-1.5 rounded-[5px]",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{value ? selectedLabel : placeholder}</span>
          <ChevronDown className="h-4 w-4 opacity-60 -me-0.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="overflow-hidden rounded-[2px] border border-border p-0 shadow-[0_6px_24px_rgba(13,27,30,0.08)]"
        style={{ width: 'var(--radix-popover-trigger-width)' }}
      >
        <Command shouldFilter={false} className="rounded-none">
          <div className="flex h-9 items-center gap-2 border-b border-border px-3">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              placeholder="Rechercher…"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="h-full w-full bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <CommandList className="max-h-72 py-1">
            <CommandEmpty className="px-3 py-4 text-center text-[13px] text-muted-foreground">Aucun résultat.</CommandEmpty>
            <CommandGroup className="p-0">
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => handleSelect(option.value)}
                  className={cn(
                    'mx-1 flex cursor-pointer items-center justify-between gap-2 rounded-[1px] px-2 py-1.5 text-[13px] leading-5',
                    'data-[selected=true]:bg-secondary data-[selected=true]:text-foreground',
                    value === option.value && 'font-medium'
                  )}
                >
                  <span className="min-w-0">{option.label}</span>
                  {value === option.value && <Check className="h-3.5 w-3.5 shrink-0" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};