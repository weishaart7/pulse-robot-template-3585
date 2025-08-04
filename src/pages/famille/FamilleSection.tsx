import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FicheClientForm } from './components/FicheClientForm';

const FamilleSection = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Famille</h2>
        <p className="text-muted-foreground">
          Gérez les informations et la composition de votre famille
        </p>
      </div>
      
      <Tabs defaultValue="fiche-client" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="fiche-client">Fiche client</TabsTrigger>
          <TabsTrigger value="situation-matrimoniale" disabled>
            Situation matrimoniale
          </TabsTrigger>
          <TabsTrigger value="liens-familiaux" disabled>
            Liens familiaux
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="fiche-client" className="mt-6">
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
        </TabsContent>
        
        <TabsContent value="situation-matrimoniale" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Situation matrimoniale</CardTitle>
              <CardDescription>
                En cours de développement
              </CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>
        
        <TabsContent value="liens-familiaux" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Liens familiaux</CardTitle>
              <CardDescription>
                En cours de développement
              </CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FamilleSection;