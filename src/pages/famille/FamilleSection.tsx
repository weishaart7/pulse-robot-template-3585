import React, { useState } from 'react';
import AnimatedBackground from '@/components/ui/animated-tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ClientInfoCard } from '@/components/ui/info-card';
import { FicheClientForm } from './components/FicheClientForm';
import { LiensFamiliauxForm } from './components/LiensFamiliauxForm';
import { useFamilyProfile, useMaritalStatus } from '@/hooks/useFamilyData';
import { PartnerInfoCard } from '@/components/famille/PartnerInfoCard';
import { PartnerDrawer } from '@/components/famille/PartnerDrawer';

const FamilleSection = () => {
  const [activeTab, setActiveTab] = useState('fiche-client');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPartnerDrawerOpen, setIsPartnerDrawerOpen] = useState(false);
  const [isSingle, setIsSingle] = useState(false);
  const { data: familyProfile } = useFamilyProfile();
  const { data: maritalData, saveData: saveMaritalData } = useMaritalStatus();

  const TABS = [
    { id: 'fiche-client', label: 'Fiche client' },
    { id: 'situation-matrimoniale', label: 'Situation de couple' },
    { id: 'liens-familiaux', label: 'Liens familiaux' }
  ];

  const handleToggleSingle = async (checked: boolean) => {
    setIsSingle(checked);
    if (checked) {
      await saveMaritalData({ statut_couple: 'Célibataire', parent_isole: false } as any);
    }
  };

  const hasPartner = maritalData?.statut_couple && 
    ['Concubinage', 'Pacsé(e)', 'Marié(e)'].includes(maritalData.statut_couple as string);
  
  const partnerName = maritalData?.prenom_conjoint && maritalData?.nom_conjoint
    ? `${maritalData.prenom_conjoint} ${maritalData.nom_conjoint}`
    : undefined;
  
  const relationStatus = maritalData?.statut_couple as string;
  
  const partnerAge = maritalData?.date_naissance_conjoint
    ? Math.floor((new Date().getTime() - new Date(maritalData.date_naissance_conjoint as string).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : undefined;

  const renderContent = () => {
    switch (activeTab) {
      case 'fiche-client':
        return null;
      case 'situation-matrimoniale':
        return null;
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
  const clientAge = familyProfile?.date_naissance 
    ? Math.floor((new Date().getTime() - new Date(familyProfile.date_naissance).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : undefined;
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
            age={clientAge}
            tags={tags}
            onClick={() => setIsDialogOpen(true)}
          />
        </div>
      )}

      {/* Carte partenaire - uniquement sur l'onglet Situation de couple */}
      {activeTab === 'situation-matrimoniale' && (
        <div className="mt-6 flex justify-start">
          <PartnerInfoCard
            hasPartner={hasPartner}
            partnerName={partnerName}
            relationStatus={relationStatus}
            partnerAge={partnerAge}
            isSingle={isSingle}
            onToggleSingle={handleToggleSingle}
            onAddPartner={() => setIsPartnerDrawerOpen(true)}
            onEditPartner={() => setIsPartnerDrawerOpen(true)}
          />
        </div>
      )}

      {/* Contenu des onglets */}
      {activeTab !== 'fiche-client' && activeTab !== 'situation-matrimoniale' && (
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

      {/* Drawer pour modifier le partenaire */}
      <PartnerDrawer
        open={isPartnerDrawerOpen}
        onOpenChange={setIsPartnerDrawerOpen}
      />
    </div>
  );
};

export default FamilleSection;