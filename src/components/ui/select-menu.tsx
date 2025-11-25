import * as Select from "@radix-ui/react-select";
import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, Search, Check } from "lucide-react";

interface SelectMenuProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SelectMenu({ value, onValueChange, placeholder = "Sélectionner un pays", className }: SelectMenuProps) {
  // Liste complète des pays
  const allCountries = [
    "Afghanistan", "Afrique du Sud", "Albanie", "Algérie", "Allemagne", "Andorre", "Angola", "Antigua-et-Barbuda",
    "Arabie Saoudite", "Argentine", "Arménie", "Australie", "Autriche", "Azerbaïdjan", "Bahamas", "Bahreïn",
    "Bangladesh", "Barbade", "Belgique", "Belize", "Bénin", "Bhoutan", "Biélorussie", "Bolivie",
    "Bosnie-Herzégovine", "Botswana", "Brésil", "Brunei", "Bulgarie", "Burkina Faso", "Burundi", "Cambodge",
    "Cameroun", "Canada", "Cap-Vert", "République Centrafricaine", "Chili", "Chine", "Chypre", "Colombie",
    "Comores", "République du Congo", "République Démocratique du Congo", "Corée du Nord", "Corée du Sud",
    "Costa Rica", "Côte d'Ivoire", "Croatie", "Cuba", "Danemark", "Djibouti", "Dominique", "Égypte",
    "Émirats Arabes Unis", "Équateur", "Érythrée", "Espagne", "Estonie", "Eswatini", "États-Unis", "Éthiopie",
    "Fidji", "Finlande", "France", "Gabon", "Gambie", "Géorgie", "Ghana", "Grèce", "Grenade", "Guatemala",
    "Guinée", "Guinée-Bissau", "Guinée Équatoriale", "Guyana", "Haïti", "Honduras", "Hongrie", "Inde",
    "Indonésie", "Irak", "Iran", "Irlande", "Islande", "Israël", "Italie", "Jamaïque", "Japon", "Jordanie",
    "Kazakhstan", "Kenya", "Kirghizistan", "Kiribati", "Koweït", "Laos", "Lesotho", "Lettonie", "Liban",
    "Liberia", "Libye", "Liechtenstein", "Lituanie", "Luxembourg", "Macédoine du Nord", "Madagascar", "Malaisie",
    "Malawi", "Maldives", "Mali", "Malte", "Maroc", "Marshall", "Maurice", "Mauritanie", "Mexique", "Micronésie",
    "Moldavie", "Monaco", "Mongolie", "Monténégro", "Mozambique", "Myanmar", "Namibie", "Nauru", "Népal",
    "Nicaragua", "Niger", "Nigeria", "Norvège", "Nouvelle-Zélande", "Oman", "Ouganda", "Ouzbékistan",
    "Pakistan", "Palaos", "Palestine", "Panama", "Papouasie-Nouvelle-Guinée", "Paraguay", "Pays-Bas", "Pérou",
    "Philippines", "Pologne", "Portugal", "Qatar", "République Dominicaine", "République Tchèque", "Roumanie",
    "Royaume-Uni", "Russie", "Rwanda", "Saint-Christophe-et-Niévès", "Sainte-Lucie", "Saint-Marin",
    "Saint-Vincent-et-les-Grenadines", "Salomon", "Salvador", "Samoa", "São Tomé-et-Principe", "Sénégal",
    "Serbie", "Seychelles", "Sierra Leone", "Singapour", "Slovaquie", "Slovénie", "Somalie", "Soudan",
    "Soudan du Sud", "Sri Lanka", "Suède", "Suisse", "Suriname", "Syrie", "Tadjikistan", "Tanzanie", "Tchad",
    "Thaïlande", "Timor Oriental", "Togo", "Tonga", "Trinité-et-Tobago", "Tunisie", "Turkménistan", "Turquie",
    "Tuvalu", "Ukraine", "Uruguay", "Vanuatu", "Vatican", "Venezuela", "Vietnam", "Yémen", "Zambie", "Zimbabwe"
  ];

  const [searchValue, setSearchValue] = useState("");
  const [filteredCountries, setFilteredCountries] = useState(allCountries);

  const handleSearch = (e: React.FormEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;
    setSearchValue(value);
    
    const results = allCountries.filter((item) =>
      item.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredCountries(results);
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setFilteredCountries(allCountries);
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
        <Select.Trigger className="w-full inline-flex items-center justify-between h-9 px-3 py-2 text-sm bg-background border border-input rounded-lg shadow-sm shadow-black/5 transition-shadow outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 text-foreground data-placeholder:text-muted-foreground">
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
            className="w-[var(--radix-select-trigger-width)] overflow-hidden mt-1 bg-popover border border-border rounded-lg shadow-lg text-sm z-[100]"
          >
            <div className="flex items-center border-b border-border bg-popover sticky top-0 z-10">
              <Search className="h-4 w-4 mx-3 text-muted-foreground shrink-0" />
              <input
                type="text"
                placeholder="Rechercher un pays..."
                value={searchValue}
                className="p-2 text-popover-foreground w-full rounded-md outline-none bg-popover"
                onChange={handleSearch}
                onKeyDown={(e) => {
                  e.stopPropagation();
                }}
              />
            </div>
            <Select.Viewport className="max-h-64 overflow-y-auto bg-popover">
              {filteredCountries.length < 1 ? (
                <div className="px-3 py-2 text-muted-foreground bg-popover">Aucun pays trouvé.</div>
              ) : (
                filteredCountries.map((item, idx) => (
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
