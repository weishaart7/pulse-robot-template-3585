import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Eye, BookOpen } from 'lucide-react';

export const FichesMemoire = () => {
  const fiches = [
    {
      id: 1,
      title: "Barème de l'impôt sur le revenu 2024",
      description: "Tableau récapitulatif des tranches d'imposition et taux marginaux pour 2024.",
      category: "Fiscalité",
      type: "PDF",
      pages: 2,
      size: "156 KB",
      downloads: 1250
    },
    {
      id: 2,
      title: "Check-list succession",
      description: "Liste des documents et démarches essentielles à effectuer lors d'une succession.",
      category: "Transmission",
      type: "PDF", 
      pages: 4,
      size: "245 KB",
      downloads: 890
    },
    {
      id: 3,
      title: "Plafonds et seuils sociaux 2024",
      description: "Récapitulatif des plafonds de sécurité sociale, seuils d'exonération et cotisations.",
      category: "Social",
      type: "PDF",
      pages: 3,
      size: "198 KB", 
      downloads: 2100
    },
    {
      id: 4,
      title: "Guide de l'IFI",
      description: "Mémo complet sur l'Impôt sur la Fortune Immobilière : calcul, déclaration, stratégies.",
      category: "Fiscalité",
      type: "PDF",
      pages: 6,
      size: "320 KB",
      downloads: 750
    },
    {
      id: 5,
      title: "Optimisation du PEA",
      description: "Fiche pratique pour maximiser les avantages fiscaux de votre Plan d'Épargne en Actions.",
      category: "Investissement", 
      type: "PDF",
      pages: 3,
      size: "180 KB",
      downloads: 1450
    },
    {
      id: 6,
      title: "Régimes matrimoniaux : comparatif",
      description: "Tableau comparatif des différents régimes matrimoniaux et leurs implications.",
      category: "Patrimoine",
      type: "PDF",
      pages: 5,
      size: "275 KB",
      downloads: 680
    }
  ];

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'Fiscalité': 'bg-blue-100 text-blue-800',
      'Transmission': 'bg-green-100 text-green-800', 
      'Social': 'bg-purple-100 text-purple-800',
      'Investissement': 'bg-orange-100 text-orange-800',
      'Patrimoine': 'bg-pink-100 text-pink-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        {fiches.map((fiche) => (
          <Card key={fiche.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <BookOpen className="h-5 w-5 text-muted-foreground" />
                    <Badge className={getCategoryColor(fiche.category)}>
                      {fiche.category}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {fiche.type} • {fiche.pages} pages • {fiche.size}
                    </span>
                  </div>
                  
                  <h3 className="font-semibold text-lg mb-2">{fiche.title}</h3>
                  <p className="text-muted-foreground mb-4">{fiche.description}</p>
                  
                  <div className="text-sm text-muted-foreground">
                    {fiche.downloads.toLocaleString()} téléchargements
                  </div>
                </div>
                
                <div className="flex gap-2 ml-4">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    Aperçu
                  </Button>
                  <Button size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="text-center">
        <button className="text-primary hover:underline">
          Voir toutes les fiches →
        </button>
      </div>
    </div>
  );
};