import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FicheClientForm } from './components/FicheClientForm';
import { SituationMatrimonialeForm } from './components/SituationMatrimonialeForm';
import { LiensFamiliauxForm } from './components/LiensFamiliauxForm';

const FamilleSection = () => {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Famille</h2>
        <p className="text-muted-foreground">
          Gérez les informations et la composition de votre famille
        </p>
      </div>
      
      <Tabs defaultValue="fiche-client" className="w-full">
        <TabsList variant="line" className="w-full">
          <TabsTrigger value="fiche-client">Fiche client</TabsTrigger>
          <TabsTrigger value="situation-matrimoniale">
            Situation matrimoniale
          </TabsTrigger>
          <TabsTrigger value="liens-familiaux">
            Liens familiaux
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="fiche-client" className="mt-8">
          <Card className="border-0 bg-card/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Fiche client</CardTitle>
              <CardDescription className="text-muted-foreground/80">
                Informations personnelles du client principal
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <FicheClientForm />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="situation-matrimoniale" className="mt-8">
          <Card className="border-0 bg-card/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Situation matrimoniale</CardTitle>
              <CardDescription className="text-muted-foreground/80">
                Renseignez votre statut matrimonial et vos informations de couple
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <SituationMatrimonialeForm />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="liens-familiaux" className="mt-8">
          <Card className="border-0 bg-card/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Liens familiaux</CardTitle>
              <CardDescription className="text-muted-foreground/80">
                Gérez les membres de votre famille et leurs relations
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <LiensFamiliauxForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FamilleSection;