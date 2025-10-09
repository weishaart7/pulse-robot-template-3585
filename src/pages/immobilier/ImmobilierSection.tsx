import React, { useState } from 'react';
import AnimatedBackground from '@/components/ui/animated-tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export const ImmobilierSection = () => {
  const [activeTab, setActiveTab] = useState('biens');

  const TABS = [
    { id: 'biens', label: 'Vue d\'ensemble' },
    { id: 'valorisation', label: 'Mes biens' },
    { id: 'revenus', label: 'Gestion des biens' }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'biens':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Mes biens immobiliers</CardTitle>
              <CardDescription>
                Gérez votre portefeuille immobilier
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🏠</div>
                <h3 className="text-lg font-semibold mb-2">Section à venir</h3>
                <p className="text-muted-foreground">
                  Cette section permettra de gérer vos biens immobiliers, 
                  leur valorisation et leurs revenus.
                </p>
              </div>
            </CardContent>
          </Card>
        );
      case 'valorisation':
        return (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Mes biens</CardTitle>
                  <CardDescription>
                    Gérez votre portefeuille immobilier
                  </CardDescription>
                </div>
                <Button onClick={() => console.log('Ajouter un bien')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un bien
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🏘️</div>
                <h3 className="text-lg font-semibold mb-2">Aucun bien pour le moment</h3>
                <p className="text-muted-foreground">
                  Commencez par ajouter votre premier bien immobilier.
                </p>
              </div>
            </CardContent>
          </Card>
        );
      case 'revenus':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Revenus locatifs</CardTitle>
              <CardDescription>
                Gestion des revenus de votre patrimoine immobilier
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <div className="text-4xl mb-4">💰</div>
                <h3 className="text-lg font-semibold mb-2">Section à venir</h3>
                <p className="text-muted-foreground">
                  Suivi et optimisation de vos revenus locatifs.
                </p>
              </div>
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Immobilier</h2>
          <p className="text-muted-foreground">
            Gérez et optimisez votre patrimoine immobilier
          </p>
        </div>
      </div>

      <div className="mb-6 flex justify-start">
        <div className="rounded-[8px] bg-muted p-[2px]">
          <AnimatedBackground
            defaultValue="biens"
            onValueChange={(value) => setActiveTab(value || 'biens')}
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