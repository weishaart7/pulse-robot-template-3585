import React, { useState } from 'react';
import AnimatedBackground from '@/components/ui/animated-tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DerniersArticles } from './components/DerniersArticles';
import { FichesMemoire } from './components/FichesMemoire';

const BlogSection = () => {
  const [activeTab, setActiveTab] = useState('derniers-articles');

  const TABS = [
    { id: 'derniers-articles', label: 'Derniers articles' },
    { id: 'fiches-memoire', label: 'Fiches mémoire' }
  ];

  const renderContent = () => {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Section en développement 🚧</CardTitle>
          <CardDescription>
            Cette section sera bientôt disponible
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Le contenu de la section Blog est en cours de développement. 
            Revenez bientôt pour découvrir nos articles et fiches pratiques.
          </p>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Blog</h2>
          <p className="text-muted-foreground">
            Articles, conseils et fiches pratiques pour gérer votre patrimoine
          </p>
        </div>
      </div>

      <div className="mb-6 flex justify-start">
        <div className="rounded-[8px] bg-muted p-[2px]">
          <AnimatedBackground
            defaultValue="derniers-articles"
            onValueChange={(value) => setActiveTab(value || 'derniers-articles')}
            className="rounded-lg bg-background shadow-sm"
            transition={{
              ease: "easeInOut",
              duration: 0.2,
            }}
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                data-id={tab.id}
                type="button"
                className="inline-flex min-w-24 items-center justify-center px-3 py-2 text-sm font-medium text-foreground transition-transform active:scale-[0.98]"
              >
                {tab.label}
              </button>
            ))}
          </AnimatedBackground>
        </div>
      </div>

      <div className="mt-6">
        {renderContent()}
      </div>
    </div>
  );
};

export default BlogSection;