import React, { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SearchResult {
  title: string;
  section: string;
  path: string;
}

const searchData: SearchResult[] = [
  // Famille
  { title: "Fiche client", section: "Famille", path: "/dashboard/famille" },
  { title: "Liens familiaux", section: "Famille", path: "/dashboard/famille" },
  { title: "Situation matrimoniale", section: "Famille", path: "/dashboard/famille" },
  
  // Patrimoine
  { title: "Vue d'ensemble", section: "Patrimoine", path: "/dashboard/patrimoine" },
  { title: "Répartition", section: "Patrimoine", path: "/dashboard/patrimoine" },
  { title: "Graphiques", section: "Patrimoine", path: "/dashboard/patrimoine" },
  
  // Budget
  { title: "Revenus", section: "Budget", path: "/dashboard/budget" },
  { title: "Charges", section: "Budget", path: "/dashboard/budget" },
  { title: "Résumé budget", section: "Budget", path: "/dashboard/budget" },
  
  // Fiscalité
  { title: "IFI", section: "Fiscalité", path: "/dashboard/fiscalite" },
  { title: "Déclarations fiscales", section: "Fiscalité", path: "/dashboard/fiscalite" },
  { title: "Taux d'imposition", section: "Fiscalité", path: "/dashboard/fiscalite" },
  
  // Retraite
  { title: "Carrière", section: "Retraite", path: "/dashboard/retraite" },
  { title: "Trimestres", section: "Retraite", path: "/dashboard/retraite" },
  { title: "Épargne retraite", section: "Retraite", path: "/dashboard/retraite" },
  
  // Sociétés
  { title: "Stratégies sociétés", section: "Sociétés", path: "/dashboard/societes" },
  { title: "Synthèse sociétés", section: "Sociétés", path: "/dashboard/societes" },
  
  // Transmission
  { title: "Premier décès", section: "Transmission", path: "/dashboard/transmission" },
  { title: "Deuxième décès", section: "Transmission", path: "/dashboard/transmission" },
  { title: "Donations", section: "Transmission", path: "/dashboard/transmission" },
  { title: "Legs", section: "Transmission", path: "/dashboard/transmission" },
];

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (query.trim()) {
      const filtered = searchData.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.section.toLowerCase().includes(query.toLowerCase())
      );
      setResults(filtered.slice(0, 5)); // Limit to 5 results
      setIsOpen(true);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResultClick = (result: SearchResult) => {
    navigate(result.path);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div ref={searchRef} className="relative flex-1 max-w-[400px] ml-auto">
      <div className="flex items-center flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 gap-2">
        <Search className="h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher une section..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 outline-none text-sm placeholder:text-gray-400"
        />
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {results.map((result, index) => (
            <div
              key={index}
              onClick={() => handleResultClick(result)}
              className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
            >
              <span className="text-sm text-gray-900">{result.title}</span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {result.section}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}