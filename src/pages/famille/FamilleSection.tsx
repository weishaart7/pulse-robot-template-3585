import React, { useState } from 'react';
import AnimatedBackground from '@/components/ui/animated-tabs';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useFamilyProfile, useMaritalStatus, useFamilyLinks } from '@/hooks/useFamilyData';
import { FamilyLink } from '@/services/familyService';
import { FicheClientForm } from './components/FicheClientForm';
import { LiensFamiliauxForm } from './components/LiensFamiliauxForm';
import { PartnerForm } from "@/components/famille/PartnerForm";
import { RelationInfoForm } from "@/components/famille/RelationInfoForm";
import { User, Plus, ArrowLeft, ArrowRight, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

type EditView = 'client' | 'partner' | 'relation';

const FamilleSection = () => {
  const [activeTab, setActiveTab] = useState('ma-famille');
  const [editView, setEditView] = useState<EditView | null>(null);
  const [isSingle, setIsSingle] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyLink | null>(null);
  const { data: familyProfile, refetch: refetchProfile } = useFamilyProfile();
  const { data: maritalData, saveData: saveMaritalData, refetch: refetchMarital } = useMaritalStatus();
  const { data: familyLinks = [], loading: linksLoading } = useFamilyLinks();

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

  // Full-screen edit view
  if (editView) {
    const EDIT_TABS = [
      { id: 'client' as EditView, label: clientName || 'Client' },
      ...(hasPartner ? [{ id: 'partner' as EditView, label: partnerName || 'Partenaire' }] : []),
    ];

    const currentSexe = editView === 'client'
      ? (familyProfile?.civility?.toLowerCase() === 'mme' ? 'F' : 'M')
      : (maritalData?.civilite_conjoint?.toLowerCase() === 'mme' ? 'F' : 'M');
    const accentColor = currentSexe === 'M' ? '#023e8a' : '#e0aaff';

    return (
      <div className="min-h-screen bg-white">
        {/* Discreet back link */}
        <div className="w-full mx-auto px-4 sm:px-6 pt-8">
          <button
            onClick={() => setEditView(null)}
            className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" strokeWidth={1.5} />
            Retour
          </button>
        </div>

        {/* Identity header */}
        <div className="w-full mx-auto px-4 sm:px-6 pt-6 pb-8">
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div className="flex items-center gap-4">
              <div
                className="h-14 w-14 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: accentColor + '15' }}
              >
                <User className="h-6 w-6" style={{ color: accentColor }} strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground leading-tight">
                  {editView === 'client' ? clientName : (partnerName || 'Partenaire')}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {editView === 'client' ? 'Fiche personnelle' : (relationStatus || 'Partenaire')}
                </p>
              </div>
            </div>

            {EDIT_TABS.length > 1 && (
              <Tabs value={editView} onValueChange={(value) => setEditView(value as EditView)}>
                <TabsList className="rounded-full">
                  {EDIT_TABS.map((tab) => (
                    <TabsTrigger key={tab.id} value={tab.id} className="rounded-full min-w-28">
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}
          </div>
        </div>

        {/* Form content */}
        <div className="w-full mx-auto px-4 sm:px-6 pb-12">
          {editView === 'client' && (
            <FicheClientForm onSuccess={() => {
              setEditView(null);
              refetchProfile();
            }} />
          )}
          {editView === 'partner' && (
            <PartnerForm onSuccess={() => {
              setEditView(null);
              refetchMarital();
            }} />
          )}
        </div>
      </div>
    );
  }

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
                onClick={() => setEditView('client')}
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
                      onClick={() => setEditView('partner')}
                      className="w-full h-14 flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
                    >
                      <Plus className="w-5 h-5" />
                      Ajouter un partenaire
                    </button>
                  )}
                </div>
              ) : (
                <div
                  onClick={() => setEditView('partner')}
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
            {hasPartner && ['Marié(e)', 'Pacsé(e)', 'Concubinage'].includes(relationStatus) && (
              <button
                type="button"
                onClick={() => setIsRelationInfoOpen(true)}
                className="mt-6 w-full flex items-center justify-between rounded-xl border bg-card px-6 py-5 cursor-pointer hover:shadow-md transition-all duration-300 text-left"
              >
                <span className="text-base font-medium text-foreground">
                  {relationStatus === 'Marié(e)' && 'Informations relatives au mariage'}
                  {relationStatus === 'Pacsé(e)' && 'Informations relatives au PACS'}
                  {relationStatus === 'Concubinage' && 'Informations relatives au statut de concubins'}
                </span>
                <ArrowRight className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
              </button>
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
    <div className="min-h-screen bg-white">
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Famille</h2>
          <p className="text-muted-foreground">
            Gérez les informations et la composition de votre famille
          </p>
        </div>
        
        <div className="mb-8 flex justify-start">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="rounded-full">
              {TABS.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id} className="rounded-full min-w-28">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="mt-6">
          {renderContent()}
        </div>
      </div>

      <RelationInfoDialog
        open={isRelationInfoOpen}
        onOpenChange={setIsRelationInfoOpen}
        relationStatus={relationStatus || ''}
      />
    </div>
  );
};

export default FamilleSection;
