import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SearchResult {
  title: string;
  section: string;
  path: string;
}

const searchData: SearchResult[] = [
  { title: "Fiche client", section: "Famille", path: "/dashboard/famille" },
  { title: "Liens familiaux", section: "Famille", path: "/dashboard/famille" },
  { title: "Situation matrimoniale", section: "Famille", path: "/dashboard/famille" },
  { title: "Vue d'ensemble patrimoine", section: "Patrimoine", path: "/dashboard/patrimoine" },
  { title: "Répartition patrimoine", section: "Patrimoine", path: "/dashboard/patrimoine" },
  { title: "Graphiques patrimoine", section: "Patrimoine", path: "/dashboard/patrimoine" },
  { title: "Revenus", section: "Budget", path: "/dashboard/budget" },
  { title: "Charges", section: "Budget", path: "/dashboard/budget" },
  { title: "Résumé budget", section: "Budget", path: "/dashboard/budget" },
  { title: "IFI", section: "Fiscalité", path: "/dashboard/fiscalite" },
  { title: "Déclarations fiscales", section: "Fiscalité", path: "/dashboard/fiscalite" },
  { title: "Taux d'imposition", section: "Fiscalité", path: "/dashboard/fiscalite" },
  { title: "Carrière", section: "Retraite", path: "/dashboard/retraite" },
  { title: "Trimestres", section: "Retraite", path: "/dashboard/retraite" },
  { title: "Épargne retraite", section: "Retraite", path: "/dashboard/retraite" },
  { title: "Stratégies sociétés", section: "Sociétés", path: "/dashboard/societes" },
  { title: "Synthèse sociétés", section: "Sociétés", path: "/dashboard/societes" },
  { title: "Premier décès", section: "Transmission", path: "/dashboard/transmission" },
  { title: "Deuxième décès", section: "Transmission", path: "/dashboard/transmission" },
  { title: "Donations", section: "Transmission", path: "/dashboard/transmission" },
  { title: "Legs", section: "Transmission", path: "/dashboard/transmission" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SidebarSearchDialog({ open, onOpenChange }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (query.trim()) {
      const filtered = searchData.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.section.toLowerCase().includes(query.toLowerCase())
      );
      setResults(filtered.slice(0, 8));
    } else {
      setResults([]);
    }
  }, [query]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
    }
  }, [open]);

  const handleResultClick = (result: SearchResult) => {
    navigate(result.path);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <div className="relative border-b border-border">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <Input
            autoFocus
            placeholder="Rechercher une section..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 pl-11 h-12 text-sm"
          />
        </div>
        {results.length > 0 && (
          <div className="max-h-80 overflow-y-auto py-2">
            {results.map((result, index) => (
              <button
                key={index}
                onClick={() => handleResultClick(result)}
                className="w-full flex items-center justify-between px-4 py-2 hover:bg-muted text-left transition-colors"
              >
                <span className="text-sm text-foreground">{result.title}</span>
                <span className="text-xs text-muted-foreground">{result.section}</span>
              </button>
            ))}
          </div>
        )}
        {query && results.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            Aucun résultat
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
