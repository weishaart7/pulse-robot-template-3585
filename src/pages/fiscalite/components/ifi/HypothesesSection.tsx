import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings } from 'lucide-react';
import { useIFIHypotheses } from '@/hooks/useIFI';

export interface HypothesesSectionHandle {
  flush: () => Promise<void>;
}

const HypothesesSection = forwardRef<HypothesesSectionHandle>((_props, ref) => {
  const { hypotheses, loading, saveHypothese } = useIFIHypotheses();

  const [hypothesesGenerales, setHypothesesGenerales] = useState({
    abattementResidencePrincipale: true,
    plafonnementIFI: true,
  });

  const [situationsParticulieres, setSituationsParticulieres] = useState({
    concubinage: false,
    mariagePacs2025: false,
  });

  const [plafonnement, setPlafonnement] = useState({
    revenusN1: '',
    irPrelevementsSociauxN: '',
  });

  // Initialise l'état local à partir des hypothèses déjà enregistrées en base
  useEffect(() => {
    if (loading || hypotheses.length === 0) return;

    const getActif = (type: string, fallback: boolean) => {
      const h = hypotheses.find(h => h.type_hypothese === type);
      return h ? !!h.actif : fallback;
    };
    const getValeur = (type: string) => {
      const h = hypotheses.find(h => h.type_hypothese === type);
      return h?.valeur !== undefined && h.valeur !== null ? String(h.valeur) : '';
    };

    setHypothesesGenerales({
      abattementResidencePrincipale: getActif('abattement_residence_principale', true),
      plafonnementIFI: getActif('plafonnement_ifi', true),
    });
    setSituationsParticulieres({
      concubinage: getActif('concubinage', false),
      mariagePacs2025: getActif('mariage_pacs_2025', false),
    });
    setPlafonnement({
      revenusN1: getValeur('plafonnement_revenus_n1'),
      irPrelevementsSociauxN: getValeur('plafonnement_ir_ps_n'),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  useImperativeHandle(ref, () => ({
    flush: async () => {
      await Promise.all([
        saveHypothese('abattement_residence_principale', { actif: hypothesesGenerales.abattementResidencePrincipale }),
        saveHypothese('plafonnement_ifi', { actif: hypothesesGenerales.plafonnementIFI }),
        saveHypothese('concubinage', { actif: situationsParticulieres.concubinage }),
        saveHypothese('mariage_pacs_2025', { actif: situationsParticulieres.mariagePacs2025 }),
        saveHypothese('plafonnement_revenus_n1', { valeur: plafonnement.revenusN1 ? parseFloat(plafonnement.revenusN1) : null }),
        saveHypothese('plafonnement_ir_ps_n', { valeur: plafonnement.irPrelevementsSociauxN ? parseFloat(plafonnement.irPrelevementsSociauxN) : null }),
      ]);
    },
  }), [hypothesesGenerales, situationsParticulieres, plafonnement, saveHypothese]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-semibold">Hypothèses</h2>
      </div>

      {/* Hypothèses générales */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Hypothèses générales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="abattement-rp"
              checked={hypothesesGenerales.abattementResidencePrincipale}
              onCheckedChange={(checked) =>
                setHypothesesGenerales(prev => ({ ...prev, abattementResidencePrincipale: !!checked }))
              }
            />
            <label
              htmlFor="abattement-rp"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Appliquer l'abattement de 30% sur la résidence principale
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="plafonnement-ifi"
              checked={hypothesesGenerales.plafonnementIFI}
              onCheckedChange={(checked) =>
                setHypothesesGenerales(prev => ({ ...prev, plafonnementIFI: !!checked }))
              }
            />
            <label
              htmlFor="plafonnement-ifi"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Appliquer la règle du plafonnement de l'IFI (indisponible aux non-résidents français)
            </label>
          </div>

          {hypothesesGenerales.plafonnementIFI && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6 pt-2">
              <div>
                <Label htmlFor="revenusN1">Revenus N-1 du foyer fiscal (€)</Label>
                <Input
                  id="revenusN1"
                  type="number"
                  value={plafonnement.revenusN1}
                  onChange={(e) => setPlafonnement(prev => ({ ...prev, revenusN1: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="irPrelevementsSociauxN">IR + prélèvements sociaux N (€)</Label>
                <Input
                  id="irPrelevementsSociauxN"
                  type="number"
                  value={plafonnement.irPrelevementsSociauxN}
                  onChange={(e) => setPlafonnement(prev => ({ ...prev, irPrelevementsSociauxN: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Situations particulières */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Situations particulières</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="concubinage"
              checked={situationsParticulieres.concubinage}
              onCheckedChange={(checked) =>
                setSituationsParticulieres(prev => ({ ...prev, concubinage: !!checked }))
              }
            />
            <label
              htmlFor="concubinage"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Concubinage (9GL)
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="mariage-pacs-2025"
              checked={situationsParticulieres.mariagePacs2025}
              onCheckedChange={(checked) =>
                setSituationsParticulieres(prev => ({ ...prev, mariagePacs2025: !!checked }))
              }
            />
            <label
              htmlFor="mariage-pacs-2025"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Mariage ou PACS en 2025 avec option pour l'imposition séparée (9GM)
            </label>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

HypothesesSection.displayName = 'HypothesesSection';

export default HypothesesSection;
