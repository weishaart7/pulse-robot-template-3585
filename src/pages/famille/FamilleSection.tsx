import React, { useState } from 'react';
import AnimatedBackground from '@/components/ui/animated-tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { FicheClientForm } from './components/FicheClientForm';
import { LiensFamiliauxForm } from './components/LiensFamiliauxForm';
import { useFamilyProfile, useMaritalStatus, useFamilyLinks } from '@/hooks/useFamilyData';
import { useFamilyImpacts } from '@/hooks/useFamilyImpacts';
import { PartnerForm } from "@/components/famille/PartnerForm";
import { RelationInfoDialog } from "@/components/famille/RelationInfoDialog";
import { FamilyImpactSummary } from '@/components/famille/FamilyImpactSummary';
import { FamilyOnboardingWizard } from '@/components/famille/FamilyOnboardingWizard';
import { User, Plus, Sparkles } from 'lucide-react';

const FamilleSection = () => {
  const [activeTab, setActiveTab] = useState('ma-famille');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPartnerDrawerOpen, setIsPartnerDrawerOpen] = useState(false);
  const [isSingle, setIsSingle] = useState(false);
  const [isRelationInfoOpen, setIsRelationInfoOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const { data: familyProfile, refetch: refetchProfile } = useFamilyProfile();
  const { data: maritalData, saveData: saveMaritalData, refetch: refetchMarital } = useMaritalStatus();
  const { data: familyLinks = [], loading: linksLoading } = useFamilyLinks();
  const impacts = useFamilyImpacts(familyLinks, familyProfile, maritalData);

  // Show onboarding wizard for new users - temporarily disabled
  // useEffect(() => {
  //   const hasSeenOnboarding = localStorage.getItem('family_onboarding_completed');
  //   if (!hasSeenOnboarding && !linksLoading && !familyLinks.length && familyProfile) {
  //     setIsOnboardingOpen(true);
  //   }
  // }, [linksLoading, familyLinks.length, familyProfile]);

  const handleOnboardingComplete = (data: any) => {
    localStorage.setItem('family_onboarding_completed', 'true');
    // Data will be handled by the form submission in each respective section
    console.log('Onboarding data:', data);
  };

  const TABS = [
    { id: 'ma-famille', label: 'Ma famille' },
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

  const clientName = familyProfile?.prenom && familyProfile?.nom 
    ? `${familyProfile.prenom} ${familyProfile.nom}` 
    : 'Utilisateur';
    
  const clientRole = familyProfile?.profession || 'Client';
  
  const clientAge = familyProfile?.date_naissance
    ? Math.floor((new Date().getTime() - new Date(familyProfile.date_naissance).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : undefined;

  const tags: string[] = [];
  if (familyProfile?.personne_handicapee) tags.push('Handicap');
  if (familyProfile?.nationalite && familyProfile.nationalite !== 'Française') tags.push(familyProfile.nationalite);

  const renderContent = () => {
    switch (activeTab) {
      case 'ma-famille':
        const clientSexe = familyProfile?.civility?.toLowerCase() === 'mme' ? 'F' : 'M';
        const partnerSexe = maritalData?.civilite_conjoint?.toLowerCase() === 'mme' ? 'F' : 'M';
        
        return (
          <>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Carte Utilisateur */}
              <div
                onClick={() => setIsDialogOpen(true)}
                className="group relative overflow-hidden rounded-3xl bg-card p-6 shadow-[12px_12px_24px_rgba(0,0,0,0.15),-12px_-12px_24px_rgba(255,255,255,0.9)] dark:shadow-[12px_12px_24px_rgba(0,0,0,0.3),-12px_-12px_24px_rgba(255,255,255,0.1)] transition-all duration-500 hover:shadow-[20px_20px_40px_rgba(0,0,0,0.2),-20px_-20px_40px_rgba(255,255,255,1)] dark:hover:shadow-[20px_20px_40px_rgba(0,0,0,0.4),-20px_-20px_40px_rgba(255,255,255,0.15)] hover:scale-105 hover:-translate-y-2 cursor-pointer"
              >
                <div className="mb-4 flex justify-center relative z-10">
                  <div className="relative group-hover:animate-pulse">
                    <div className="h-28 w-28 overflow-hidden rounded-full bg-muted p-1 shadow-[inset_6px_6px_12px_rgba(0,0,0,0.1),inset_-6px_-6px_12px_rgba(255,255,255,0.9)] dark:shadow-[inset_6px_6px_12px_rgba(0,0,0,0.3),inset_-6px_-6px_12px_rgba(255,255,255,0.1)] transition-all duration-500 group-hover:shadow-[inset_8px_8px_16px_rgba(0,0,0,0.15),inset_-8px_-8px_16px_rgba(255,255,255,1)] dark:group-hover:shadow-[inset_8px_8px_16px_rgba(0,0,0,0.4),inset_-8px_-8px_16px_rgba(255,255,255,0.15)] group-hover:scale-110">
                      <div className="h-full w-full rounded-full flex items-center justify-center" style={{ backgroundColor: clientSexe === 'M' ? '#023e8a20' : '#e0aaff20' }}>
                        <User className="h-12 w-12" style={{ color: clientSexe === 'M' ? '#023e8a' : '#e0aaff' }} />
                      </div>
                    </div>
                    <div className="absolute inset-0 rounded-full border-2 opacity-0 group-hover:opacity-100 transition-all duration-500 animate-pulse" style={{ borderColor: clientSexe === 'M' ? '#023e8a' : '#e0aaff' }}></div>
                  </div>
                </div>

                <div className="text-center relative z-10 transition-transform duration-300 group-hover:-translate-y-1">
                  <h3 className="text-lg font-semibold text-foreground transition-colors duration-300 group-hover:text-primary">
                    {clientName}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground transition-colors duration-300 group-hover:text-foreground">
                    {clientRole}
                  </p>
                  {clientAge !== undefined && (
                    <p className="mt-2 text-xs text-muted-foreground transition-all duration-300 group-hover:text-primary group-hover:font-medium">
                      {clientAge} ans
                    </p>
                  )}
                  {tags.length > 0 && (
                    <div className="mt-3 flex justify-center gap-2">
                      {tags.map((tag, index) => (
                        <span key={index} className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="absolute inset-0 rounded-3xl border-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ borderColor: clientSexe === 'M' ? '#023e8a' : '#e0aaff' }}></div>
              </div>

              {/* Carte Partenaire */}
              {!hasPartner ? (
                <div className="space-y-4 flex flex-col justify-center">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="single"
                      checked={isSingle}
                      onChange={(e) => handleToggleSingle(e.target.checked)}
                      className="h-4 w-4 rounded border-border"
                    />
                    <label htmlFor="single" className="text-base font-medium cursor-pointer">
                      Célibataire (sans partenaire)
                    </label>
                  </div>

                  {!isSingle && (
                    <button
                      onClick={() => setIsPartnerDrawerOpen(true)}
                      className="w-full h-14 flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
                    >
                      <Plus className="w-5 h-5" />
                      Ajouter un partenaire
                    </button>
                  )}
                </div>
              ) : (
                <div
                  onClick={() => setIsPartnerDrawerOpen(true)}
                  className="group relative overflow-hidden rounded-3xl bg-card p-6 shadow-[12px_12px_24px_rgba(0,0,0,0.15),-12px_-12px_24px_rgba(255,255,255,0.9)] dark:shadow-[12px_12px_24px_rgba(0,0,0,0.3),-12px_-12px_24px_rgba(255,255,255,0.1)] transition-all duration-500 hover:shadow-[20px_20px_40px_rgba(0,0,0,0.2),-20px_-20px_40px_rgba(255,255,255,1)] dark:hover:shadow-[20px_20px_40px_rgba(0,0,0,0.4),-20px_-20px_40px_rgba(255,255,255,0.15)] hover:scale-105 hover:-translate-y-2 cursor-pointer"
                >
                  <div className="mb-4 flex justify-center relative z-10">
                    <div className="relative group-hover:animate-pulse">
                      <div className="h-28 w-28 overflow-hidden rounded-full bg-muted p-1 shadow-[inset_6px_6px_12px_rgba(0,0,0,0.1),inset_-6px_-6px_12px_rgba(255,255,255,0.9)] dark:shadow-[inset_6px_6px_12px_rgba(0,0,0,0.3),inset_-6px_-6px_12px_rgba(255,255,255,0.1)] transition-all duration-500 group-hover:shadow-[inset_8px_8px_16px_rgba(0,0,0,0.15),inset_-8px_-8px_16px_rgba(255,255,255,1)] dark:group-hover:shadow-[inset_8px_8px_16px_rgba(0,0,0,0.4),inset_-8px_-8px_16px_rgba(255,255,255,0.15)] group-hover:scale-110">
                        <div className="h-full w-full rounded-full flex items-center justify-center" style={{ backgroundColor: partnerSexe === 'M' ? '#023e8a20' : '#e0aaff20' }}>
                          <User className="h-12 w-12" style={{ color: partnerSexe === 'M' ? '#023e8a' : '#e0aaff' }} />
                        </div>
                      </div>
                      <div className="absolute inset-0 rounded-full border-2 opacity-0 group-hover:opacity-100 transition-all duration-500 animate-pulse" style={{ borderColor: partnerSexe === 'M' ? '#023e8a' : '#e0aaff' }}></div>
                    </div>
                  </div>

                  <div className="text-center relative z-10 transition-transform duration-300 group-hover:-translate-y-1">
                    <h3 className="text-lg font-semibold text-foreground transition-colors duration-300 group-hover:text-primary">
                      {partnerName}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground transition-colors duration-300 group-hover:text-foreground">
                      {relationStatus}
                    </p>
                    {partnerAge !== undefined && (
                      <p className="mt-2 text-xs text-muted-foreground transition-all duration-300 group-hover:text-primary group-hover:font-medium">
                        {partnerAge} ans
                      </p>
                    )}
                  </div>

                  <div className="absolute inset-0 rounded-3xl border-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ borderColor: partnerSexe === 'M' ? '#023e8a' : '#e0aaff' }}></div>
                </div>
              )}
            </div>

            {/* Carte Informations de la relation */}
            {hasPartner && relationStatus && relationStatus !== 'Célibataire' && (
              <div
                onClick={() => setIsRelationInfoOpen(true)}
                className="mt-6 group relative overflow-hidden rounded-xl border bg-card p-6 cursor-pointer hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">
                      {relationStatus === 'Marié(e)' && 'Informations du mariage'}
                      {relationStatus === 'Pacsé(e)' && 'Informations du PACS'}
                      {relationStatus === 'Concubinage' && 'Informations du concubinage'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Cliquez pour consulter et modifier les informations
                    </p>
                  </div>
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                    <svg
                      className="w-6 h-6 text-primary"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                
                {/* Mariages précédents */}
                {(maritalData?.mariage_precedent_personne || maritalData?.mariage_precedent_conjoint) && (
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Mariages précédents :</p>
                    <div className="flex flex-col gap-2">
                      {maritalData?.mariage_precedent_personne && (
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-4 h-4 rounded-sm border-2 border-primary bg-primary flex items-center justify-center">
                            <svg className="w-3 h-3 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <span className="text-foreground">{clientName}</span>
                        </div>
                      )}
                      {maritalData?.mariage_precedent_conjoint && (
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-4 h-4 rounded-sm border-2 border-primary bg-primary flex items-center justify-center">
                            <svg className="w-3 h-3 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <span className="text-foreground">{partnerName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f6f5f6' }}>
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Famille</h2>
            <p className="text-muted-foreground">
              Gérez les informations et la composition de votre famille
            </p>
          </div>
          <button
            onClick={() => setIsOnboardingOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Assistant familial
          </button>
        </div>
        
        <div className="mb-6 flex justify-start">
          <div className="rounded-[8px] bg-muted p-[2px]">
            <AnimatedBackground
            defaultValue="ma-famille"
            onValueChange={(value) => setActiveTab(value || 'ma-famille')}
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

        {/* Impacts Summary - Always visible at bottom when family data exists */}
        {!linksLoading && (familyLinks.length > 0 || maritalData?.statut_couple) && (
          <div className="mt-6">
            <FamilyImpactSummary impacts={impacts} />
          </div>
        )}
      </div>

      {/* Dialog pour modifier les informations client */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier les informations</DialogTitle>
            <DialogDescription>Modifiez les informations, puis enregistrez.</DialogDescription>
          </DialogHeader>
          <FicheClientForm onSuccess={() => {
            setIsDialogOpen(false);
            refetchProfile();
          }} />
        </DialogContent>
      </Dialog>

      {/* Dialog pour modifier le partenaire */}
      <Dialog open={isPartnerDrawerOpen} onOpenChange={setIsPartnerDrawerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier les informations du partenaire</DialogTitle>
            <DialogDescription>Modifiez les informations, puis enregistrez.</DialogDescription>
          </DialogHeader>
          <PartnerForm onSuccess={() => {
            setIsPartnerDrawerOpen(false);
            refetchMarital();
          }} />
        </DialogContent>
      </Dialog>

      <RelationInfoDialog
        open={isRelationInfoOpen}
        onOpenChange={setIsRelationInfoOpen}
        relationStatus={relationStatus || ''}
      />

      <FamilyOnboardingWizard
        open={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onComplete={handleOnboardingComplete}
      />
    </div>
  );
};

export default FamilleSection;
