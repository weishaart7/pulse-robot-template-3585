import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PanelCard, PanelCardContent, PanelCardHeader, PanelCardTitle, PanelCardDescription } from '@/components/layout/panel-section';
import { panelPrimaryButtonClass, Chip } from '@/components/layout/workspace-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useSocietes } from '@/hooks/useSocietes';
import { useSocieteParticipations } from '@/hooks/useSocieteParticipations';
import { getSocieteTypeLabel } from '@/hooks/useSocietesIntegration';
import { useSocieteDutreil } from '@/hooks/useSocieteExtended';
import { societeDutreilService } from '@/services/societeExtendedService';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { getPartSuccessorale, BienNonQualifieError } from '@/lib/patrimoine/succession';
import { evaluerEligibiliteDutreil, TYPE_ENGAGEMENT_COLLECTIF_OPTIONS } from '@/lib/patrimoine/dutreil';

// Barème DMTG ligne directe simplifié 2024
const computeDMTG = (base: number, abattement = 100000) => {
  const taxable = Math.max(0, base - abattement);
  const tr = [[8072, 0.05], [12109, 0.10], [15932, 0.15], [552324, 0.20], [902838, 0.30], [1805677, 0.40], [Infinity, 0.45]];
  let prev = 0, dmtg = 0;
  for (const [lim, t] of tr as [number, number][]) {
    if (taxable <= lim) { dmtg += (taxable - prev) * t; break; }
    dmtg += (lim - prev) * t; prev = lim;
  }
  return Math.max(0, dmtg);
};

