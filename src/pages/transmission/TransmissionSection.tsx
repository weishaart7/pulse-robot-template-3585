import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useModuleSubNav } from '@/hooks/useModuleSubNav';
import { WorkspaceHeader } from '@/components/layout/workspace-panel';
import { GitFork } from 'lucide-react';
import { Synthese } from '@/components/transmission/Synthese';
import { Liberalites } from '@/components/transmission/Liberalites';
import { AssuranceVie } from '@/components/transmission/AssuranceVie';
import { ProcessusCalcul } from '@/components/transmission/ProcessusCalcul';
import { Optimisation } from '@/components/transmission/Optimisation';
import { Succession2ndDeces } from '@/components/transmission/Succession2ndDeces';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import '@/components/transmission/kairos-transmission.css';

const VALID_TABS = ['synthese', 'optimisation', 'liberalites', 'assurance-vie', 'processus-calcul', 'succession-2nd-deces'];

export const TransmissionSection = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(VALID_TABS.includes(tabParam || '') ? tabParam! : 'synthese');
  // Onglet "Succession 2nd décès" : n'apparaît que si un conjoint survivant
  // existe dans le graphe familial (décision actée) — requête légère dédiée
  // (un seul champ), pour ne pas faire dépendre TransmissionSection du
  // chargement complet de chaque onglet (chacun reste responsable de son
  // propre fetch, cf. Synthese.tsx/Succession2ndDeces.tsx).
  const [hasConjoint, setHasConjoint] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('marital_status')
      .select('statut_couple')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        setHasConjoint(!!data?.statut_couple && ['Marié(e)', 'Pacsé(e)'].includes(data.statut_couple));
      });
  }, [user]);

  // Une navigation vers "?tab=..." depuis un écran déjà monté sous /dashboard/transmission
  // (ex. Synthese.tsx -> onglet Assurance-vie après une erreur) ne remonte pas ce
  // composant : useState seul ne rejouerait pas son initialisation. Sans ce useEffect,
  // l'URL changeait mais l'onglet affiché restait bloqué sur l'ancien.
  useEffect(() => {
    if (tabParam && VALID_TABS.includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const TABS = [
    { id: 'synthese', label: 'Synthèse' },
    { id: 'optimisation', label: 'Optimisation' },
    { id: 'liberalites', label: 'Libéralités' },
    { id: 'assurance-vie', label: 'Assurance-vie' },
    { id: 'processus-calcul', label: 'Processus de calcul' },
    ...(hasConjoint ? [{ id: 'succession-2nd-deces', label: 'Succession 2nd décès' }] : [])
  ];

  // Sous-navigation dans la barre latérale, comme les autres modules (remplace la barre d'onglets
  // propre au module). Le paramètre ?tab= reste pris en compte via l'effet ci-dessus.
  useModuleSubNav(TABS, activeTab, setActiveTab);

  const renderContent = () => {
    switch (activeTab) {
      case 'synthese':
        return <Synthese />;
      case 'optimisation':
        return <Optimisation />;
      case 'liberalites':
        return <Liberalites />;
      case 'assurance-vie':
        return <AssuranceVie />;
      case 'processus-calcul':
        return <ProcessusCalcul />;
      case 'succession-2nd-deces':
        return hasConjoint ? <Succession2ndDeces /> : <Synthese />;
      default:
        return <Synthese />;
    }
  };

  const tabLabel = TABS.find((t) => t.id === activeTab)?.label ?? 'Synthèse';

  // Cadre « panneau de travail », sur le modèle de Famille, Patrimoine, Immobilier et Sociétés.
  return (
    <div className="workspace-panel kairos-transmission -mx-4 -mt-3 md:-m-6">
      <WorkspaceHeader icon={<GitFork strokeWidth={1.75} />} trail={['Transmission', tabLabel]} />

      <div className="px-8 pt-6 pb-4">
        <h1 className="text-[24px] font-medium leading-tight tracking-[-0.02em]">{tabLabel}</h1>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          Planifiez et optimisez la transmission de votre patrimoine
        </p>
      </div>

      <div className="border-t border-border">
        {renderContent()}
      </div>
    </div>
  );
};
