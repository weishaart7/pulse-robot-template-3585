import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FieldHelp } from '@/components/ui/field-help';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePassifs, useEmprunts } from '@/hooks/usePassifs';
import {
  buildPatrimonySnapshot,
  buildAVContracts,
  buildSpouseAsDecedentFamilyGraph,
  computeRecuAuPremierDeces,
  buildRecuAuPremierDecesRawAssets,
  buildSpouseRawAssets,
  buildSpouseOwnBasePatrimony,
  addReunifiedFullOwnership,
  widowFamilyGraph,
  computeAVReintegrationCivile,
  AVDonneesInsuffisantesError,
  SpouseSuccessionNonModelisableError
} from '@/utils/transmissionHelpers';
import { loadTransmissionData, buildOrdreNormalBase, computeOrdreNormal } from '@/utils/transmissionOrdreNormal';
import {
  computeTransmission,
  computeChainedTransmission,
  ChainedTransmissionResult,
  TransmissionContext
} from '@/lib/transmission';
import { BienNonQualifieError } from '@/lib/patrimoine/succession';
import './kairos-transmission.css';

type Ordre = 'normal' | 'inverse';

interface OrdreResult {
  result: ChainedTransmissionResult | null;
  errorMessage: string | null;
  errorKind: 'bien-non-qualifie' | 'av-donnees-insuffisantes' | 'conjoint-sans-enfant' | 'autre' | null;
}

const EMPTY_ORDRE_RESULT: OrdreResult = { result: null, errorMessage: null, errorKind: null };

