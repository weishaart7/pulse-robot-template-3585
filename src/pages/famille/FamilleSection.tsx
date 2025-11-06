import React, { useState } from 'react';
import AnimatedBackground from '@/components/ui/animated-tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ClientInfoCard } from '@/components/ui/info-card';
import { FicheClientForm } from './components/FicheClientForm';
import { SituationMatrimonialeForm } from './components/SituationMatrimonialeForm';
import { LiensFamiliauxForm } from './components/LiensFamiliauxForm';
import { useFamilyProfile } from '@/hooks/useFamilyData';

const FamilleSection = () => {
  const [activeTab, setActiveTab] = useState('fiche-client');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: familyProfile } = useFamilyProfile();

  const TABS = [
    { id: 'fiche-client', label: 'Fiche client' },
    { id: 'situation-matrimoniale', label: 'Situation de couple' },
    { id: 'liens-familiaux', label: 'Liens familiaux' }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'fiche-client':
        return null; // La carte s'affiche toujours au-dessus
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
        return null;
    }
  };

  const clientName = familyProfile?.prenom && familyProfile?.nom 
    ? `${familyProfile.prenom} ${familyProfile.nom}` 
    : 'Client';
  const clientRole = familyProfile?.profession || 'Non renseigné';
  const clientEmail = familyProfile?.email;
  const tags = familyProfile?.nationalite ? [familyProfile.nationalite] : [];

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

      {/* Carte d'information client - uniquement sur l'onglet Fiche client */}
      {activeTab === 'fiche-client' && (
        <div className="mt-6 flex justify-start">
          <ClientInfoCard
            name={clientName}
            role={clientRole}
            status="online"
            email={clientEmail}
            tags={tags}
            onClick={() => setIsDialogOpen(true)}
          />
        </div>
      )}

      {/* Contenu des onglets */}
      {activeTab !== 'fiche-client' && (
        <div className="mt-6">
          {renderContent()}
        </div>
      )}

      {/* Dialog pour modifier les informations */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier les informations client</DialogTitle>
            <DialogDescription>Modifiez les informations, puis enregistrez.</DialogDescription>
          </DialogHeader>
          <FicheClientForm />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FamilleSection;