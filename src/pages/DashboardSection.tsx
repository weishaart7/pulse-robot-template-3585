import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import FamilleSection from './famille/FamilleSection';
import { PatrimoineSection } from './patrimoine/PatrimoineSection';
import { ImmobilierSection } from './immobilier/ImmobilierSection';
import { BudgetSection } from './budget/BudgetSection';
import { TransmissionSection } from './transmission/TransmissionSection';
import { SocietesSection } from './societes/SocietesSection';
import { RetraiteSection } from './retraite/RetraiteSection';
import FiscaliteSection from './fiscalite/FiscaliteSection';
import BlogSection from './blog/BlogSection';
import { AgendaSection } from './agenda/AgendaSection';

const DashboardSection = () => {
  const { section } = useParams();
  
  const getSectionTitle = (section: string) => {
    const titles: { [key: string]: string } = {
      famille: 'Famille',
      patrimoine: 'Patrimoine',
      immobilier: 'Immobilier',
      societes: 'Sociétés',
      retraite: 'Retraite',
      budget: 'Budget',
      fiscalite: 'Fiscalité',
      transmission: 'Transmission',
      blog: 'Blog',
      strategies: 'Stratégies',
      agenda: 'Agenda'
    };
    return titles[section] || 'Section inconnue';
  };

  const getSectionDescription = (section: string) => {
    const descriptions: { [key: string]: string } = {
      famille: 'Gérez les informations et la composition de votre famille',
      patrimoine: 'Suivez l\'évolution et la répartition de votre patrimoine',
      immobilier: 'Gérez et optimisez votre patrimoine immobilier',
      societes: 'Administrez vos participations et structures sociétaires',
      retraite: 'Planifiez et optimisez votre retraite',
      budget: 'Contrôlez vos revenus, dépenses et objectifs financiers',
      fiscalite: 'Optimisez votre situation fiscale',
      transmission: 'Préparez la transmission de votre patrimoine',
      blog: 'Articles, conseils et fiches pratiques pour gérer votre patrimoine',
      strategies: 'Définissez vos stratégies d\'investissement',
      agenda: 'Gérez vos rendez-vous et événements'
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
  
  // Si la section est "immobilier", afficher le composant spécialisé
  if (section === 'immobilier') {
    return <ImmobilierSection />;
  }
  
  // Si la section est "budget", afficher le composant spécialisé
  if (section === 'budget') {
    return <BudgetSection />;
  }
  
  // Si la section est "transmission", afficher le composant spécialisé
  if (section === 'transmission') {
    return <TransmissionSection />;
  }
  
  // Si la section est "sociétés", afficher le composant spécialisé
  if (section === 'societes') {
    return <SocietesSection />;
  }
  
  // Si la section est "retraite", afficher le composant spécialisé
  if (section === 'retraite') {
    return <RetraiteSection />;
  }
  
  // Si la section est "fiscalite", afficher le composant spécialisé
  if (section === 'fiscalite') {
    return <FiscaliteSection />;
  }
  
  // Si la section est "blog", afficher le composant spécialisé
  if (section === 'blog') {
    return <BlogSection />;
  }
  
  // Si la section est "agenda", afficher le composant spécialisé
  if (section === 'agenda') {
    return <AgendaSection />;
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