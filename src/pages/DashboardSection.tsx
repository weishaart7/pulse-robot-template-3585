import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import FamilleSection from './famille/FamilleSection';
import { PatrimoineSection } from './patrimoine/PatrimoineSection';
import { BudgetSection } from './budget/BudgetSection';

const DashboardSection = () => {
  const { section } = useParams();
  
  const getSectionTitle = (section: string) => {
    const titles: { [key: string]: string } = {
      famille: 'Famille',
      patrimoine: 'Patrimoine',
      societes: 'Sociétés',
      retraite: 'Retraite',
      budget: 'Budget',
      fiscalite: 'Fiscalité',
      transmission: 'Transmission',
      strategies: 'Stratégies'
    };
    return titles[section] || 'Section inconnue';
  };

  const getSectionDescription = (section: string) => {
    const descriptions: { [key: string]: string } = {
      famille: 'Gérez les informations et la composition de votre famille',
      patrimoine: 'Suivez l\'évolution et la répartition de votre patrimoine',
      societes: 'Administrez vos participations et structures sociétaires',
      retraite: 'Planifiez et optimisez votre retraite',
      budget: 'Contrôlez vos revenus, dépenses et objectifs financiers',
      fiscalite: 'Optimisez votre situation fiscale',
      transmission: 'Préparez la transmission de votre patrimoine',
      strategies: 'Définissez vos stratégies d\'investissement'
    };
    return descriptions[section] || 'Description non disponible';
  };

  // Si la section est "famille", afficher le composant spécialisé
  if (section === 'famille') {
    return <FamilleSection />;
  }
  
  // Si la section est "patrimoine", afficher le composant spécialisé
  if (section === 'patrimoine') {
    return <PatrimoineSection />;
  }
  
  // Si la section est "budget", afficher le composant spécialisé
  if (section === 'budget') {
    return <BudgetSection />;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">
          {getSectionTitle(section || '')}
        </h2>
        <p className="text-muted-foreground">
          {getSectionDescription(section || '')}
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Section en développement</CardTitle>
          <CardDescription>
            Cette section sera bientôt disponible
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Le contenu de la section "{getSectionTitle(section || '')}" est en cours de développement. 
            Revenez bientôt pour découvrir les nouvelles fonctionnalités.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardSection;