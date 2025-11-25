import React, { useState } from "react";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SelectMenuProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

// Liste complète des pays (en dehors du composant pour éviter les recréations)
const ALL_COUNTRIES = [
  "Afghanistan",
  "Afrique du Sud",
  "Albanie",
  "Algérie",
  "Allemagne",
  "Andorre",
  "Angola",
  "Antigua-et-Barbuda",
  "Arabie Saoudite",
  "Argentine",
  "Arménie",
  "Australie",
  "Autriche",
  "Azerbaïdjan",
  "Bahamas",
  "Bahreïn",
  "Bangladesh",
  "Barbade",
  "Belgique",
  "Belize",
  "Bénin",
  "Bhoutan",
  "Biélorussie",
  "Bolivie",
  "Bosnie-Herzégovine",
  "Botswana",
  "Brésil",
  "Brunei",
  "Bulgarie",
  "Burkina Faso",
  "Burundi",
  "Cambodge",
  "Cameroun",
  "Canada",
  "Cap-Vert",
  "République Centrafricaine",
  "Chili",
  "Chine",
  "Chypre",
  "Colombie",
  "Comores",
  "République du Congo",
  "République Démocratique du Congo",
  "Corée du Nord",
  "Corée du Sud",
  "Costa Rica",
  "Côte d'Ivoire",
  "Croatie",
  "Cuba",
  "Danemark",
  "Djibouti",
  "Dominique",
  "Égypte",
  "Émirats Arabes Unis",
  "Équateur",
  "Érythrée",
  "Espagne",
  "Estonie",
  "Eswatini",
  "États-Unis",
  "Éthiopie",
  "Fidji",
  "Finlande",
  "France",
  "Gabon",
  "Gambie",
  "Géorgie",
  "Ghana",
  "Grèce",
  "Grenade",
  "Guatemala",
  "Guinée",
  "Guinée-Bissau",
  "Guinée Équatoriale",
  "Guyana",
  "Haïti",
  "Honduras",
  "Hongrie",
  "Inde",
  "Indonésie",
  "Irak",
  "Iran",
  "Irlande",
  "Islande",
  "Israël",
  "Italie",
  "Jamaïque",
  "Japon",
  "Jordanie",
  "Kazakhstan",
  "Kenya",
  "Kirghizistan",
  "Kiribati",
  "Koweït",
  "Laos",
  "Lesotho",
  "Lettonie",
  "Liban",
  "Liberia",
  "Libye",
  "Liechtenstein",
  "Lituanie",
  "Luxembourg",
  "Macédoine du Nord",
  "Madagascar",
  "Malaisie",
  "Malawi",
  "Maldives",
  "Mali",
  "Malte",
  "Maroc",
  "Marshall",
  "Maurice",
  "Mauritanie",
  "Mexique",
  "Micronésie",
  "Moldavie",
  "Monaco",
  "Mongolie",
  "Monténégro",
  "Mozambique",
  "Myanmar",
  "Namibie",
  "Nauru",
  "Népal",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "Norvège",
  "Nouvelle-Zélande",
  "Oman",
  "Ouganda",
  "Ouzbékistan",
  "Pakistan",
  "Palaos",
  "Palestine",
  "Panama",
  "Papouasie-Nouvelle-Guinée",
  "Paraguay",
  "Pays-Bas",
  "Pérou",
  "Philippines",
  "Pologne",
  "Portugal",
  "Qatar",
  "République Dominicaine",
  "République Tchèque",
  "Roumanie",
  "Royaume-Uni",
  "Russie",
  "Rwanda",
  "Saint-Christophe-et-Niévès",
  "Sainte-Lucie",
  "Saint-Marin",
  "Saint-Vincent-et-les-Grenadines",
  "Salomon",
  "Salvador",
  "Samoa",
  "São Tomé-et-Principe",
  "Sénégal",
  "Serbie",
  "Seychelles",
  "Sierra Leone",
  "Singapour",
  "Slovaquie",
  "Slovénie",
  "Somalie",
  "Soudan",
  "Soudan du Sud",
  "Sri Lanka",
  "Suède",
  "Suisse",
  "Suriname",
  "Syrie",
  "Tadjikistan",
  "Tanzanie",
  "Tchad",
  "Thaïlande",
  "Timor Oriental",
  "Togo",
  "Tonga",
  "Trinité-et-Tobago",
  "Tunisie",
  "Turkménistan",
  "Turquie",
  "Tuvalu",
  "Ukraine",
  "Uruguay",
  "Vanuatu",
  "Vatican",
  "Venezuela",
  "Vietnam",
  "Yémen",
  "Zambie",
  "Zimbabwe",
];

export default function SelectMenu({
  value,
  onValueChange,
  placeholder = "Sélectionner un pays",
  className,
}: SelectMenuProps) {
  const [searchValue, setSearchValue] = useState("");
  const [countries, setCountries] = useState<string[]>(ALL_COUNTRIES);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchValue(value);

    const results = ALL_COUNTRIES.filter((item) =>
      item.toLowerCase().includes(value.toLowerCase()),
    );

    setCountries(results);
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setCountries(ALL_COUNTRIES);
      setSearchValue("");
    }
  };

  return (
    <Select value={value} onValueChange={onValueChange} onOpenChange={handleOpenChange}>
      <div className={cn("w-full", className)}>
        <SelectTrigger size="lg">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent
          position="popper"
          className="w-[var(--radix-select-trigger-width)] p-0"
        >
          <div className="sticky top-0 z-10 flex items-center border-b border-border bg-popover">
            <Search className="h-4 w-4 mx-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher un pays..."
              value={searchValue}
              onChange={handleSearch}
              className="p-2 text-popover-foreground w-full rounded-md outline-none bg-popover"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {countries.length < 1 ? (
              <div className="px-3 py-2 text-muted-foreground bg-popover">
                Aucun pays trouvé.
              </div>
            ) : (
              countries.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))
            )}
          </div>
        </SelectContent>
      </div>
    </Select>
  );
}
