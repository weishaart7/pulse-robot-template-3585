import * as Select from "@radix-ui/react-select";
import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, Search, Check } from "lucide-react";
import { NATIONALITIES } from "@/constants/nationalities";

interface NationalitySelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function NationalitySelect({ value, onValueChange, placeholder = "Sélectionner une nationalité", className }: NationalitySelectProps) {
  const [searchValue, setSearchValue] = useState("");
  const [filteredNationalities, setFilteredNationalities] = useState([...NATIONALITIES]);

  const handleSearch = (e: React.FormEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;
    setSearchValue(value);
    
    const results = NATIONALITIES.filter((item) =>
      item.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredNationalities(results);
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setFilteredNationalities([...NATIONALITIES]);
      setSearchValue("");
    }
  };

  return (
    <Select.Root
      value={value}
      onValueChange={onValueChange}
      onOpenChange={handleOpenChange}
    >
      <div className={cn("w-full", className)}>
        <Select.Trigger className="w-full inline-flex items-center justify-between h-9 px-3 py-2 text-sm bg-muted border border-transparent rounded-md transition-shadow outline-none focus-visible:bg-background focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 text-foreground data-placeholder:text-muted-foreground">
          <Select.Value placeholder={placeholder}>
            {value}
          </Select.Value>
          <Select.Icon className="text-muted-foreground opacity-60">
            <ChevronDown className="w-4 h-4" />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            position="popper"
            avoidCollisions={false}
            className="w-[var(--radix-select-trigger-width)] overflow-hidden mt-1 bg-popover border border-border rounded-md shadow-lg text-sm z-[100]"
          >
            <div className="flex items-center border-b border-border bg-popover sticky top-0 z-10">
              <Search className="h-4 w-4 mx-3 text-muted-foreground shrink-0" />
              <input
                type="text"
                placeholder="Rechercher une nationalité..."
                value={searchValue}
                className="p-2 text-popover-foreground w-full rounded-md outline-none bg-popover"
                onChange={handleSearch}
                onKeyDown={(e) => {
                  e.stopPropagation();
                }}
              />
            </div>
            <Select.Viewport className="max-h-64 overflow-y-auto bg-popover">
              {filteredNationalities.length < 1 ? (
                <div className="px-3 py-2 text-muted-foreground bg-popover">Aucune nationalité trouvée.</div>
              ) : (
                filteredNationalities.map((item, idx) => (
                  <SelectItem key={idx} value={item}>
                    {item}
                  </SelectItem>
                ))
              )}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </div>
    </Select.Root>
  );
}

const SelectItem = React.forwardRef<
  React.ElementRef<typeof Select.Item>,
  React.ComponentPropsWithoutRef<typeof Select.Item>
>(({ children, className, ...props }, forwardedRef) => {
  return (
    <Select.Item
      className="flex items-center justify-between px-3 cursor-pointer py-2 duration-150 text-popover-foreground bg-popover data-[state=checked]:text-primary data-[state=checked]:bg-primary/10 data-[highlighted]:text-primary data-[highlighted]:bg-primary/10 hover:bg-accent hover:text-accent-foreground outline-none"
      {...props}
      ref={forwardedRef}
    >
      <Select.ItemText>
        <div className="pr-4 line-clamp-1">{children}</div>
      </Select.ItemText>
      <div className="w-4">
        <Select.ItemIndicator>
          <Check className="w-4 h-4 text-primary" />
        </Select.ItemIndicator>
      </div>
    </Select.Item>
  );
});
