import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, Briefcase } from 'lucide-react';

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

  if (loading) return <p className="text-muted-foreground">Chargement...</p>;

  const immo = actifs.filter(a => ['Résidence principale', 'Résidence secondaire', 'Bien locatif', 'Bien immobilier'].includes(a.nature));
  const autres = actifs.filter(a => !immo.includes(a));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Home className="h-4 w-4" />Biens immobiliers détenus</CardTitle></CardHeader>
        <CardContent>
          {immo.length === 0 ? <p className="text-sm text-muted-foreground">Aucun bien immobilier rattaché à cette société.</p> : (
            <div className="space-y-2">
              {immo.map(a => (
                <div key={a.id} className="flex justify-between p-3 rounded-[5px] bg-muted/40 text-sm">
                  <span>{a.denomination || a.nature} {a.typologie_bien ? `(${a.typologie_bien})` : ''}</span>
                  <span className="font-medium">{(a.valeur_estimee || 0).toLocaleString('fr-FR')} €</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Briefcase className="h-4 w-4" />Autres actifs détenus</CardTitle></CardHeader>
        <CardContent>
          {autres.length === 0 ? <p className="text-sm text-muted-foreground">Aucun autre actif.</p> : (
            <div className="space-y-2">
              {autres.map(a => (
                <div key={a.id} className="flex justify-between p-3 rounded-[5px] bg-muted/40 text-sm">
                  <span>{a.denomination || a.nature}</span>
                  <span className="font-medium">{(a.valeur_estimee || 0).toLocaleString('fr-FR')} €</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