// Société choisie : partagée avec l'onglet Gouvernance par SocietesSection.
export const SocietesTransmission: React.FC<{ societeId: string | null; onSocieteChange: (id: string) => void }> = ({
  societeId,
  onSocieteChange: setSocieteId,
}) => {
  const { societes } = useSocietes();
  const societe = societes.find(s => s.id === societeId);
  const { participations } = useSocieteParticipations();
  // Filiales à caractère patrimonial (SCI, société civile de gestion, holding passive) :
  // leurs actifs sont en principe non affectés à l'activité, à reporter dans la part de
  // biens non affectés — signalées ici, jamais déduites automatiquement.
  const filialesPatrimoniales = useMemo(() => participations
    .filter(p => p.societe_mere_id === societeId)
    .map(p => ({ p, fille: societes.find(s => s.id === p.societe_fille_id) }))
    .filter(({ fille }) => !!fille && (
      fille.type_societe === 'societe-civile'
      || fille.holding === 'Passive'
      || ['Patrimoniale', 'Gestion immobilière'].includes(fille.activite || '')
    )), [participations, societes, societeId]);
  const { dutreil, refetch } = useSocieteDutreil(societeId);
  const [draft, setDraft] = useState<any>(null);
  // Activité éligible et seuils de détention : déclaratifs, confirmés par le
  // conseiller — repris de eligibilite_validee à l'ouverture de la fiche.
  const [confirmationActivite, setConfirmationActivite] = useState(false);
  useEffect(() => {
    setConfirmationActivite(!!dutreil?.eligibilite_validee);
  }, [dutreil]);
  // Brouillon propre à la société affichée : sans cette remise à zéro, la
  // fiche d'une société restait affichée (et enregistrée) sur la suivante.
  useEffect(() => {
    setDraft(null);
  }, [societeId]);

  // OBO state
  const [valeurOBO, setValeurOBO] = useState(1000000);
  const [apport, setApport] = useState(300000);
  const [dette, setDette] = useState(700000);
  const [tauxDette, setTauxDette] = useState(4);
  const [ebitda, setEbitda] = useState(100000);

  const d = draft || dutreil || {};

  // Valeur successorale de la société, pondérée par qualification_bien/detenteur
  // (lib/patrimoine/succession.ts::getPartSuccessorale, source unique de vérité
  // déjà utilisée pour ce même calcul côté module Transmission), plutôt que la
  // valeur brute de la société qui ignorait la quotité de détention réelle.
  const societePart = useMemo(() => {
    if (!societe) return { valeur: 0, error: null as string | null };
    try {
      const part = getPartSuccessorale(societe, societe.denomination);
      return { valeur: (societe.valeur_estimee || 0) * part, error: null };
    } catch (err) {
      if (err instanceof BienNonQualifieError) {
        return { valeur: 0, error: err.message };
      }
      throw err;
    }
  }, [societe]);

  const valeurParts = d.valeur_parts_transmises ?? societePart.valeur;

  // Éligibilité au jour d'une transmission simulée aujourd'hui (art. 787 B
  // CGI, cf. lib/patrimoine/dutreil.ts) — enregistrée dans eligibilite_validee,
  // seul drapeau lu par le calcul de transmission.
  const eligibilite = useMemo(
    () => evaluerEligibiliteDutreil(d, new Date().toISOString().split('T')[0], confirmationActivite),
    [d, confirmationActivite]
  );
  const eligible = eligibilite.eligible;
  const baseClassique = Number(valeurParts) || 0;
  // Abattement de 75 %, hors part des biens non affectés à l'activité (LF 2026).
  const partNonAffectee = Math.min(100, Math.max(0, Number(d.part_biens_non_affectes) || 0)) / 100;
  const baseDutreil = baseClassique * (1 - 0.75 * (1 - partNonAffectee));
  const dmtgClassique = computeDMTG(baseClassique);
  const dmtgDutreil = computeDMTG(baseDutreil);
  const economie = dmtgClassique - dmtgDutreil;

  // OBO
  const interetsAnnuels = dette * (tauxDette / 100);
  const couvertureDette = ebitda > 0 ? ebitda / interetsAnnuels : 0;
  const partApport = (apport / valeurOBO) * 100;

  const saveDutreil = async () => {
    if (!societeId) return;
    try {
      await societeDutreilService.upsert({ societe_id: societeId, ...d, eligibilite_validee: eligible });
      toast.success(eligible ? 'Pacte Dutreil enregistré — éligibilité validée' : 'Pacte Dutreil enregistré — éligibilité non validée');
      setDraft(null);
      refetch();
    } catch (e) { toast.error('Erreur'); if (import.meta.env.DEV) console.error(e); }
  };

  if (societes.length === 0) {
    return (
      <div className="px-8 py-7">
        <p className="max-w-md text-[13px] text-muted-foreground">Aucune société enregistrée.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Choix de la société : bandeau fileté en tête du panneau. */}
      <div className="flex items-center gap-4 border-b border-border px-8 py-4">
        <Label>Société</Label>
        <Select value={societeId || undefined} onValueChange={setSocieteId}>
          <SelectTrigger className="w-80"><SelectValue placeholder="Sélectionner une société" /></SelectTrigger>
          <SelectContent>
            {societes.map(s => <SelectItem key={s.id} value={s.id}>{s.denomination}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {societeId && (
        <>
          {societePart.error && d.valeur_parts_transmises == null && (
            <div className="mx-8 mt-6 flex items-center gap-2 rounded-[2px] bg-destructive/10 p-3 text-[13px] text-destructive">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {societePart.error} Vous pouvez saisir manuellement une valeur des parts transmises ci-dessous en attendant, ou qualifier la société dans l'onglet "Mes sociétés".
            </div>
          )}

          {/* Pacte Dutreil */}
          <PanelCard>
            <PanelCardHeader>
              <PanelCardTitle>Pacte Dutreil — Abattement 75%</PanelCardTitle>
              <PanelCardDescription>Conditions d'éligibilité et calcul de l'économie fiscale</PanelCardDescription>
            </PanelCardHeader>
            <PanelCardContent>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Engagement collectif de conservation</Label>
                  <Select value={d.type_engagement_collectif || undefined} onValueChange={v => setDraft({ ...d, type_engagement_collectif: v })}>
                    <SelectTrigger><SelectValue placeholder="Choisir la forme de l'engagement" /></SelectTrigger>
                    <SelectContent>
                      {TYPE_ENGAGEMENT_COLLECTIF_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {d.type_engagement_collectif === 'signe' && (
                  <div><Label>Date de signature de l'engagement collectif</Label><Input type="date" value={d.engagement_collectif_date || ''} onChange={e => setDraft({ ...d, engagement_collectif_date: e.target.value })} /></div>
                )}
                <div>
                  <Label>Date engagement individuel (si déjà pris)</Label>
                  <Input type="date" value={d.engagement_individuel_date || ''} onChange={e => setDraft({ ...d, engagement_individuel_date: e.target.value })} />
                  <p className="text-xs text-muted-foreground mt-1">
                    Pris par chaque héritier ou donataire lors de la transmission, pour 6 ans (4 ans avant le 21/02/2026) : présumé.
                  </p>
                </div>
                <div><Label>Fonction de direction exercée</Label><Input value={d.fonction_direction || ''} onChange={e => setDraft({ ...d, fonction_direction: e.target.value })} placeholder="Gérant, président..." /></div>
                <div><Label>Valeur des parts transmises (€)</Label><Input type="number" value={d.valeur_parts_transmises ?? ''} onChange={e => setDraft({ ...d, valeur_parts_transmises: e.target.value ? Number(e.target.value) : null })} placeholder={String(societePart.valeur || 0)} /></div>
                <div>
                  <Label>Part de biens non affectés à l'activité (%)</Label>
                  <Input type="number" min={0} max={100} step="0.1" value={d.part_biens_non_affectes ?? ''} onChange={e => setDraft({ ...d, part_biens_non_affectes: e.target.value === '' ? null : Math.min(100, Math.max(0, Number(e.target.value))) })} placeholder="0 si aucun" />
                  <p className="text-xs text-muted-foreground mt-1">
                    Véhicules de tourisme, yachts, objets d'art, logements… non affectés à l'activité depuis 3 ans : cette part de la valeur
                    des titres n'est plus exonérée (art. 787 B CGI, depuis le 21/02/2026). Obligatoire pour le calcul de la succession.
                  </p>
                </div>
              </div>

              {filialesPatrimoniales.length > 0 && (
                <div className="flex items-start gap-2 rounded-[2px] bg-secondary/60 p-3 text-[13px]">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <span>
                    Cette société détient{' '}
                    {filialesPatrimoniales.map(({ p, fille }) => `${fille!.denomination} (${getSocieteTypeLabel(fille!.type_societe, fille!.forme_societe_civile)}, ${p.pourcentage} %)`).join(', ')}.
                    {' '}Si ses actifs ne sont pas affectés à l'activité, la part correspondante de la valeur des titres est à
                    reporter dans « Part de biens non affectés à l'activité ».
                  </span>
                </div>
              )}

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">{eligibilite.engagementCollectif ? <CheckCircle2 className="h-4 w-4 text-positive" /> : <XCircle className="h-4 w-4 text-destructive" />}Engagement collectif en cours au jour de la transmission (signé, réputé acquis ou post mortem)</div>
                <div className="flex items-center gap-2">{eligibilite.fonctionDirection ? <CheckCircle2 className="h-4 w-4 text-positive" /> : <XCircle className="h-4 w-4 text-destructive" />}Fonction de direction renseignée</div>
                <div className="flex items-center gap-2">{eligibilite.partBiensNonAffectes ? <CheckCircle2 className="h-4 w-4 text-positive" /> : <XCircle className="h-4 w-4 text-destructive" />}Part de biens non affectés à l'activité renseignée</div>
                <label className="flex items-start gap-2 cursor-pointer">
                  <Checkbox checked={confirmationActivite} onCheckedChange={v => setConfirmationActivite(v === true)} className="mt-0.5" />
                  <span>
                    Je confirme que la société exerce une activité éligible (industrielle, commerciale, artisanale, agricole,
                    libérale, ou holding animatrice) et que l'engagement collectif porte sur au moins 10 % des droits financiers
                    et 20 % des droits de vote.
                  </span>
                </label>
                <Chip tone={eligible ? 'lagon' : 'neutral'}>{eligible ? 'Éligibilité validée' : 'Éligibilité incomplète'}</Chip>
                <p className="text-xs text-muted-foreground">
                  Seule une éligibilité validée et enregistrée ouvre l'exonération de 75 % dans le calcul de la succession.
                </p>
              </div>

              <div className="grid grid-cols-1 divide-y divide-border border-y border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0 pt-3 border-t border-border/60">
                <div className="py-2.5 sm:px-4 sm:first:pl-0"><div className="text-xs text-muted-foreground">Donation classique</div><div className="text-[18px] font-medium tabular-nums tracking-[-0.01em]">{dmtgClassique.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</div></div>
                <div className="py-2.5 sm:px-4 sm:first:pl-0"><div className="text-xs text-muted-foreground">{eligible ? 'Avec Dutreil (75% exonéré)' : 'Avec Dutreil, si éligible'}</div><div className="text-[18px] font-medium tabular-nums tracking-[-0.01em]">{dmtgDutreil.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</div></div>
                <div className="py-2.5 sm:px-4 sm:first:pl-0 sm:bg-lagon-soft/60"><div className="text-xs text-muted-foreground">{eligible ? 'Économie' : 'Économie potentielle (éligibilité incomplète)'}</div><div className="text-[18px] font-medium tabular-nums tracking-[-0.01em] text-lagon-ink">{economie.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</div></div>
              </div>

              <Button className={panelPrimaryButtonClass} onClick={saveDutreil}>Enregistrer</Button>
            </PanelCardContent>
          </PanelCard>

          {/* OBO */}
          <PanelCard>
            <PanelCardHeader>
              <PanelCardTitle>OBO (Owner Buy-Out)</PanelCardTitle>
              <PanelCardDescription>Simulation de structure de financement</PanelCardDescription>
            </PanelCardHeader>
            <PanelCardContent>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Valorisation cible (€)</Label><Input type="number" value={valeurOBO} onChange={e => setValeurOBO(Number(e.target.value) || 0)} /></div>
                <div><Label>Apport en fonds propres (€)</Label><Input type="number" value={apport} onChange={e => setApport(Number(e.target.value) || 0)} /></div>
                <div><Label>Dette d'acquisition (€)</Label><Input type="number" value={dette} onChange={e => setDette(Number(e.target.value) || 0)} /></div>
                <div><Label>Taux d'emprunt (%)</Label><Input type="number" step="0.1" value={tauxDette} onChange={e => setTauxDette(Number(e.target.value) || 0)} /></div>
                <div><Label>EBITDA annuel récurrent (€)</Label><Input type="number" value={ebitda} onChange={e => setEbitda(Number(e.target.value) || 0)} /></div>
              </div>
              <div className="grid grid-cols-1 divide-y divide-border border-y border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <div className="py-2.5 sm:px-4 sm:first:pl-0"><div className="text-xs text-muted-foreground">Levier</div><div className="text-[18px] font-medium tabular-nums tracking-[-0.01em]">{(valeurOBO > 0 ? (dette / valeurOBO * 100).toFixed(1) : 0)}%</div></div>
                <div className="py-2.5 sm:px-4 sm:first:pl-0"><div className="text-xs text-muted-foreground">Intérêts annuels</div><div className="text-[18px] font-medium tabular-nums tracking-[-0.01em]">{interetsAnnuels.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</div></div>
                <div className="py-2.5 sm:px-4 sm:first:pl-0"><div className="text-xs text-muted-foreground">Couverture EBITDA / intérêts</div><div className="text-[18px] font-medium tabular-nums tracking-[-0.01em]">{couvertureDette.toFixed(1)}x</div></div>
              </div>
              {(apport + dette !== valeurOBO) && <Chip tone="alerte">Financement déséquilibré ({(apport + dette).toLocaleString('fr-FR')} € vs {valeurOBO.toLocaleString('fr-FR')} €)</Chip>}
            </PanelCardContent>
          </PanelCard>

          {/* Donation de parts */}
          <PanelCard>
            <PanelCardHeader>
              <PanelCardTitle>Donation de parts</PanelCardTitle>
              <PanelCardDescription>Données disponibles pour le module Transmission</PanelCardDescription>
            </PanelCardHeader>
            <PanelCardContent>
              <p className="text-sm text-muted-foreground mb-2">
                La valeur des parts ({(societe?.valeur_estimee || 0).toLocaleString('fr-FR')} €) est exploitable depuis le module
                {' '}<strong>Transmission</strong>{' '}pour calculer les droits de mutation à titre gratuit.
              </p>
              <Button variant="outline" asChild>
                <Link to="/dashboard/transmission">Ouvrir Transmission →</Link>
              </Button>
            </PanelCardContent>
          </PanelCard>
        </>
      )}
    </div>
  );
};
