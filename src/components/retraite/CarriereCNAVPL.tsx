import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { decoteSurTrimestresPlafond25 } from '@/lib/retraite/calcul';
import { pensionBaseCNAVPL } from '@/lib/retraite/calculCNAVPL';

// Valeur du point CNAVPL 2026 (source : CNAVPL, cnavpl.fr) — pré-remplie
// mais modifiable par l'utilisateur, pas codée en dur dans le calcul.
const VALEUR_POINT_CNAVPL_2026 = 0.6599;

const formatEuro2 = (valeur: number) =>
  valeur.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

interface CarriereCNAVPLProps {
  // Durée d'assurance requise tous régimes confondus (même valeur que le
  // régime général et la fonction publique dans Carriere.tsx).
  trimestresRequis: number;
  // Trimestres des AUTRES régimes déjà saisis (régime général + fonction
  // publique le cas échéant) : la décote CNAVPL se base sur le total tous
  // régimes, pas seulement les trimestres CNAVPL isolés.
  trimestresAutresRegimes: number;
  // Remontés au parent (Carriere.tsx), même pattern que CarriereFonctionPublique.
  hasCNAVPL: boolean;
  onHasCNAVPLChange: (value: boolean) => void;
  trimestresCNAVPL: string;
  onTrimestresCNAVPLChange: (value: string) => void;
  onResultChange?: (result: { pensionFinale: number }) => void;
}

export const CarriereCNAVPL = ({
  trimestresRequis,
  trimestresAutresRegimes,
  hasCNAVPL,
  onHasCNAVPLChange,
  trimestresCNAVPL,
  onTrimestresCNAVPLChange,
  onResultChange,
}: CarriereCNAVPLProps) => {
  const [pointsCNAVPL, setPointsCNAVPL] = useState<string>('');
  const [valeurPointCNAVPL, setValeurPointCNAVPL] = useState<string>(
    VALEUR_POINT_CNAVPL_2026.toString()
  );

  const pointsNum = parseFloat(pointsCNAVPL) || 0;
  const valeurPointNum = parseFloat(valeurPointCNAVPL) || 0;
  const trimestresCNAVPLNum = parseInt(trimestresCNAVPL) || 0;

  // Décote basée sur le total de trimestres tous régimes confondus
  // (CNAVPL + régime général + fonction publique le cas échéant), avec le
  // plafond -25 % partagé (identique fonction publique). Pas de taux de
  // proratisation ici : les points CNAVPL accumulés reflètent déjà la
  // carrière réelle, contrairement au régime général (SAM × durée requise).
  const decoteOuSurcote = decoteSurTrimestresPlafond25(
    trimestresCNAVPLNum + trimestresAutresRegimes,
    trimestresRequis
  );

  const pensionFinale = pensionBaseCNAVPL(pointsNum, valeurPointNum, decoteOuSurcote);

  useEffect(() => {
    onResultChange?.({ pensionFinale });
  }, [pensionFinale, onResultChange]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Carrière CNAVPL</CardTitle>
        <CardDescription>
          À cocher si une partie de votre carrière relève de la CNAVPL (professions libérales non
          réglementées)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="has-cnavpl"
            checked={hasCNAVPL}
            onCheckedChange={(checked) => onHasCNAVPLChange(checked === true)}
          />
          <label htmlFor="has-cnavpl" className="text-sm">
            J'ai une carrière en CNAVPL
          </label>
        </div>

        {hasCNAVPL && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="points-cnavpl">Points CNAVPL déjà accumulés</Label>
                <Input
                  id="points-cnavpl"
                  type="number"
                  placeholder="Ex: 10000"
                  value={pointsCNAVPL}
                  onChange={(e) => setPointsCNAVPL(e.target.value)}
                  className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="valeur-point-cnavpl">Valeur du point (€)</Label>
                <Input
                  id="valeur-point-cnavpl"
                  type="number"
                  step="0.0001"
                  value={valeurPointCNAVPL}
                  onChange={(e) => setValeurPointCNAVPL(e.target.value)}
                  className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring"
                />
                <p className="text-xs text-muted-foreground">
                  Pré-remplie avec la valeur 2026 (0,6599 €), modifiable.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="trimestres-cnavpl">Trimestres CNAVPL</Label>
                <Input
                  id="trimestres-cnavpl"
                  type="number"
                  placeholder="Ex: 40"
                  value={trimestresCNAVPL}
                  onChange={(e) => onTrimestresCNAVPLChange(e.target.value)}
                  className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring"
                />
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Pension CNAVPL</div>
              <div className="text-xl font-semibold text-primary">
                {formatEuro2(pensionFinale)} / an
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {decoteOuSurcote > 0 ? '+' : ''}
                {decoteOuSurcote.toFixed(2)}% ({decoteOuSurcote < 0 ? 'décote' : decoteOuSurcote > 0 ? 'surcote' : 'aucune décote ni surcote'}
                ) sur trimestres tous régimes confondus
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
