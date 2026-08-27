import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useSocietes } from '@/hooks/useSocietes';
import { useSocieteParticipations } from '@/hooks/useSocieteParticipations';
import { Calculator, Scale, TrendingUp, Building2 } from 'lucide-react';
import { computeImpotSocietes } from '@/lib/societes/impotSocietes';

// Seuil légal de détention pour l'éligibilité au régime mère-fille (CGI art. 145).
const SEUIL_PARTICIPATION_MERE_FILLE = 5;

// Tranches IR 2024 simplifiées
const computeIR = (rev: number) => {
  const tr = [
    [11294, 0], [28797, 0.11], [82341, 0.30], [177106, 0.41], [Infinity, 0.45]
  ];
  let prev = 0, ir = 0;
  for (const [lim, t] of tr as [number, number][]) {
    if (rev <= lim) { ir += (rev - prev) * t; break; }
    ir += (lim - prev) * t; prev = lim;
  }
  return Math.max(0, ir);
};

export const SocietesStrategiesFiscales: React.FC = () => {
  const { societes } = useSocietes();
  const { participations } = useSocieteParticipations();
  const [societeId, setSocieteId] = useState<string | null>(null);
  const societe = societes.find(s => s.id === societeId);

  // Sim 1: IS vs IR
  const [resultat, setResultat] = useState(80000);
  const [tmi, setTmi] = useState(30);

  // Sim 2: Rému vs dividendes
  const [enveloppe, setEnveloppe] = useState(100000);
  const [partRemu, setPartRemu] = useState([50]);

  // Sim 3: Holding — le régime mère-fille suppose une participation réelle d'au
  // moins 5% entre deux sociétés de l'utilisateur (societe_participations), pas
  // simplement la possession de 2 sociétés indépendantes.
  const participationsEligibles = useMemo(
    () => participations.filter(p => p.pourcentage >= SEUIL_PARTICIPATION_MERE_FILLE),
    [participations]
  );
  const isHolding = participationsEligibles.length > 0;

  const isVsIr = useMemo(() => {
    const impotIS = computeImpotSocietes(resultat);
    const apresIS = resultat - impotIS;
    const flatTax = apresIS * 0.30;
    const totalIS = impotIS + flatTax;
    const totalIR = computeIR(resultat * 0.9) + resultat * 0.17; // approx CSG/CRDS
    return { totalIS, totalIR, apresIS, flatTax, impotIS };
  }, [resultat]);

  const remuVsDiv = useMemo(() => {
    const remu = enveloppe * (partRemu[0] / 100);
    const div = enveloppe - remu;
    const chargesSociales = remu * 0.45;
    const remuNette = remu - chargesSociales;
    const irRemu = computeIR(remuNette);
    const flatTax = div * 0.30;
    const netPercu = (remuNette - irRemu) + (div - flatTax);
    const coutTotal = enveloppe - netPercu + chargesSociales;
    return { remu, div, chargesSociales, irRemu, flatTax, netPercu, coutTotal };
  }, [enveloppe, partRemu]);

  const holdingGain = useMemo(() => {
    // Seules les filiales réellement détenues à ≥5% par une autre société de
    // l'utilisateur entrent dans l'hypothèse de dividendes distribués en interne.
    const filialesEligiblesIds = new Set(participationsEligibles.map(p => p.societe_fille_id));
    const societesFiliales = societes.filter(s => filialesEligiblesIds.has(s.id));
    const dividendesEstimes = societesFiliales.reduce((s, c) => s + ((c.valeur_estimee || 0) * 0.03), 0);
    const sansHolding = dividendesEstimes * 0.30;
    const avecHolding = computeImpotSocietes(dividendesEstimes * 0.05); // mère-fille 95% exonéré, IS sur la quote-part de frais de 5%
    return { dividendesEstimes, sansHolding, avecHolding, gain: sansHolding - avecHolding };
  }, [societes, participationsEligibles]);

  return (
    <div className="space-y-6">
      {/* IS vs IR */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Scale className="h-4 w-4" />IS vs IR</CardTitle>
          <CardDescription>Comparaison du coût fiscal global selon le régime</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Résultat de la société (€)</Label><Input type="number" value={resultat} onChange={e => setResultat(Number(e.target.value) || 0)} /></div>
            <div><Label>TMI personnel (%)</Label><Input type="number" value={tmi} onChange={e => setTmi(Number(e.target.value) || 0)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-[5px] bg-muted/40">
              <div className="text-sm text-muted-foreground">Total IS + flat tax</div>
              <div className="text-2xl font-semibold">{isVsIr.totalIS.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</div>
              <div className="text-xs text-muted-foreground mt-2">IS : {isVsIr.impotIS.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} € · Flat tax : {isVsIr.flatTax.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</div>
            </div>
            <div className="p-4 rounded-[5px] bg-muted/40">
              <div className="text-sm text-muted-foreground">Total IR + prélèvements sociaux</div>
              <div className="text-2xl font-semibold">{isVsIr.totalIR.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</div>
            </div>
          </div>
          <Badge variant={isVsIr.totalIS < isVsIr.totalIR ? 'default' : 'secondary'}>
            {isVsIr.totalIS < isVsIr.totalIR ? 'IS plus avantageux' : 'IR plus avantageux'}
          </Badge>
        </CardContent>
      </Card>

      {/* Rému vs dividendes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Calculator className="h-4 w-4" />Rémunération vs dividendes</CardTitle>
          <CardDescription>Répartition optimale d'une enveloppe disponible</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Enveloppe disponible (€)</Label><Input type="number" value={enveloppe} onChange={e => setEnveloppe(Number(e.target.value) || 0)} /></div>
          <div>
            <Label>Part en rémunération : {partRemu[0]}%</Label>
            <Slider value={partRemu} onValueChange={setPartRemu} max={100} step={5} />
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="p-3 rounded-[5px] bg-muted/40"><div className="text-muted-foreground">Charges sociales</div><div className="font-medium">{remuVsDiv.chargesSociales.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</div></div>
            <div className="p-3 rounded-[5px] bg-muted/40"><div className="text-muted-foreground">IR + Flat tax</div><div className="font-medium">{(remuVsDiv.irRemu + remuVsDiv.flatTax).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</div></div>
            <div className="p-3 rounded-[5px] bg-primary/10"><div className="text-muted-foreground">Net perçu</div><div className="font-medium text-primary">{remuVsDiv.netPercu.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</div></div>
          </div>
        </CardContent>
      </Card>

      {/* Holding */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" />Optimisation par holding</CardTitle>
          <CardDescription>Régime mère-fille (95% exonéré) et intégration fiscale</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!isHolding ? (
            <p className="text-sm text-muted-foreground">Détection : aucune participation d'au moins {SEUIL_PARTICIPATION_MERE_FILLE}% entre deux de vos sociétés (table des participations, onglet "Mes sociétés"). Le régime mère-fille suppose une relation mère/fille réelle, pas seulement la possession de plusieurs sociétés.</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Hypothèse : 3% de la valeur estimée des filiales éligibles (participation ≥{SEUIL_PARTICIPATION_MERE_FILLE}%) distribués en dividendes ({holdingGain.dividendesEstimes.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €).</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-[5px] bg-muted/40"><div className="text-sm text-muted-foreground">Sans holding</div><div className="text-xl font-semibold">{holdingGain.sansHolding.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</div></div>
                <div className="p-4 rounded-[5px] bg-muted/40"><div className="text-sm text-muted-foreground">Avec holding (mère-fille)</div><div className="text-xl font-semibold">{holdingGain.avecHolding.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</div></div>
                <div className="p-4 rounded-[5px] bg-primary/10"><div className="text-sm text-muted-foreground">Gain estimé</div><div className="text-xl font-semibold text-primary">{holdingGain.gain.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</div></div>
              </div>
              <p className="text-xs text-muted-foreground">Simulation simplifiée : conservation des titres ≥2 ans et option formelle pour le régime mère-fille non vérifiées.</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
