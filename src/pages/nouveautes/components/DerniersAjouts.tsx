import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus } from 'lucide-react';

export const DerniersAjouts = () => {
  const ajouts = [
    {
      id: 1,
      titre: 'Démembrement de propriété',
      description: 'Gestion complète du démembrement avec usufruit et nue-propriété',
      date: '2025-10-10',
      type: 'Fonctionnalité'
    },
    {
      id: 2,
      titre: 'Nouveaux types d\'actifs',
      description: 'Ajout de nombreux types d\'actifs financiers (options, CDS, contrats à terme...)',
      date: '2025-10-10',
      type: 'Amélioration'
    }
  ];

  return (
    <div className="space-y-4">
      {ajouts.map((ajout) => (
        <Card key={ajout.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-primary" />
                  <CardTitle className="text-lg">{ajout.titre}</CardTitle>
                </div>
                <CardDescription>{ajout.description}</CardDescription>
              </div>
              <Badge variant="secondary" className="ml-4">
                {ajout.type}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 mr-2" />
              {new Date(ajout.date).toLocaleDateString('fr-FR', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
