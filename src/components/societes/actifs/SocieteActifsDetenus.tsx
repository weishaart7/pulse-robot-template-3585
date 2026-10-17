import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PanelCard, PanelCardContent, PanelCardHeader, PanelCardTitle } from '@/components/layout/panel-section';
import { Home, Briefcase } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface Props { societeId: string }

export const SocieteActifsDetenus: React.FC<Props> = ({ societeId }) => {
  const [actifs, setActifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('assets').select('id, nature, denomination, valeur_estimee, typologie_bien').eq('societe_id', societeId);
      setActifs(data || []);
      setLoading(false);
    })();
  }, [societeId]);

  if (loading) return <LoadingSpinner size="sm" />;

  const immo = actifs.filter(a => ['Résidence principale', 'Résidence secondaire', 'Bien locatif', 'Bien immobilier'].includes(a.nature));
  const autres = actifs.filter(a => !immo.includes(a));

  return (
    <div>
      <PanelCard>
        <PanelCardHeader><PanelCardTitle>Biens immobiliers détenus</PanelCardTitle></PanelCardHeader>
        <PanelCardContent>
          {immo.length === 0 ? <p className="text-sm text-muted-foreground">Aucun bien immobilier rattaché à cette société.</p> : (
            <div className="divide-y divide-border border-y border-border empty:hidden">
              {immo.map(a => (
                <div key={a.id} className="flex justify-between py-2.5 text-sm">
                  <span>{a.denomination || a.nature} {a.typologie_bien ? `(${a.typologie_bien})` : ''}</span>
                  <span className="font-medium">{(a.valeur_estimee || 0).toLocaleString('fr-FR')} €</span>
                </div>
              ))}
            </div>
          )}
        </PanelCardContent>
      </PanelCard>

      <PanelCard>
        <PanelCardHeader><PanelCardTitle>Autres actifs détenus</PanelCardTitle></PanelCardHeader>
        <PanelCardContent>
          {autres.length === 0 ? <p className="text-sm text-muted-foreground">Aucun autre actif.</p> : (
            <div className="divide-y divide-border border-y border-border empty:hidden">
              {autres.map(a => (
                <div key={a.id} className="flex justify-between py-2.5 text-sm">
                  <span>{a.denomination || a.nature}</span>
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
