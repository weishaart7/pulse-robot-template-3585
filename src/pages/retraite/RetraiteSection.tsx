import React, { useEffect, useState } from 'react';
import { useModuleSubNav } from '@/hooks/useModuleSubNav';
import { Synthese, BoutonExportPDF } from '@/components/retraite/Synthese';
import { WorkspaceHeader } from '@/components/layout/workspace-panel';
import { Calculator } from 'lucide-react';
import { Carriere } from '@/components/retraite/Carriere';
import { EpargneRetraite } from '@/components/retraite/EpargneRetraite';
import { EcartRevenuRetraite } from '@/components/retraite/EcartRevenuRetraite';
import { Trimestres } from '@/components/retraite/Trimestres';
import { ColonnesPersonnes } from '@/components/retraite/ColonnesPersonnes';
import { familyService, FamilyProfile, MaritalStatus } from '@/services/familyService';
import { checkIsInCouple } from '@/lib/patrimoine/utils';
import { baremePerime, MILLESIME_COURANT } from '@/lib/retraite/parametres';

export const RetraiteSection = () => {
  const [activeTab, setActiveTab] = useState('synthese');

  // Conjoint (marié, pacsé ou concubin) : mêmes sources et même prédicat que
  // Famille (buildFamilyGraph.ts) et Patrimoine (usePatrimoineCalculations) —
  // pas de nouvelle règle de détection introduite pour Retraite.
  const [familyProfile, setFamilyProfile] = useState<FamilyProfile | null>(null);
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatus | null>(null);

  useEffect(() => {
    familyService.getFamilyProfile().then(setFamilyProfile).catch((error) => {
      if (import.meta.env.DEV) {
        console.error('Erreur lors du chargement du profil famille:', error);
      }
    });
    familyService.getMaritalStatus().then(setMaritalStatus).catch((error) => {
      if (import.meta.env.DEV) {
        console.error('Erreur lors du chargement du statut marital:', error);
      }
    });
  }, []);

  const hasConjoint = checkIsInCouple(maritalStatus?.statut_couple || undefined);
  const nomUtilisateur = familyProfile?.prenom || 'Vous';
  const nomConjoint = maritalStatus?.prenom_conjoint || 'Conjoint';

  const TABS = [
    { id: 'synthese', label: 'Synthèse' },
    { id: 'carriere', label: 'Carrière' },
    { id: 'epargne', label: 'Épargne et écart de revenu' },
    { id: 'optimisation', label: 'Optimisation' }
  ];

  useModuleSubNav(TABS, activeTab, setActiveTab);

  const colonnesProps = { hasConjoint, nomUtilisateur, nomConjoint };

  const renderContent = () => {
    switch (activeTab) {
      case 'synthese':
        return <Synthese hasConjoint={hasConjoint} nomUtilisateur={nomUtilisateur} nomConjoint={nomConjoint} statutCouple={maritalStatus?.statut_couple ?? undefined} />;
      case 'carriere':
        return (
          <ColonnesPersonnes
            {...colonnesProps}
            render={(personne) => <Carriere personne={personne} />}
          />
        );
      case 'epargne':
        return (
          <>
            <EcartRevenuRetraite {...colonnesProps} />
            <ColonnesPersonnes
              {...colonnesProps}
              render={(personne) => <EpargneRetraite personne={personne} />}
            />
          </>
        );
      case 'optimisation':
        return (
          <ColonnesPersonnes
            {...colonnesProps}
            render={(personne) => <Trimestres personne={personne} />}
          />
        );
      default:
        return <Synthese hasConjoint={hasConjoint} nomUtilisateur={nomUtilisateur} nomConjoint={nomConjoint} statutCouple={maritalStatus?.statut_couple ?? undefined} />;
    }
  };

  const tabLabel = TABS.find((t) => t.id === activeTab)?.label ?? 'Synthèse';
  const summary = hasConjoint
    ? `${nomUtilisateur} et ${nomConjoint} · barèmes ${MILLESIME_COURANT.annee}, montants bruts en euros constants`
    : `${nomUtilisateur} · barèmes ${MILLESIME_COURANT.annee}, montants bruts en euros constants`;

  // Cadre « panneau de travail », sur le modèle de Famille, Patrimoine et Immobilier : barre
  // d'en-tête (fil d'Ariane + export PDF en Synthèse), titre 24 px et rappel, contenu bord à bord.
  return (
    <div className="workspace-panel -mx-4 -mt-3 md:-m-6">
      <WorkspaceHeader
        icon={<Calculator strokeWidth={1.75} />}
        trail={['Retraite', tabLabel]}
        actions={activeTab === 'synthese' ? <BoutonExportPDF {...colonnesProps} /> : undefined}
      />

      <div className="px-8 pt-6 pb-4">
        <h1 className="text-[24px] font-medium leading-tight tracking-[-0.02em]">{tabLabel}</h1>
        <p className="mt-1 text-[12.5px] text-muted-foreground">{summary}</p>
      </div>

      {baremePerime(new Date()) && (
        <p className="mx-8 mb-4 rounded-[2px] border border-destructive/40 p-3 text-[12.5px] text-destructive">
          Barèmes retraite {MILLESIME_COURANT.annee} (MICO, minimum garanti, points RAFP/CNAVPL, PASS) :
          une revalorisation est intervenue depuis. Les montants affichés reposent sur des valeurs
          probablement dépassées — mettre à jour src/lib/retraite/params-retraite.json.
        </p>
      )}

      <div className="border-t border-border">
        {renderContent()}
      </div>
    </div>
  );
};
