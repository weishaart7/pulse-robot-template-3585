import { getNatureDisplayLabel } from '@/constants/assetTypes';
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PanelCard, PanelCardContent, PanelCardHeader, PanelCardTitle, PanelCardDescription } from '@/components/layout/panel-section';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface Props { societeId: string }

type ActifLie = { id: string; nature: string; denomination: string | null; valeur_estimee: number | null };

// Actifs Patrimoine rattachés à la société (assets.societe_id) : ce sont les titres
// de la société détenus par le foyer, pas des biens détenus par la société.
export const SocieteActifsDetenus: React.FC<Props> = ({ societeId }) => {
  const [actifs, setActifs] = useState<ActifLie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('assets').select('id, nature, denomination, valeur_estimee').eq('societe_id', societeId);
      setActifs(data || []);
      setLoading(false);
    })();
  }, [societeId]);

  if (loading) return <LoadingSpinner size="sm" />;

  return (
    <div>
      <PanelCard>
        <PanelCardHeader>
          <PanelCardTitle>Parts détenues par le foyer</PanelCardTitle>
          <PanelCardDescription>
            Actifs du Patrimoine rattachés à cette société (champ « Société liée » de l'actif).
          </PanelCardDescription>
        </PanelCardHeader>
        <PanelCardContent>
          {actifs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun actif rattaché. Dans Patrimoine, choisissez cette société dans le champ « Société liée » de l'actif
              qui représente ses parts.
            </p>
          ) : (
            <div className="divide-y divide-border border-y border-border empty:hidden">
              {actifs.map(a => (
                <div key={a.id} className="flex justify-between py-2.5 text-sm">
                  <span>{a.denomination || a.nature} <span className="text-muted-foreground">· {getNatureDisplayLabel(a.nature)}</span></span>
                  <span className="font-medium">{(a.valeur_estimee || 0).toLocaleString('fr-FR')} €</span>
                </div>
              ))}
            </div>
          )}
        </PanelCardContent>
      </PanelCard>
    </div>
  );
};
