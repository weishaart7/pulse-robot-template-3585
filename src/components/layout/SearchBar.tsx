import React, { useState, useRef, useEffect } from 'react';
import { Search, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
interface SearchResult {
  title: string;
  section: string;
  path: string;
}
const searchData: SearchResult[] = [
// Famille
{
  title: "Fiche client",
  section: "Famille",
  path: "/dashboard/famille"
}, {
  title: "Liens familiaux",
  section: "Famille",
  path: "/dashboard/famille"
}, {
  title: "Situation matrimoniale",
  section: "Famille",
  path: "/dashboard/famille"
},
// Patrimoine
{
  title: "Vue d'ensemble patrimoine",
  section: "Patrimoine",
  path: "/dashboard/patrimoine"
}, {
  title: "Répartition patrimoine",
  section: "Patrimoine",
  path: "/dashboard/patrimoine"
}, {
  title: "Graphiques patrimoine",
  section: "Patrimoine",
  path: "/dashboard/patrimoine"
},
// Budget
{
  title: "Revenus",
  section: "Budget",
  path: "/dashboard/budget"
}, {
  title: "Charges",
  section: "Budget",
  path: "/dashboard/budget"
}, {
  title: "Résumé budget",
  section: "Budget",
  path: "/dashboard/budget"
},
// Fiscalité
{
  title: "IFI",
  section: "Fiscalité",
  path: "/dashboard/fiscalite"
}, {
  title: "Déclarations fiscales",
  section: "Fiscalité",
  path: "/dashboard/fiscalite"
}, {
  title: "Taux d'imposition",
  section: "Fiscalité",
  path: "/dashboard/fiscalite"
},
// Retraite
{
  title: "Carrière",
  section: "Retraite",
  path: "/dashboard/retraite"
}, {
  title: "Trimestres",
  section: "Retraite",
  path: "/dashboard/retraite"
}, {
  title: "Épargne retraite",
  section: "Retraite",
  path: "/dashboard/retraite"
},
// Sociétés
{
  title: "Stratégies sociétés",
  section: "Sociétés",
  path: "/dashboard/societes"
}, {
  title: "Synthèse sociétés",
  section: "Sociétés",
  path: "/dashboard/societes"
},
// Transmission
{
  title: "Premier décès",
  section: "Transmission",
  path: "/dashboard/transmission"
}, {
  title: "Deuxième décès",
  section: "Transmission",
  path: "/dashboard/transmission"
}, {
  title: "Donations",
  section: "Transmission",
  path: "/dashboard/transmission"
}, {
  title: "Legs",
  section: "Transmission",
  path: "/dashboard/transmission"
}];
export function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  useEffect(() => {
    if (query.trim()) {
      const filtered = searchData.filter(item => item.title.toLowerCase().includes(query.toLowerCase()) || item.section.toLowerCase().includes(query.toLowerCase()));
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
  return <div ref={searchRef} className="relative max-w-[400px]">
      <div className="relative">
        <Input placeholder="Rechercher une section..." type="search" value={query} onChange={e => setQuery(e.target.value)} className="peer pe-9 ps-9 mx-0 px-0 py-[22px] border-[#FF002F]/20 placeholder:text-[#FF002F]/50 focus:border-[#FF002F]/60 focus:ring-2 focus:ring-[#FF002F]/20 transition-all duration-200 rounded-lg shadow-sm" style={{ backgroundColor: 'rgba(100, 3, 17, 0.5)', color: '#FF002F' }} />
        <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50 transition-colors duration-200" style={{ color: 'rgba(255, 0, 47, 0.7)' }}>
          <Search size={16} strokeWidth={2} />
        </div>
        <button className="absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-lg outline-offset-2 transition-all duration-200 hover:opacity-80 hover:scale-110 focus:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50" aria-label="Submit search" type="submit" style={{ color: 'rgba(255, 0, 47, 0.8)' }}>
          <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      {isOpen && results.length > 0 && <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {results.map((result, index) => <div key={index} onClick={() => handleResultClick(result)} className="flex items-center justify-between px-3 py-2 hover:bg-muted cursor-pointer border-b border-border last:border-b-0">
              <span className="text-sm text-foreground">{result.title}</span>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                {result.section}
              </span>
            </div>)}
        </div>}
    </div>;
}