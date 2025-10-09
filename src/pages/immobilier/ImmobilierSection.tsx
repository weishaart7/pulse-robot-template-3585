import React, { useState } from 'react';
import AnimatedBackground from '@/components/ui/animated-tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const ImmobilierSection = () => {
  const [activeTab, setActiveTab] = useState('biens');

  const TABS = [
    { id: 'biens', label: 'Vue d\'ensemble' },
    { id: 'valorisation', label: 'Mes biens' },
    { id: 'revenus', label: 'Gestion des biens' },
    { id: 'fiscalite', label: 'Fiscalité' }
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
              <CardTitle>Valorisation des biens</CardTitle>
              <CardDescription>
                Suivi de la valeur de votre patrimoine immobilier
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📈</div>
                <h3 className="text-lg font-semibold mb-2">Section à venir</h3>
                <p className="text-muted-foreground">
                  Outils de valorisation et d'évaluation de vos biens immobiliers.
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
      case 'fiscalite':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Fiscalité immobilière</CardTitle>
              <CardDescription>
                Optimisation fiscale de votre patrimoine immobilier
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🧾</div>
                <h3 className="text-lg font-semibold mb-2">Section à venir</h3>
                <p className="text-muted-foreground">
                  Outils d'optimisation fiscale pour vos investissements immobiliers.
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