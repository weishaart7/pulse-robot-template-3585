import React, { useEffect, useState } from 'react';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { THEME_INK } from '@/lib/theme';
import { Synthese } from '@/components/retraite/Synthese';
import { Carriere } from '@/components/retraite/Carriere';
import { EpargneRetraite } from '@/components/retraite/EpargneRetraite';
import { Trimestres } from '@/components/retraite/Trimestres';
import { ColonnesPersonnes } from '@/components/retraite/ColonnesPersonnes';
import { familyService, FamilyProfile, MaritalStatus } from '@/services/familyService';
import { checkIsInCouple } from '@/lib/patrimoine/utils';

export const RetraiteSection = () => {
  const [activeTab, setActiveTab] = useState('synthese');

  // Conjoint (marié, pacsé ou concubin) : mêmes sources et même prédicat que
  // Famille (buildFamilyGraph.ts) et Patrimoine (usePatrimoineCalculations) —
  // pas de nouvelle règle de détection introduite pour Retraite.
  const [familyProfile, setFamilyProfile] = useState<FamilyProfile | null>(null);
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatus | null>(null);

  useEffect(() => {
    familyService.getFamilyProfile().then(setFamilyProfile).catch((error) => {
      console.error('Erreur lors du chargement du profil famille:', error);
    });
    familyService.getMaritalStatus().then(setMaritalStatus).catch((error) => {
      console.error('Erreur lors du chargement du statut marital:', error);
    });
  }, []);

  const hasConjoint = checkIsInCouple(maritalStatus?.statut_couple || undefined);
  const nomUtilisateur = familyProfile?.prenom || 'Vous';
  const nomConjoint = maritalStatus?.prenom_conjoint || 'Conjoint';

  const TABS = [
    { id: 'synthese', label: 'Synthèse' },
    { id: 'carriere', label: 'Carrière' },
    { id: 'epargne', label: 'Épargne retraite' },
    { id: 'optimisation', label: 'Optimisation' }
  ];

  const colonnesProps = { hasConjoint, nomUtilisateur, nomConjoint };

  const renderContent = () => {
    switch (activeTab) {
      case 'synthese':
        return <Synthese hasConjoint={hasConjoint} nomUtilisateur={nomUtilisateur} nomConjoint={nomConjoint} />;
      case 'carriere':
        return (
          <ColonnesPersonnes
            {...colonnesProps}
            render={(personne) => <Carriere personne={personne} />}
          />
        );
      case 'epargne':
        return (
          <ColonnesPersonnes
            {...colonnesProps}
            render={(personne) => <EpargneRetraite personne={personne} />}
          />
        );
      case 'optimisation':
        return (
          <ColonnesPersonnes
            {...colonnesProps}
            render={(personne) => <Trimestres personne={personne} />}
          />
        );
      default:
        return <Synthese hasConjoint={hasConjoint} nomUtilisateur={nomUtilisateur} nomConjoint={nomConjoint} />;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div>
          <h1 className="text-[34px] font-bold" style={{ color: THEME_INK, letterSpacing: '-0.02em' }}>Retraite</h1>
        </div>
      </div>

      <div className="mb-6 flex justify-start">
        <SegmentedTabs tabs={TABS} value={activeTab} onValueChange={setActiveTab} />
      </div>

      {renderContent()}
    </div>
  );
};
