import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import AnimatedBackground from '@/components/ui/animated-tabs';
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

  return (
    <div className="kairos-transmission p-6">
      <div className="mb-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Transmission</h2>
          <p className="text-[var(--text-secondary)]">
            Planifiez et optimisez la transmission de votre patrimoine
          </p>
        </div>
      </div>

      <div className="mb-6 flex justify-start">
        <div className="flex gap-7 border-b border-[var(--border)]">
          <AnimatedBackground
            defaultValue="synthese"
            onValueChange={(value) => setActiveTab(value || 'synthese')}
            className="bg-transparent border-b-2 border-[var(--ink-900)] rounded-none shadow-none"
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
                className={
                  "inline-flex items-center justify-center px-0 pb-3 text-[15px] transition-transform active:scale-[0.98] " +
                  (activeTab === tab.id
                    ? "font-semibold text-[var(--text-primary)]"
                    : "font-medium text-[var(--text-secondary)]")
                }
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
    </div>
  );
};
