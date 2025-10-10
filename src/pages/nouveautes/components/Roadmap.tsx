import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Target, Clock } from 'lucide-react';

export const Roadmap = () => {
  const roadmapItems = [
    {
      id: 1,
      titre: 'Export PDF des rapports',
      description: 'Génération de rapports PDF personnalisables pour tous les modules',
      statut: 'En cours',
      trimestre: 'T4 2025',
      priorite: 'Haute'
    },
    {
      id: 2,
      titre: 'Comparateur de scénarios',
      description: 'Outil de simulation et comparaison de différents scénarios patrimoniaux',
      statut: 'Planifié',
      trimestre: 'T1 2026',
      priorite: 'Moyenne'
    },
    {
      id: 3,
      titre: 'Intégration bancaire',
      description: 'Synchronisation automatique avec vos comptes bancaires',
      statut: 'Planifié',
      trimestre: 'T2 2026',
      priorite: 'Haute'
    }
  ];

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'En cours':
        return 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20';
      case 'Planifié':
        return 'bg-muted text-muted-foreground hover:bg-muted/80';
      default:
        return 'bg-muted text-muted-foreground hover:bg-muted/80';
    }
  };

  const getPrioriteColor = (priorite: string) => {
    switch (priorite) {
      case 'Haute':
        return 'bg-red-500/10 text-red-500 hover:bg-red-500/20';
      case 'Moyenne':
        return 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20';
      case 'Basse':
        return 'bg-green-500/10 text-green-500 hover:bg-green-500/20';
      default:
        return 'bg-muted text-muted-foreground hover:bg-muted/80';
    }
  };

  return (
    <div className="space-y-4">
      {roadmapItems.map((item) => (
        <Card key={item.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <CardTitle className="text-lg">{item.titre}</CardTitle>
                </div>
                <CardDescription>{item.description}</CardDescription>
              </div>
              <div className="flex flex-col gap-2 ml-4">
                <Badge className={getStatutColor(item.statut)}>
                  {item.statut}
                </Badge>
                <Badge className={getPrioriteColor(item.priorite)}>
                  {item.priorite}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="h-4 w-4 mr-2" />
              {item.trimestre}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
