import React, { useState } from 'react';
import AnimatedBackground from '@/components/ui/animated-tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FicheClientForm } from './components/FicheClientForm';
import { SituationMatrimonialeForm } from './components/SituationMatrimonialeForm';
import { LiensFamiliauxForm } from './components/LiensFamiliauxForm';

const FamilleSection = () => {
  const [activeTab, setActiveTab] = useState('fiche-client');

  const TABS = [
    { id: 'fiche-client', label: 'Fiche client' },
    { id: 'situation-matrimoniale', label: 'Situation de couple' },
    { id: 'liens-familiaux', label: 'Liens familiaux' }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'fiche-client':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Fiche client</CardTitle>
              <CardDescription>
                Informations personnelles du client principal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FicheClientForm />
            </CardContent>
          </Card>
        );
      case 'situation-matrimoniale':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Situation de couple</CardTitle>
              <CardDescription>
                Renseignez votre statut de couple et vos informations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SituationMatrimonialeForm />
            </CardContent>
          </Card>
        );
      case 'liens-familiaux':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Liens familiaux</CardTitle>
              <CardDescription>
                Gérez les membres de votre famille et leurs relations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LiensFamiliauxForm />
            </CardContent>
          </Card>
        );
      default:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Fiche client</CardTitle>
              <CardDescription>
                Informations personnelles du client principal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FicheClientForm />
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Famille</h2>
          <p className="text-muted-foreground">
            Gérez les informations et la composition de votre famille
          </p>
        </div>
      </div>

      <div className="mb-6 flex justify-start">
        <div className="rounded-[8px] bg-muted p-[2px]">
          <AnimatedBackground
            defaultValue="fiche-client"
            onValueChange={(value) => setActiveTab(value || 'fiche-client')}
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

export default FamilleSection;