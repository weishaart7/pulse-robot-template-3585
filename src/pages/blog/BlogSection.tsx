import React, { useState } from 'react';
import AnimatedBackground from '@/components/ui/animated-tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DerniersArticles } from './components/DerniersArticles';
import { FichesMemoire } from './components/FichesMemoire';
import { AdminArticleList } from '@/components/blog/AdminArticleList';
import { useUserRole } from '@/hooks/useUserRole';
import { Shield } from 'lucide-react';

const BlogSection = () => {
  const [activeTab, setActiveTab] = useState('derniers-articles');
  const { isAdmin, isLoading } = useUserRole();

  const TABS = isAdmin
    ? [
        { id: 'admin', label: 'Administration' },
        { id: 'derniers-articles', label: 'Derniers articles' },
        { id: 'fiches-memoire', label: 'Fiches mémoire' }
      ]
    : [
        { id: 'derniers-articles', label: 'Derniers articles' },
        { id: 'fiches-memoire', label: 'Fiches mémoire' }
      ];

  const renderContent = () => {
    if (activeTab === 'admin' && isAdmin) {
      return <AdminArticleList />;
    }
    
    if (activeTab === 'derniers-articles') {
      return <DerniersArticles />;
    }
    
    if (activeTab === 'fiches-memoire') {
      return <FichesMemoire />;
    }
    
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

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Blog</h2>
            <p className="text-muted-foreground">
              Articles, conseils et fiches pratiques pour gérer votre patrimoine
            </p>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-md">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Mode Administrateur</span>
            </div>
          )}
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