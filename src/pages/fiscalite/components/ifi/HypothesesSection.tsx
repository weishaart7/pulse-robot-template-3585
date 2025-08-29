import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings } from 'lucide-react';

const HypothesesSection = () => {
  const [hypotheses, setHypotheses] = useState({
    abattementResidencePrincipale: true,
    plafonnementIFI: true,
  });

  const [situationsParticulieres, setSituationsParticulieres] = useState({
    concubinage: false,
    mariagePacs2025: false,
  });

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
              checked={hypotheses.abattementResidencePrincipale}
              onCheckedChange={(checked) =>
                setHypotheses(prev => ({ ...prev, abattementResidencePrincipale: !!checked }))
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
              checked={hypotheses.plafonnementIFI}
              onCheckedChange={(checked) =>
                setHypotheses(prev => ({ ...prev, plafonnementIFI: !!checked }))
              }
            />
            <label
              htmlFor="plafonnement-ifi"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Appliquer la règle du plafonnement de l'IFI (indisponible aux non-résidents français)
            </label>
          </div>
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
};

export default HypothesesSection;