import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FicheClientForm } from './components/FicheClientForm';
import { SituationMatrimonialeForm } from './components/SituationMatrimonialeForm';
import { LiensFamiliauxForm } from './components/LiensFamiliauxForm';
import { GenealogyTree } from '@/components/GenealogyTree';
import { useFamilyProfile, useMaritalStatus, useFamilyLinks } from '@/hooks/useFamilyData';

const FamilleSection = () => {
  const { data: familyProfile } = useFamilyProfile();
  const { data: maritalStatus } = useMaritalStatus();
  const { data: familyMembers, updateLink } = useFamilyLinks();

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Famille</h2>
        <p className="text-muted-foreground">
          Gérez les informations et la composition de votre famille
        </p>
      </div>
      
      <Tabs defaultValue="arbre-genealogique" className="w-full">
        <TabsList variant="line" className="w-full">
          <TabsTrigger value="arbre-genealogique">Arbre généalogique</TabsTrigger>
          <TabsTrigger value="fiche-client">Fiche client</TabsTrigger>
          <TabsTrigger value="situation-matrimoniale">
            Situation matrimoniale
          </TabsTrigger>
          <TabsTrigger value="liens-familiaux">
            Liens familiaux
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="arbre-genealogique" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Arbre généalogique</CardTitle>
              <CardDescription>
                Visualisation interactive de votre famille - cliquez sur un membre pour voir ses détails
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GenealogyTree 
                familyProfile={familyProfile}
                maritalStatus={maritalStatus}
                familyMembers={familyMembers}
                onEditMember={(member) => {
                  // TODO: Implémenter l'ouverture du formulaire d'édition
                  console.log('Edit member:', member);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
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
                Renseignez votre statut matrimonial et vos informations de couple
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SituationMatrimonialeForm />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="liens-familiaux" className="mt-6">
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FamilleSection;