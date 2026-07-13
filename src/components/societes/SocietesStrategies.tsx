import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSocietes } from '@/hooks/useSocietes';
import {
  useSocietesIFI,
  useSocietesTransmission,
  getSocieteCategory,
  getSocieteTypeLabel
} from '@/hooks/useSocietesIntegration';
import { 
  Calculator, 
  TrendingUp, 
  ShieldCheck, 
  Scale, 
  Building2,
  ArrowRight,
  Info,
  AlertTriangle,
  CheckCircle2,
  Percent
} from 'lucide-react';

export const SocietesStrategies = () => {
  const { societes, isLoading } = useSocietes();
  const ifiData = useSocietesIFI(societes);
  const transmissionData = useSocietesTransmission(societes);

  const [simulationData, setSimulationData] = useState({
    montantCession: 100000,
    dureeDetention: 5,
    tauxIS: 25,
    tauxIR: 30
  });

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (societes.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Aucune société enregistrée</h3>
        <p className="text-muted-foreground">
          Ajoutez vos sociétés dans l'onglet "Mes sociétés" pour accéder aux stratégies d'optimisation.
        </p>
      </div>
    );
  }

  // Calculate IS vs IR comparison
  const calculateISvsIR = () => {
    const benefice = simulationData.montantCession;
    const impotIS = benefice * (simulationData.tauxIS / 100);
    const netApresIS = benefice - impotIS;
    const dividendesNets = netApresIS * 0.7; // Flat tax 30%
    
    const impotIR = benefice * (simulationData.tauxIR / 100);
    const netApresIR = benefice - impotIR;
    
    return {
      is: {
        impot: impotIS,
        netSociete: netApresIS,
        netAssocies: dividendesNets,
        total: impotIS + (netApresIS * 0.3)
      },
      ir: {
        impot: impotIR,
        net: netApresIR
      },
      avantageIS: netApresIR < dividendesNets
    };
  };

  const isirComparison = calculateISvsIR();

  return (
    <div className="space-y-6">
      <Tabs defaultValue="ifi" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ifi" className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            <span className="hidden sm:inline">Impact IFI</span>
          </TabsTrigger>
          <TabsTrigger value="fiscal" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline">IS vs IR</span>
          </TabsTrigger>
          <TabsTrigger value="holding" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Holding</span>
          </TabsTrigger>
        </TabsList>

        {/* IFI Tab */}
        <TabsContent value="ifi" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Valeur IFI totale</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {ifiData.totalValeurIFI.toLocaleString('fr-FR')} €
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Sur {ifiData.nombreSocietesIFI} société(s)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Biens professionnels exonérés</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {ifiData.biensProfessionnels.reduce((s, b) => s + b.valeurBrute, 0).toLocaleString('fr-FR')} €
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {ifiData.nombreSocietesExonerees} holding(s) animatrice(s)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Économie IFI</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {(ifiData.biensProfessionnels.reduce((s, b) => s + b.valeurBrute, 0) * 0.015).toLocaleString('fr-FR')} €
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Estimation annuelle (taux 1,5%)
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Détail par société</CardTitle>
              <CardDescription>Impact IFI de vos participations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ifiData.calculations.map((calc) => (
                  <div key={calc.societe.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{calc.societe.denomination}</p>
                        <p className="text-sm text-muted-foreground">
                          {getSocieteTypeLabel(calc.societe.type_societe)} • {calc.pourcentageDetention}% détenu
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {calc.type === 'professionnel_exonere' ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Exonéré
                        </Badge>
                      ) : calc.type === 'patrimoine' ? (
                        <div>
                          <p className="font-semibold">{calc.valeurIFI.toLocaleString('fr-FR')} €</p>
                          <p className="text-xs text-muted-foreground">{calc.categorie}</p>
                        </div>
                      ) : (
                        <Badge variant="secondary">Non applicable</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardContent className="pt-4">
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-700">Optimisation possible</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Transformer une holding passive en holding animatrice permet d'exonérer la valeur des parts de l'IFI. 
                    Cela nécessite une implication réelle dans la gestion des filiales (animation, services, etc.).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* IS vs IR Tab */}
        <TabsContent value="fiscal" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Comparateur IS / IR
              </CardTitle>
              <CardDescription>
                Simulez l'impact fiscal selon le régime d'imposition
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="montant">Bénéfice simulé</Label>
                  <Input
                    id="montant"
                    type="number"
                    value={simulationData.montantCession}
                    onChange={(e) => setSimulationData(prev => ({ ...prev, montantCession: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label htmlFor="tauxIS">Taux IS (%)</Label>
                  <Input
                    id="tauxIS"
                    type="number"
                    value={simulationData.tauxIS}
                    onChange={(e) => setSimulationData(prev => ({ ...prev, tauxIS: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label htmlFor="tauxIR">Taux marginal IR (%)</Label>
                  <Input
                    id="tauxIR"
                    type="number"
                    value={simulationData.tauxIR}
                    onChange={(e) => setSimulationData(prev => ({ ...prev, tauxIR: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className={isirComparison.avantageIS ? 'border-green-500/50' : ''}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span>Impôt sur les Sociétés</span>
                      {isirComparison.avantageIS && (
                        <Badge className="bg-green-500">Recommandé</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">IS ({simulationData.tauxIS}%)</span>
                        <span>-{isirComparison.is.impot.toLocaleString('fr-FR')} €</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Net société</span>
                        <span>{isirComparison.is.netSociete.toLocaleString('fr-FR')} €</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Flat tax (30%)</span>
                        <span>-{(isirComparison.is.netSociete * 0.3).toLocaleString('fr-FR')} €</span>
                      </div>
                      <hr className="my-2" />
                      <div className="flex justify-between font-semibold">
                        <span>Net associés</span>
                        <span className="text-green-600">{isirComparison.is.netAssocies.toLocaleString('fr-FR')} €</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={!isirComparison.avantageIS ? 'border-green-500/50' : ''}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span>Impôt sur le Revenu</span>
                      {!isirComparison.avantageIS && (
                        <Badge className="bg-green-500">Recommandé</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">IR ({simulationData.tauxIR}%)</span>
                        <span>-{isirComparison.ir.impot.toLocaleString('fr-FR')} €</span>
                      </div>
                      <hr className="my-2" />
                      <div className="flex justify-between font-semibold">
                        <span>Net associé</span>
                        <span className="text-green-600">{isirComparison.ir.net.toLocaleString('fr-FR')} €</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-amber-500/20 bg-amber-500/5">
                <CardContent className="pt-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-700">Simulation simplifiée</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Cette simulation ne prend pas en compte tous les paramètres (CSG/CRDS, abattements, charges sociales TNS, etc.). 
                        Consultez un expert-comptable pour une analyse personnalisée.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Holding Tab */}
        <TabsContent value="holding" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Avantages d'une structure holding
              </CardTitle>
              <CardDescription>
                Pourquoi créer une holding pour vos participations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    Régime mère-fille
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Exonération de 95% des dividendes remontés des filiales (quote-part de frais de 5% imposée à l'IS).
                  </p>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <Percent className="h-4 w-4 text-green-600" />
                    Plus-values sur titres
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Exonération des plus-values de cession de titres de participation (quote-part de 12% imposée).
                  </p>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <Scale className="h-4 w-4 text-green-600" />
                    Impact IFI
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Holding animatrice : exonération totale de l'IFI sur les titres (bien professionnel).
                  </p>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <ArrowRight className="h-4 w-4 text-green-600" />
                    Transmission
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Facilite la transmission et la réorganisation du groupe (apport de titres, donation, etc.).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* List of existing holdings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vos holdings</CardTitle>
              <CardDescription>Holdings existantes dans votre patrimoine</CardDescription>
            </CardHeader>
            <CardContent>
              {societes.filter(s => s.holding && s.holding !== 'Non').length > 0 ? (
                <div className="space-y-3">
                  {societes.filter(s => s.holding && s.holding !== 'Non').map((societe) => (
                    <div key={societe.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{societe.denomination}</p>
                          <p className="text-sm text-muted-foreground">
                            {getSocieteTypeLabel(societe.type_societe)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={societe.holding === 'Animatrice' ? 'default' : 'secondary'}>
                          Holding {societe.holding}
                        </Badge>
                        {societe.holding === 'Animatrice' && (
                          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            IFI exonéré
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Building2 className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground text-sm">
                    Aucune holding enregistrée
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