export const Succession2ndDeces = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { passifs, loading: passifsLoading } = usePassifs();
  const { emprunts, loading: empruntsLoading } = useEmprunts();
  const [loading, setLoading] = useState(true);
  const [ordre, setOrdre] = useState<Ordre>('normal');
  const [nomUtilisateur, setNomUtilisateur] = useState('Vous');
  const [nomConjoint, setNomConjoint] = useState('Votre conjoint');
  const [resultsByOrdre, setResultsByOrdre] = useState<Record<Ordre, OrdreResult>>({
    normal: EMPTY_ORDRE_RESULT,
    inverse: EMPTY_ORDRE_RESULT
  });

  useEffect(() => {
    if (user && !passifsLoading && !empruntsLoading) {
      fetchAndCompute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, passifsLoading, passifs, empruntsLoading, emprunts]);

  const errorToOrdreResult = (error: unknown): OrdreResult => {
    if (error instanceof BienNonQualifieError) {
      return { result: null, errorMessage: error.message, errorKind: 'bien-non-qualifie' };
    }
    if (error instanceof AVDonneesInsuffisantesError) {
      return { result: null, errorMessage: error.message, errorKind: 'av-donnees-insuffisantes' };
    }
    if (error instanceof SpouseSuccessionNonModelisableError) {
      return { result: null, errorMessage: error.message, errorKind: 'conjoint-sans-enfant' };
    }
    if (import.meta.env.DEV) console.error('Erreur calcul succession 2nd décès:', error);
    return {
      result: null,
      errorMessage: error instanceof Error ? error.message : 'Erreur inconnue lors du calcul.',
      errorKind: 'autre'
    };
  };

  const fetchAndCompute = async () => {
    try {
      setLoading(true);

      const data = await loadTransmissionData(user!.id);
      const { familyProfile, maritalStatus, familyLinks, assets, assetDemembrements, demembrementCtx, societesDutreil, avContractsRaw } = data;

      setNomUtilisateur(`${familyProfile?.prenom || ''} ${familyProfile?.nom || ''}`.trim() || 'Vous');
      setNomConjoint(`${maritalStatus?.prenom_conjoint || ''} ${maritalStatus?.nom_conjoint || ''}`.trim() || 'Votre conjoint');

      // Éléments communs aux deux ordres (graphe, contrats AV, passifs,
      // régime) : même construction que Synthese.tsx pour le 1er décès.
      const base = buildOrdreNormalBase(data, passifs, emprunts);
      const {
        params,
        referenceDate,
        optionConjointEnregistree: optionConjoint,
        regimeMatrimonial,
        familyUtilisateur,
        avContractsUtilisateur,
        passifLinesUtilisateur,
        passifLinesBrut,
        participationAcquets,
        recompenses,
        creancesEntreEpoux
      } = base;

      // --- Ordre normal (Utilisateur d'abord) ---
      let normalResult: OrdreResult;
      try {
        normalResult = { result: computeOrdreNormal(base, optionConjoint), errorMessage: null, errorKind: null };
      } catch (error) {
        normalResult = errorToOrdreResult(error);
      }

      // --- Ordre inversé (conjoint d'abord) ---
      let inverseResult: OrdreResult;
      try {
        // L'Utilisateur survit au conjoint : héritier (marié) ou partenaire de PACS.
        const spouseFamilyFirst = buildSpouseAsDecedentFamilyGraph(familyProfile, maritalStatus, familyLinks || [], { utilisateurSurvivant: true });
        const avContractsConjointPremier = buildAVContracts(
          avContractsRaw,
          familyProfile?.date_naissance,
          spouseFamilyFirst,
          referenceDate,
          (maritalStatus as any)?.date_naissance_conjoint
        );
        const spouseBasePatrimony = buildSpouseOwnBasePatrimony(assets || [], passifLinesBrut, assetDemembrements, demembrementCtx);
        const ctxConjointDecede: TransmissionContext = {
          family: spouseFamilyFirst,
          patrimony: spouseBasePatrimony,
          liberalites: [],
          params,
          societesDutreil,
          // Option du survivant commune aux deux ordres (décision V1) : celle
          // choisie pour le conjoint au décès de l'Utilisateur. Si elle n'est
          // pas ouverte dans ce sens (DDV non consentie par le conjoint,
          // enfant non commun), successionLegale.ts retombe sur 1/4 PP.
          conjointOption: (optionConjoint as any) || undefined,
          referenceDate,
          rawAssets: buildSpouseRawAssets(assets || [], assetDemembrements, demembrementCtx),
          assetDemembrements,
          demembrementCtx,
          // Contrats du conjoint, dénoués à son décès : résolus contre
          // spouseFamilyFirst (le conjoint du souscripteur y est l'Utilisateur).
          avContracts: avContractsConjointPremier,
          // Contrat AV détenu par l'Utilisateur, non dénoué puisque c'est le
          // conjoint qui décède en premier ici : réintégré civilement (doctrine
          // Ciot, §9.6.1), via le même mécanisme que ctxUtilisateurDecede —
          // n'a pas besoin de la résolution des bénéficiaires (capitalDeces/
          // detenteur/origineFonds uniquement), donc safe malgré la limitation
          // ci-dessus.
          avReintegrationCivileMontant: computeAVReintegrationCivile(avContractsUtilisateur, 'user', regimeMatrimonial),
          // regimeMatrimonial + participationAcquets + recompenses/
          // creancesEntreEpoux : safe côté conjoint, aucun de ces mécanismes
          // n'opère sur rawAssets/qualification_bien, cf. commentaire
          // ctxUtilisateurDecede ci-dessus.
          regimeMatrimonial,
          participationAcquets,
          recompenses,
          creancesEntreEpoux
        };
        const firstDeathConjoint = computeTransmission(ctxConjointDecede);

        const utilisateurVeufFamily = widowFamilyGraph(familyUtilisateur, familyLinks || []);
        const utilisateurBasePatrimony = buildPatrimonySnapshot(assets || [], passifLinesUtilisateur, 0, assetDemembrements, demembrementCtx);
        const utilisateurVeufPatrimony = addReunifiedFullOwnership(
          utilisateurBasePatrimony,
          firstDeathConjoint,
          familyUtilisateur.decedentId,
          avContractsConjointPremier
        );
        // Contrats de l'Utilisateur, dénoués à son décès (2nd) : résolus contre
        // le graphe veuf — une clause au profit du conjoint prédécédé est
        // caduque ou bascule au rang suivant.
        const avContractsUtilisateurVeuf = buildAVContracts(
          avContractsRaw,
          familyProfile?.date_naissance,
          utilisateurVeufFamily,
          referenceDate,
          (maritalStatus as any)?.date_naissance_conjoint
        );

        const chainedInverse = computeChainedTransmission({
          firstDeath: ctxConjointDecede,
          secondDeath: {
            family: utilisateurVeufFamily,
            patrimony: utilisateurVeufPatrimony,
            liberalites: [],
            params,
            societesDutreil,
            referenceDate,
            rawAssets: [
              ...(assets || []),
              ...buildRecuAuPremierDecesRawAssets(
                computeRecuAuPremierDeces(firstDeathConjoint, familyUtilisateur.decedentId, avContractsConjointPremier)
              )
            ],
            assetDemembrements,
            demembrementCtx,
            avContracts: avContractsUtilisateurVeuf
          }
        });
        inverseResult = { result: chainedInverse, errorMessage: null, errorKind: null };
      } catch (error) {
        inverseResult = errorToOrdreResult(error);
      }

      setResultsByOrdre({ normal: normalResult, inverse: inverseResult });
    } catch (error) {
      if (import.meta.env.DEV) console.error('Erreur lors du calcul de la succession 2nd décès:', error);
      setResultsByOrdre({
        normal: errorToOrdreResult(error),
        inverse: errorToOrdreResult(error)
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="kairos-transmission flex justify-center items-center h-64">
        <div className="text-lg text-[var(--text-secondary)]">Calcul en cours...</div>
      </div>
    );
  }

  const current = resultsByOrdre[ordre];
  const decedentFirstNom = ordre === 'normal' ? nomUtilisateur : nomConjoint;
  const decedentSecondNom = ordre === 'normal' ? nomConjoint : nomUtilisateur;

  return (
    <div className="kairos-transmission space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-[var(--text-secondary)]">
          Ordre des décès
          <FieldHelp>
            L'option retenue par le survivant (1/4 en pleine propriété, usufruit…) est celle choisie dans
            Optimisation, appliquée aux deux ordres. Si elle n'est pas ouverte dans un sens, le calcul retient
            1/4 en pleine propriété.
          </FieldHelp>
          {' '}:
        </span>
        <div className="inline-flex rounded-[var(--radius-lg)] border border-[var(--kt-border)] overflow-hidden">
          <button
            type="button"
            onClick={() => setOrdre('normal')}
            className={
              'px-4 py-2 text-sm font-medium transition-colors ' +
              (ordre === 'normal'
                ? 'bg-[var(--ink-900)] text-white'
                : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]')
            }
          >
            {nomUtilisateur} d'abord
          </button>
          <button
            type="button"
            onClick={() => setOrdre('inverse')}
            className={
              'px-4 py-2 text-sm font-medium transition-colors border-l border-[var(--kt-border)] ' +
              (ordre === 'inverse'
                ? 'bg-[var(--ink-900)] text-white'
                : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]')
            }
          >
            {nomConjoint} d'abord
          </button>
        </div>
      </div>


      {!current.result ? (
        <div className="kairos-transmission text-center py-12">
          <h3 className="text-lg font-semibold mb-2 text-[var(--text-primary)]">Calcul indisponible pour cet ordre</h3>
          <p className="text-[var(--text-secondary)] mb-4 max-w-xl mx-auto">
            {current.errorMessage || 'Données insuffisantes pour simuler ce second décès.'}
          </p>
          {current.errorKind === 'av-donnees-insuffisantes' && (
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard/transmission?tab=assurance-vie')}
              className="gap-2 bg-[var(--surface)] text-[var(--text-primary)] border-[var(--kt-border-strong)] rounded-[var(--radius-lg)]"
            >
              Renseigner le contrat dans Assurance-vie
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          {current.errorKind === 'bien-non-qualifie' && (
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard/patrimoine?tab=actifs')}
              className="gap-2 bg-[var(--surface)] text-[var(--text-primary)] border-[var(--kt-border-strong)] rounded-[var(--radius-lg)]"
            >
              Qualifier ce bien dans Patrimoine
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          {current.errorKind === 'conjoint-sans-enfant' && (
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard/famille')}
              className="gap-2 bg-[var(--surface)] text-[var(--text-primary)] border-[var(--kt-border-strong)] rounded-[var(--radius-lg)]"
            >
              Renseigner la famille dans le module Famille
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        <Succession2ndDecesContent
          result={current.result}
          decedentSecondNom={decedentSecondNom}
          decedentFirstNom={decedentFirstNom}
          formatCurrency={formatCurrency}
        />
      )}
    </div>
  );
};

interface ContentProps {
  result: ChainedTransmissionResult;
  decedentFirstNom: string;
  decedentSecondNom: string;
  formatCurrency: (amount: number) => string;
}

const Succession2ndDecesContent: React.FC<ContentProps> = ({
  result,
  decedentFirstNom,
  decedentSecondNom,
  formatCurrency
}) => {
  const { secondDeath, reunionUsufruit, transmissionNetteCombinee } = result;

  // Noms d'affichage : d'abord les héritiers du 2nd décès lui-même, puis les
  // nu-propriétaires du 1er décès pour ceux qui ne sont pas des héritiers du
  // 2nd décès (ex. enfant non commun d'une famille recomposée, cf.
  // secondDeces.test.ts) — cf. décision actée : cet onglet n'a pas besoin
  // d'afficher le détail du 1er décès, seulement de nommer correctement ses
  // nu-propriétaires ici.
  const nameById = new Map<string, string>();
  secondDeath.heirs.forEach(h => nameById.set(h.personId, h.nom));
  result.firstDeath.heirs.forEach(h => {
    if (!nameById.has(h.personId)) nameById.set(h.personId, h.nom);
  });

  const droitsTotal = secondDeath.dmtg.totals.droitsTotaux;
  const masseFiscale = secondDeath.masseCalcul;

  return (
    <div className="space-y-6">
      <Card className="bg-[var(--surface)] border-[var(--kt-border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
        <CardHeader className="p-5">
          <CardTitle className="text-[15px] font-semibold text-[var(--text-primary)]">
            Succession de {decedentSecondNom} (2nd décès)
            <FieldHelp>
              Patrimoine propre de {decedentSecondNom} à l'issue du 1er décès de {decedentFirstNom} : ses propres
              biens, plus ce qu'il/elle a reçu en pleine propriété (héritage, capitaux d'assurance-vie et de PER
              nets de prélèvement), supposé conservé tel quel jusqu'au 2nd décès et taxé comme un actif financier.
              Sans l'usufruit qu'il/elle détenait, réuni séparément ci-dessous.
            </FieldHelp>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="text-center p-6 rounded-[var(--radius-lg)] border border-[var(--kt-border)] bg-[var(--surface-sunken)]">
              <div className="kairos-num text-[26px] font-semibold tracking-[-0.02em] text-[var(--text-primary)] mb-2">
                {formatCurrency(masseFiscale)}
              </div>
              <div className="text-sm font-medium text-[var(--text-secondary)]">Masse fiscale</div>
            </div>
            <div className="text-center p-6 rounded-[var(--radius-lg)] border border-[var(--kt-border)] bg-[var(--surface-sunken)]">
              <div className="kairos-num text-[26px] font-semibold tracking-[-0.02em] text-[var(--text-primary)] mb-2">
                {formatCurrency(droitsTotal)}
              </div>
              <div className="text-sm font-medium text-[var(--text-secondary)]">Droits de succession</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[var(--surface)] border-[var(--kt-border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
        <CardHeader className="p-5">
          <CardTitle className="text-[15px] font-semibold text-[var(--text-primary)]">
            Réunion de l'usufruit
            <FieldHelp>
              Art. 1133 CGI : l'usufruit que {decedentSecondNom} détenait sur la part de {decedentFirstNom}
              s'éteint à son décès et complète directement la propriété des nu-propriétaires, sans taxation et
              sans jamais entrer dans la masse fiscale ci-dessus.
            </FieldHelp>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-4">
          <div className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--kt-border)] bg-[var(--positive-subtle,var(--surface-sunken))] px-5 py-4">
            <span className="text-sm font-medium text-[var(--text-secondary)]">
              Valeur totale réunie, hors taxation
            </span>
            <span className="kairos-num text-[20px] font-semibold text-[var(--text-primary)]">
              + {formatCurrency(reunionUsufruit.total)}
            </span>
          </div>

          {reunionUsufruit.parNuProprietaire.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nu-propriétaire (1er décès)</TableHead>
                  <TableHead className="text-right">Part réunie, hors taxation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reunionUsufruit.parNuProprietaire.map(part => (
                  <TableRow key={part.personId}>
                    <TableCell>{nameById.get(part.personId) || part.personId}</TableCell>
                    <TableCell className="text-right kairos-num">{formatCurrency(part.montant)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="bg-[var(--surface)] border-[var(--kt-border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
        <CardHeader className="p-5">
          <CardTitle className="text-[15px] font-semibold text-[var(--text-primary)]">
            Transmission nette combinée
            <FieldHelp>Héritage net du 2nd décès + réunion d'usufruit hors taxation, par bénéficiaire.</FieldHelp>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bénéficiaire</TableHead>
                <TableHead className="text-right">Droits de succession</TableHead>
                <TableHead className="text-right">Réunion d'usufruit</TableHead>
                <TableHead className="text-right">Transmission nette</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transmissionNetteCombinee.map(entry => {
                const netHeir = secondDeath.netBreakdown.heirs.find(h => h.personId === entry.personId);
                const reunion = reunionUsufruit.parNuProprietaire.find(r => r.personId === entry.personId);
                return (
                  <TableRow key={entry.personId}>
                    <TableCell>{nameById.get(entry.personId) || entry.personId}</TableCell>
                    <TableCell className="text-right kairos-num">
                      {formatCurrency(netHeir?.droitsDMTG || 0)}
                    </TableCell>
                    <TableCell className="text-right kairos-num">
                      {reunion ? `+ ${formatCurrency(reunion.montant)}` : '—'}
                    </TableCell>
                    <TableCell className="text-right kairos-num font-semibold">
                      {entry.montant < 0 ? `${formatCurrency(-entry.montant)} à verser` : formatCurrency(entry.montant)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
