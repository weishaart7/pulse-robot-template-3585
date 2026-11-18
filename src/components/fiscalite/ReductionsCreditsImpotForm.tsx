import { useEffect, useState } from 'react';
import { useReductionsCreditsImpot } from '@/hooks/useReductionsCreditsImpot';
import { useMillesimeFiscal } from '@/contexts/MillesimeFiscalContext';
import { ReductionsCreditsImpot } from '@/services/reductionsCreditsImpotService';
import { ReductionsCreditsImpotInput, REGLES_PINEL, ReglePinel, REGLES_SCELLIER, RegleScellier, REGLES_CENSI_BOUVARD } from '@/lib/fiscalite';
import { SingleCaseLigne, SingleMontantLigne, SousGroupe } from './DeclarationLigne';
import { Cadre2042, Cadre2042Chargement } from './Cadre2042';

const REDUCTIONS_VIDE: ReductionsCreditsImpotInput = {
  case7ud: null, case7uq: null, case7uj: null, case7uf: null,
  case7db: null, case7dr: null, case7dl: null, case7dq: false, case7dg: false, membresPlus65Ans: null,
};

/** Cases Pinel/Denormandie/Duflot regroupées par nature (voir REGLES_PINEL). */
const casesPinel = (nature: ReglePinel['nature'][]) =>
  (Object.entries(REGLES_PINEL) as [keyof ReductionsCreditsImpotInput, ReglePinel][])
    .filter(([, r]) => nature.includes(r.nature));
const GROUPES_PINEL: { titre: string; aide: string; natures: ReglePinel['nature'][] }[] = [
  { titre: 'Pinel, Pinel+ et Denormandie achevés en 2025', aide: "Prix de revient. Réduction de l'année (1/6 ou 1/9), plafond de 300 000 € commun.", natures: ['inv'] },
  { titre: 'Pinel, Denormandie et Duflot : reports', aide: 'Montant de la réduction reportée (1/6, 1/9 ou 1/3), plafonné selon le dispositif.', natures: ['rep', 'sans_effet'] },
  { titre: 'Pinel et Denormandie : compléments de prorogation', aide: "Prix de revient. 2 % ou 1 % pour l'année, plafond de 300 000 € par case.", natures: ['comp'] },
];

const casesScellier = (nature: RegleScellier['nature']) =>
  (Object.entries(REGLES_SCELLIER) as [keyof ReductionsCreditsImpotInput, RegleScellier][])
    .filter(([, r]) => r.nature === nature);
const GROUPES_SCELLIER: { titre: string; aide: string; nature: RegleScellier['nature'] }[] = [
  { titre: 'Scellier : reports de réduction', aide: "Montant de la réduction reportée (1/9, solde, 1/3 de complément). Plafonnement global de l'année d'investissement appliqué par l'outil.", nature: 'rep' },
  { titre: 'Scellier : compléments de prorogation 2025', aide: "Prix de revient (300 000 € maximum). 4 %, 5 % ou 6 % sur 3 ans selon l'année d'investissement.", nature: 'comp' },
];

interface ReductionsCreditsImpotFormProps {
  onSaved?: (reductions: ReductionsCreditsImpot) => void;
}

export const ReductionsCreditsImpotForm = ({ onSaved }: ReductionsCreditsImpotFormProps) => {
  const { data, loading, saving, saveData } = useReductionsCreditsImpot();
  const [rc, setRc] = useState<ReductionsCreditsImpotInput>(REDUCTIONS_VIDE);
  const [rcId, setRcId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (data) {
      const { id, ...input } = data;
      setRc(input);
      setRcId(id);
    }
  }, [data]);

  // Cases et libellés de la 2042 revenus 2025 ; en règles 2026, 7UQ (Chambord) et 7VM changent de sens.
  const { anneeRevenus } = useMillesimeFiscal();

  const update = <K extends keyof ReductionsCreditsImpotInput>(key: K, value: ReductionsCreditsImpotInput[K]) => {
    setRc(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    const saved = await saveData({ ...rc, id: rcId });
    setRcId(saved.id);
    onSaved?.(saved);
  };

  if (loading) {
    return <Cadre2042Chargement texte="Chargement des réductions et crédits d'impôt..." />;
  }

  return (
    <Cadre2042 titre="Réductions et crédits d'impôt"
      description="Cadre 7 de la 2042 : dons, services à la personne, garde, scolarité, cotisations syndicales, prestations compensatoires. Les autres réductions relèvent de la 2042-RICI, non gérée ici."
      saving={saving} onSave={handleSubmit}>
        {anneeRevenus > 2025 && (
          <p className="py-2 text-[13px] text-muted-foreground">
            Règles revenus {anneeRevenus} provisoires : les dons à 75 % se déclarent en 7UD seul (maximum 2 000 €).
            7UQ désigne les dons pour le château de Chambord et 7VM disparaît : ces deux cases restent calculées
            selon les règles 2025, à ne pas utiliser pour une simulation {anneeRevenus}.
          </p>
        )}
        <SousGroupe titre="Dons versés à des organismes établis en France" aide="Réduction non restituable. Au-delà des plafonds à 75 %, l'excédent est retenu à 66 % avec les dons 7UF, dans la limite de 20 % du revenu imposable.">
          <SingleMontantLigne label="Aide aux personnes en difficulté, du 1.1 au 13.10.2025" extra="75 %, maximum 1 000 €" code="7UD" value={rc.case7ud} onChange={v => update('case7ud', v)} />
          <SingleMontantLigne label="Aide aux personnes en difficulté, du 14.10 au 31.12.2025" extra="75 %, maximum 2 000 € avec 7UD" code="7UQ" value={rc.case7uq} onChange={v => update('case7uq', v)} />
          <SingleMontantLigne label="Sauvegarde du patrimoine religieux" extra="75 %, maximum 1 000 €" code="7UJ" value={rc.case7uj} onChange={v => update('case7uj', v)} />
          <SingleMontantLigne label="Autres organismes d'intérêt général, associations d'utilité publique, candidats aux élections" extra="66 %" code="7UF" value={rc.case7uf} onChange={v => update('case7uf', v)} />
          <SingleMontantLigne label="Dons et cotisations aux partis politiques" extra="66 %, maximum 15 000 € par foyer" code="7UH" value={rc.case7uh ?? null} onChange={v => update('case7uh', v)} />
          <SingleMontantLigne label="Aide aux victimes du cyclone Chido à Mayotte, du 1.1 au 17.5.2025" extra="75 %, maximum 2 000 €" code="7UO" value={rc.case7uo ?? null} onChange={v => update('case7uo', v)} />
          <SingleMontantLigne label="Report des dons de 2020" extra="66 %" code="7XS" value={rc.case7xs ?? null} onChange={v => update('case7xs', v)} />
          <SingleMontantLigne label="Report des dons de 2021" extra="66 %" code="7XT" value={rc.case7xt ?? null} onChange={v => update('case7xt', v)} />
          <SingleMontantLigne label="Report des dons de 2022" extra="66 %" code="7XU" value={rc.case7xu ?? null} onChange={v => update('case7xu', v)} />
          <SingleMontantLigne label="Report des dons de 2023" extra="66 %" code="7XW" value={rc.case7xw ?? null} onChange={v => update('case7xw', v)} />
          <SingleMontantLigne label="Report des dons de 2024" extra="66 %" code="7XY" value={rc.case7xy ?? null} onChange={v => update('case7xy', v)} />
          <SingleMontantLigne label="Organisme européen, aide aux personnes en difficulté, du 1.1 au 13.10.2025" extra="avec 7UD" code="7VA" value={rc.case7va ?? null} onChange={v => update('case7va', v)} />
          <SingleMontantLigne label="Organisme européen, aide aux personnes en difficulté, du 14.10 au 31.12.2025" extra="avec 7UQ" code="7VM" value={rc.case7vm ?? null} onChange={v => update('case7vm', v)} />
          <SingleMontantLigne label="Autre organisme européen" extra="66 %, avec 7UF" code="7VC" value={rc.case7vc ?? null} onChange={v => update('case7vc', v)} />
        </SousGroupe>

        <SousGroupe titre="Services à la personne" aide="Crédit restituable de 50 % des dépenses nettes des aides, dans la limite du plafond.">
          <SingleMontantLigne label="Dépenses de services à la personne" code="7DB" value={rc.case7db} onChange={v => update('case7db', v)} />
          <SingleMontantLigne label="Aides perçues" extra="APA, PCH, CESU préfinancé…" code="7DR" value={rc.case7dr} onChange={v => update('case7dr', v)} />
          <SingleMontantLigne label="Avance immédiate perçue (CESU+, prestataire)" code="7HB" aide="Crédit déjà versé en cours d'année : il reste calculé en entier sur 7DB et l'avance s'ajoute au solde à payer." value={rc.case7hb ?? null} onChange={v => update('case7hb', v)} />
          {(rc.case7hb ?? 0) > 0 && !((rc.case7db ?? 0) > 0) && (
            <p className="py-2 text-[13px] text-muted-foreground">7HB suppose des dépenses déclarées en 7DB : le simulateur officiel refuse le calcul sans elles.</p>
          )}
          <SingleMontantLigne label="Ascendants de plus de 65 ans bénéficiaires de l'APA" extra="nombre" code="7DL" value={rc.case7dl} onChange={v => update('case7dl', v)} />
          <SingleMontantLigne label="Membres du foyer âgés de plus de 65 ans" extra="nombre, hors formulaire" aide="Majore le plafond de 1 500 € chacun ; les enfants et personnes à charge sont repris du Ménage." code="+65" value={rc.membresPlus65Ans} onChange={v => update('membresPlus65Ans', v)} />
          <SingleCaseLigne label="Vous avez employé directement pour la première fois en 2025 un salarié à domicile" code="7DQ" checked={rc.case7dq} onChange={v => update('case7dq', v)} />
          <SingleCaseLigne label="Vous, votre conjoint ou une personne à charge avez la carte d'invalidité ou la CMI invalidité" code="7DG" checked={rc.case7dg} onChange={v => update('case7dg', v)} />
        </SousGroupe>

        <SousGroupe titre="Frais de garde des enfants de moins de 6 ans au 1.1.2025" aide="Crédit restituable de 50 %, dans la limite de 3 500 € par enfant (1 750 € en résidence alternée). Montants nets des aides perçues.">
          <SingleMontantLigne label="1er enfant" code="7GA" value={rc.case7ga ?? null} onChange={v => update('case7ga', v)} />
          <SingleMontantLigne label="2e enfant" code="7GB" value={rc.case7gb ?? null} onChange={v => update('case7gb', v)} />
          <SingleMontantLigne label="3e enfant" code="7GC" value={rc.case7gc ?? null} onChange={v => update('case7gc', v)} />
          <SingleMontantLigne label="1er enfant en résidence alternée" code="7GE" value={rc.case7ge ?? null} onChange={v => update('case7ge', v)} />
          <SingleMontantLigne label="2e enfant en résidence alternée" code="7GF" value={rc.case7gf ?? null} onChange={v => update('case7gf', v)} />
          <SingleMontantLigne label="3e enfant en résidence alternée" code="7GG" value={rc.case7gg ?? null} onChange={v => update('case7gg', v)} />
        </SousGroupe>

        <SousGroupe titre="Enfants scolarisés" aide="Réduction de 61 € au collège, 153 € au lycée, 183 € dans le supérieur, par enfant ; moitié en résidence alternée.">
          <SingleMontantLigne label="Collège" extra="nombre" code="7EA" value={rc.case7ea ?? null} onChange={v => update('case7ea', v)} />
          <SingleMontantLigne label="Collège, résidence alternée" extra="nombre" code="7EB" value={rc.case7eb ?? null} onChange={v => update('case7eb', v)} />
          <SingleMontantLigne label="Lycée" extra="nombre" code="7EC" value={rc.case7ec ?? null} onChange={v => update('case7ec', v)} />
          <SingleMontantLigne label="Lycée, résidence alternée" extra="nombre" code="7ED" value={rc.case7ed ?? null} onChange={v => update('case7ed', v)} />
          <SingleMontantLigne label="Enseignement supérieur" extra="nombre" code="7EF" value={rc.case7ef ?? null} onChange={v => update('case7ef', v)} />
          <SingleMontantLigne label="Supérieur, résidence alternée" extra="nombre" code="7EG" value={rc.case7eg ?? null} onChange={v => update('case7eg', v)} />
        </SousGroupe>

        <SousGroupe titre="Cotisations syndicales" aide="Crédit restituable de 66 %, dans la limite de 1 % des salaires et pensions bruts du déclarant.">
          <SingleMontantLigne label="Déclarant 1" code="7AC" value={rc.case7ac ?? null} onChange={v => update('case7ac', v)} />
          <SingleMontantLigne label="Déclarant 2" code="7AE" value={rc.case7ae ?? null} onChange={v => update('case7ae', v)} />
          <SingleMontantLigne label="Personnes à charge" extra="1 % de leurs salaires" code="7AG" value={rc.case7ag ?? null} onChange={v => update('case7ag', v)} />
        </SousGroupe>

        <SousGroupe titre="Prestations compensatoires" aide="Réduction de 25 % des sommes versées, retenues dans la limite de 30 500 € (au prorata si le total fixé par jugement dépasse ce montant).">
          <SingleMontantLigne label="Sommes versées en 2025" code="7WN" value={rc.case7wn ?? null} onChange={v => update('case7wn', v)} />
          <SingleMontantLigne label="Sommes totales décidées par jugement en 2025 ou capital reconstitué" code="7WO" value={rc.case7wo ?? null} onChange={v => update('case7wo', v)} />
          <SingleMontantLigne label="Capital fixé en substitution de rente" extra="sans effet sur le calcul" code="7WM" value={rc.case7wm ?? null} onChange={v => update('case7wm', v)} />
          <SingleMontantLigne label="Report des sommes décidées en 2024" extra="25 %, maximum 30 500 €" code="7WP" value={rc.case7wp ?? null} onChange={v => update('case7wp', v)} />
        </SousGroupe>


        <SousGroupe titre="Souscriptions au capital de PME, ESUS et SFS" aide="Montants versés. 18 % ou 25 %, plafond commun de 50 000 € (100 000 € pour un couple), plafonnement global de 10 000 € (13 000 € avec 7DC, 7BS, 7EK).">
          <SingleMontantLigne label="Versements PME en 2025" code="7CI" value={rc.case7ci ?? null} onChange={v => update('case7ci', v)} />
          <SingleMontantLigne label="Versements ESUS en 2025" code="7CO" value={rc.case7co ?? null} onChange={v => update('case7co', v)} />
          <SingleMontantLigne label="Versements SFS en 2025" code="7GW" value={rc.case7gw ?? null} onChange={v => update('case7gw', v)} />
          <SingleMontantLigne label="Report de versements PME et ESUS du 1.1 au 8.5.2021" code="7CT" value={rc.case7ct ?? null} onChange={v => update('case7ct', v)} />
          <SingleMontantLigne label="Report de versements PME du 9.5 au 31.12.2021" code="7CA" value={rc.case7ca ?? null} onChange={v => update('case7ca', v)} />
          <SingleMontantLigne label="Report de versements PME et ESUS du 1.1 au 17.3.2022" code="7CU" value={rc.case7cu ?? null} onChange={v => update('case7cu', v)} />
          <SingleMontantLigne label="Report de versements PME et ESUS du 18.3 au 31.12.2022" code="7CW" value={rc.case7cw ?? null} onChange={v => update('case7cw', v)} />
          <SingleMontantLigne label="Report de versements PME et ESUS du 1.1 au 11.3.2023" code="7CP" value={rc.case7cp ?? null} onChange={v => update('case7cp', v)} />
          <SingleMontantLigne label="Report de versements PME et ESUS du 12.3 au 31.12.2023" code="7CQ" value={rc.case7cq ?? null} onChange={v => update('case7cq', v)} />
          <SingleMontantLigne label="Report de versements PME en 2024" code="7CV" value={rc.case7cv ?? null} onChange={v => update('case7cv', v)} />
          <SingleMontantLigne label="Report de versements ESUS du 1.1 au 27.6.2024" code="7DO" value={rc.case7do ?? null} onChange={v => update('case7do', v)} />
          <SingleMontantLigne label="Report de versements ESUS du 28.6 au 31.12.2024" code="7DP" value={rc.case7dp ?? null} onChange={v => update('case7dp', v)} />
          <SingleMontantLigne label="Report des versements ESUS du 9.5 au 31.12.2021" code="7DC" value={rc.case7dc ?? null} onChange={v => update('case7dc', v)} />
          <SingleMontantLigne label="Report de versements SFS en 2021" code="7BS" value={rc.case7bs ?? null} onChange={v => update('case7bs', v)} />
          <SingleMontantLigne label="Report de versements SFS en 2022" code="7BT" value={rc.case7bt ?? null} onChange={v => update('case7bt', v)} />
          <SingleMontantLigne label="Report de versements SFS en 2023" code="7BU" value={rc.case7bu ?? null} onChange={v => update('case7bu', v)} />
          <SingleMontantLigne label="Report de versements SFS en 2024" code="7BW" value={rc.case7bw ?? null} onChange={v => update('case7bw', v)} />
        </SousGroupe>

        <SousGroupe titre="Jeunes entreprises innovantes" aide="Montants versés, hors plafonnement global. JEI/JEU/JEIC : 30 %, 75 000 € (150 000 € pour un couple) ; JEIR : 50 %, 50 000 € (100 000 €).">
          <SingleMontantLigne label="Versements JEI, JEU, JEIC" code="7CR" value={rc.case7cr ?? null} onChange={v => update('case7cr', v)} />
          <SingleMontantLigne label="Versements JEI de rupture (JEIR)" code="7DZ" value={rc.case7dz ?? null} onChange={v => update('case7dz', v)} />
        </SousGroupe>

        <SousGroupe titre="FCPI et FIP" aide="Montants versés, 12 000 € (24 000 € pour un couple) par catégorie.">
          <SingleMontantLigne label="FCPI, versements du 1.1 au 27.9.2025 (18 %)" code="7GQ" value={rc.case7gq ?? null} onChange={v => update('case7gq', v)} />
          <SingleMontantLigne label="FCPI, versements du 28.9 au 31.12.2025 (25 %)" code="7GR" value={rc.case7gr ?? null} onChange={v => update('case7gr', v)} />
          <SingleMontantLigne label="FIP en Corse (30 %)" code="7FM" value={rc.case7fm ?? null} onChange={v => update('case7fm', v)} />
          <SingleMontantLigne label="FIP investis en outre-mer (30 %)" code="7FL" value={rc.case7fl ?? null} onChange={v => update('case7fl', v)} />
        </SousGroupe>

        <SousGroupe titre="SOFICA" aide="Montants versés, dans la limite de 25 % du revenu net imposable et de 18 000 €. Plafonnement global porté à 18 000 €.">
          <SingleMontantLigne label="Taux de 48 %" code="7EN" value={rc.case7en ?? null} onChange={v => update('case7en', v)} />
          <SingleMontantLigne label="Taux de 36 %" code="7GN" value={rc.case7gn ?? null} onChange={v => update('case7gn', v)} />
          <SingleMontantLigne label="Taux de 30 %" code="7FN" value={rc.case7fn ?? null} onChange={v => update('case7fn', v)} />
        </SousGroupe>

        <SousGroupe titre="Presse, objets classés, forêts, reprise de société" aide="Montants versés. Presse : 50 % puis 30 %, 10 000 € (20 000 € pour un couple) ; objets MH : 18 %, 20 000 € ; DFCI : 50 %, 1 000 € ; reprise de société : 25 %, 20 000 € (40 000 €), hors plafonnement global comme la DFCI.">
          <SingleMontantLigne label="Entreprises de presse, versements du 15.2 au 31.12.2025 (50 %)" code="7MY" value={rc.case7my ?? null} onChange={v => update('case7my', v)} />
          <SingleMontantLigne label="Entreprises de presse, versements du 15.2 au 31.12.2025 (30 %)" code="7MX" value={rc.case7mx ?? null} onChange={v => update('case7mx', v)} />
          <SingleMontantLigne label="Travaux de conservation ou de restauration d'objets classés monuments historiques" code="7NZ" value={rc.case7nz ?? null} onChange={v => update('case7nz', v)} />
          <SingleMontantLigne label="Cotisations pour la défense des forêts contre l'incendie" code="7UC" value={rc.case7uc ?? null} onChange={v => update('case7uc', v)} />
          <SingleMontantLigne label="Intérêts d'emprunt pour reprise de société" code="7FH" value={rc.case7fh ?? null} onChange={v => update('case7fh', v)} />
          <SingleMontantLigne label="Mécénat d'entreprise : montant de la réduction (2069-RS)" code="7US" aide="Réduction imputée telle quelle, hors plafonnement global, non restituable. Retenue seulement avec un revenu BA, BIC ou BNC au régime réel." value={rc.case7us ?? null} onChange={v => update('case7us', v)} />
        </SousGroupe>

        <SousGroupe titre="Reports de réductions d'impôt" aide="Montant de la réduction reportée.">
          <SingleMontantLigne label="Report de réduction ESUS (versements du 9.5 au 31.12.2021) et SFS 2021" code="7EK" value={rc.case7ek ?? null} onChange={v => update('case7ek', v)} />
          <SingleMontantLigne label="Report de réduction 2020 au titre du plafonnement global" code="7CY" value={rc.case7cy ?? null} onChange={v => update('case7cy', v)} />
          <SingleMontantLigne label="Report de réduction 2021 au titre du plafonnement global" code="7DY" value={rc.case7dy ?? null} onChange={v => update('case7dy', v)} />
          <SingleMontantLigne label="Report de réduction 2022 au titre du plafonnement global" code="7EY" value={rc.case7ey ?? null} onChange={v => update('case7ey', v)} />
          <SingleMontantLigne label="Report de réduction 2023 au titre du plafonnement global" code="7FY" value={rc.case7fy ?? null} onChange={v => update('case7fy', v)} />
          <SingleMontantLigne label="Report de réduction 2024 au titre du plafonnement global" code="7GY" value={rc.case7gy ?? null} onChange={v => update('case7gy', v)} />
        </SousGroupe>

        <SousGroupe titre="Investissements forestiers" aide="Dépenses. Crédits restituables : acquisition 25 % et assurance 76 %, plafonds propres ; travaux 18 % ou 25 %, plafond commun ; 6 250 € (12 500 € pour un couple) chacun. Compris dans le plafonnement global de 10 000 €.">
          <SingleMontantLigne label="Acquisition, dépenses 2025 (25 %)" code="7UN" value={rc.case7un ?? null} onChange={v => update('case7un', v)} />
          <SingleMontantLigne label="Assurance, dépenses 2025 (76 %)" code="7UL" value={rc.case7ul ?? null} onChange={v => update('case7ul', v)} />
          <SingleMontantLigne label="Travaux, dépenses 2025" code="7UP" value={rc.case7up ?? null} onChange={v => update('case7up', v)} />
          <SingleMontantLigne label="Travaux consécutifs à un sinistre, dépenses 2025" code="7UT" value={rc.case7ut ?? null} onChange={v => update('case7ut', v)} />
          <SingleMontantLigne label="Report travaux 2017 après sinistre" code="7TR" value={rc.case7tr ?? null} onChange={v => update('case7tr', v)} />
          <SingleMontantLigne label="Report travaux 2017 après sinistre avec organisation de producteurs" code="7TS" value={rc.case7ts ?? null} onChange={v => update('case7ts', v)} />
          <SingleMontantLigne label="Report travaux 2018 après sinistre" code="7TT" value={rc.case7tt ?? null} onChange={v => update('case7tt', v)} />
          <SingleMontantLigne label="Report travaux 2018 après sinistre avec organisation de producteurs" code="7TU" value={rc.case7tu ?? null} onChange={v => update('case7tu', v)} />
          <SingleMontantLigne label="Report travaux 2019 après sinistre" code="7TV" value={rc.case7tv ?? null} onChange={v => update('case7tv', v)} />
          <SingleMontantLigne label="Report travaux 2019 après sinistre avec organisation de producteurs" code="7TW" value={rc.case7tw ?? null} onChange={v => update('case7tw', v)} />
          <SingleMontantLigne label="Report travaux 2020 après sinistre" code="7TA" value={rc.case7ta ?? null} onChange={v => update('case7ta', v)} />
          <SingleMontantLigne label="Report travaux 2020 après sinistre avec organisation de producteurs" code="7TB" value={rc.case7tb ?? null} onChange={v => update('case7tb', v)} />
          <SingleMontantLigne label="Report travaux 2021 hors sinistre" code="7VQ" value={rc.case7vq ?? null} onChange={v => update('case7vq', v)} />
          <SingleMontantLigne label="Report travaux 2021 après sinistre" code="7TE" value={rc.case7te ?? null} onChange={v => update('case7te', v)} />
          <SingleMontantLigne label="Report travaux 2021 hors sinistre avec organisation de producteurs" code="7VR" value={rc.case7vr ?? null} onChange={v => update('case7vr', v)} />
          <SingleMontantLigne label="Report travaux 2021 après sinistre avec organisation de producteurs" code="7TF" value={rc.case7tf ?? null} onChange={v => update('case7tf', v)} />
          <SingleMontantLigne label="Report travaux 2022 hors sinistre" code="7VS" value={rc.case7vs ?? null} onChange={v => update('case7vs', v)} />
          <SingleMontantLigne label="Report travaux 2022 après sinistre" code="7TH" value={rc.case7th ?? null} onChange={v => update('case7th', v)} />
          <SingleMontantLigne label="Report travaux 2022 hors sinistre avec organisation de producteurs" code="7VU" value={rc.case7vu ?? null} onChange={v => update('case7vu', v)} />
          <SingleMontantLigne label="Report travaux 2022 après sinistre avec organisation de producteurs" code="7TI" value={rc.case7ti ?? null} onChange={v => update('case7ti', v)} />
          <SingleMontantLigne label="Report travaux 2023 hors sinistre" code="7VV" value={rc.case7vv ?? null} onChange={v => update('case7vv', v)} />
          <SingleMontantLigne label="Report travaux 2023 après sinistre" code="7TJ" value={rc.case7tj ?? null} onChange={v => update('case7tj', v)} />
          <SingleMontantLigne label="Report travaux 2024 hors sinistre" code="7VT" value={rc.case7vt ?? null} onChange={v => update('case7vt', v)} />
          <SingleMontantLigne label="Report travaux 2024 après sinistre" code="7TK" value={rc.case7tk ?? null} onChange={v => update('case7tk', v)} />
        </SousGroupe>

        {GROUPES_PINEL.map(g => (
          <SousGroupe key={g.titre} titre={g.titre} aide={g.aide}>
            {casesPinel(g.natures).map(([cle, r]) => (
              <SingleMontantLigne key={cle} label={r.libelle} code={cle.slice(4).toUpperCase()}
                value={(rc[cle] as number | null | undefined) ?? null} onChange={v => update(cle, v)} />
            ))}
          </SousGroupe>
        ))}

        {GROUPES_SCELLIER.map(g => (
          <SousGroupe key={g.titre} titre={g.titre} aide={g.aide}>
            {casesScellier(g.nature).map(([cle, r]) => (
              <SingleMontantLigne key={cle} label={r.libelle} code={cle.slice(4).toUpperCase()}
                value={(rc[cle] as number | null | undefined) ?? null} onChange={v => update(cle, v)} />
            ))}
          </SousGroupe>
        ))}

        <SousGroupe titre="Censi-Bouvard (location meublée non professionnelle)" aide="Investissements : prix de revient (11 % sur 9 ans, 300 000 € par case). Reports et soldes : montant de la réduction.">
          {(Object.entries(REGLES_CENSI_BOUVARD) as [keyof ReductionsCreditsImpotInput, { libelle: string }][]).map(([cle, r]) => (
            <SingleMontantLigne key={cle} label={r.libelle} code={cle.slice(4).toUpperCase()}
              value={(rc[cle] as number | null | undefined) ?? null} onChange={v => update(cle, v)} />
          ))}
        </SousGroupe>

        <SousGroupe titre="Autonomie, dépendance, rente survie, risques technologiques" aide="7WI : crédit de 25 % (5 000 €, 10 000 € pour un couple, moins les dépenses retenues 2021-2024), si le RFR 2023 ou 2024 ne dépasse pas le seuil du foyer.">
          <SingleMontantLigne label="Équipements pour la perte d'autonomie ou le handicap, dépenses 2025" extra="crédit 25 %" code="7WI" value={rc.case7wi ?? null} onChange={v => update('case7wi', v)} />
          <SingleMontantLigne label="Dépenses antérieures retenues en 2021" code="7ZZ" value={rc.case7zz ?? null} onChange={v => update('case7zz', v)} />
          <SingleMontantLigne label="Dépenses antérieures retenues en 2022" code="7ZY" value={rc.case7zy ?? null} onChange={v => update('case7zy', v)} />
          <SingleMontantLigne label="Dépenses antérieures retenues en 2023" code="7ZX" value={rc.case7zx ?? null} onChange={v => update('case7zx', v)} />
          <SingleMontantLigne label="Dépenses antérieures retenues en 2024" code="7ZW" value={rc.case7zw ?? null} onChange={v => update('case7zw', v)} />
          <SingleMontantLigne label="Revenu fiscal de référence 2023" extra="condition de 7WI" code="8YS" value={rc.case8ys ?? null} onChange={v => update('case8ys', v)} />
          <SingleMontantLigne label="Revenu fiscal de référence 2024" extra="condition de 7WI" code="8YU" value={rc.case8yu ?? null} onChange={v => update('case8yu', v)} />
          <SingleMontantLigne label="Travaux prescrits par un plan de prévention des risques technologiques, dépenses 2025" extra="crédit 40 %, maximum 20 000 €" code="7WL" value={rc.case7wl ?? null} onChange={v => update('case7wl', v)} />
          <SingleMontantLigne label="Primes de rente survie, contrats d'épargne handicap" extra="25 %, 1 525 € + 300 € par enfant" code="7GZ" value={rc.case7gz ?? null} onChange={v => update('case7gz', v)} />
          <SingleMontantLigne label="Accueil en établissement pour personnes dépendantes, 1re personne" extra="25 %, maximum 10 000 €" code="7CD" value={rc.case7cd ?? null} onChange={v => update('case7cd', v)} />
          <SingleMontantLigne label="Accueil en établissement pour personnes dépendantes, 2e personne" extra="25 %, maximum 10 000 €" code="7CE" value={rc.case7ce ?? null} onChange={v => update('case7ce', v)} />
        </SousGroupe>

        <SousGroupe titre="Logement : bornes, Loc'Avantages, risques technologiques, Malraux" aide="Bornes : crédit de 75 %, 500 € par système. Loc'Avantages : montant servant de base au taux. 7WR : crédit de 40 %. Malraux : dépenses, 400 000 € en commun ; reports en montant de réduction.">
          <SingleMontantLigne label="Borne de recharge, habitation principale, 1er système" code="7ZQ" value={rc.case7zq ?? null} onChange={v => update('case7zq', v)} />
          <SingleMontantLigne label="Borne de recharge, habitation principale, 2nd système" code="7ZR" value={rc.case7zr ?? null} onChange={v => update('case7zr', v)} />
          <SingleMontantLigne label="Borne de recharge, habitation secondaire, 1er système" code="7ZS" value={rc.case7zs ?? null} onChange={v => update('case7zs', v)} />
          <SingleMontantLigne label="Borne de recharge, habitation secondaire, 2nd système" code="7ZT" value={rc.case7zt ?? null} onChange={v => update('case7zt', v)} />
          <SingleMontantLigne label="Loc'Avantages, location intermédiaire (15 %)" code="7BK" value={rc.case7bk ?? null} onChange={v => update('case7bk', v)} />
          <SingleMontantLigne label="Loc'Avantages, location intermédiaire avec intermédiation (20 %)" code="7BL" value={rc.case7bl ?? null} onChange={v => update('case7bl', v)} />
          <SingleMontantLigne label="Loc'Avantages, location sociale (35 %)" code="7BM" value={rc.case7bm ?? null} onChange={v => update('case7bm', v)} />
          <SingleMontantLigne label="Loc'Avantages, location sociale avec intermédiation (40 %)" code="7BN" value={rc.case7bn ?? null} onChange={v => update('case7bn', v)} />
          <SingleMontantLigne label="Loc'Avantages, location très sociale (65 %)" code="7BO" value={rc.case7bo ?? null} onChange={v => update('case7bo', v)} />
          <SingleMontantLigne label="Travaux de prévention des risques technologiques (2041 GR)" code="7WR" value={rc.case7wr ?? null} onChange={v => update('case7wr', v)} />
          <SingleMontantLigne label="Malraux, site patrimonial avec PSMV, quartier ancien dégradé ou NPNRU (30 %)" code="7TX" value={rc.case7tx ?? null} onChange={v => update('case7tx', v)} />
          <SingleMontantLigne label="Malraux, site patrimonial sans PSMV (22 %)" code="7TY" value={rc.case7ty ?? null} onChange={v => update('case7ty', v)} />
          <SingleMontantLigne label="Malraux, report du solde de 2020" code="7KW" value={rc.case7kw ?? null} onChange={v => update('case7kw', v)} />
          <SingleMontantLigne label="Malraux, report du solde de 2022" code="7KY" value={rc.case7ky ?? null} onChange={v => update('case7ky', v)} />
          <SingleMontantLigne label="Malraux, report du solde de 2023" code="7KX" value={rc.case7kx ?? null} onChange={v => update('case7kx', v)} />
        </SousGroupe>

        <SousGroupe titre="Investissements outre-mer dans une entreprise (2020-2025)" aide="Montant de la réduction (crédit pour HJA). Plafonds propres et plafonnement global appliqués par l'outil.">
          <SingleMontantLigne label="Réalisés en 2025, location à une entreprise exploitante, rétrocession 56 %" code="HLS" value={rc.caseHls ?? null} onChange={v => update('caseHls', v)} />
          <SingleMontantLigne label="Réalisés en 2025, rétrocession 66 %" code="HLT" value={rc.caseHlt ?? null} onChange={v => update('caseHlt', v)} />
          <SingleMontantLigne label="Réalisés en 2025, dans votre entreprise" code="HLU" value={rc.caseHlu ?? null} onChange={v => update('caseHlu', v)} />
          <SingleMontantLigne label="Réalisés en 2025, exploitation directe" code="HLW" value={rc.caseHlw ?? null} onChange={v => update('caseHlw', v)} />
          <SingleMontantLigne label="Réalisés en 2020, location à une entreprise exploitante, rétrocession 56 %" code="HGS" value={rc.caseHgs ?? null} onChange={v => update('caseHgs', v)} />
          <SingleMontantLigne label="Réalisés en 2020, rétrocession 66 %" code="HGT" value={rc.caseHgt ?? null} onChange={v => update('caseHgt', v)} />
          <SingleMontantLigne label="Réalisés en 2020, dans votre entreprise" code="HGU" value={rc.caseHgu ?? null} onChange={v => update('caseHgu', v)} />
          <SingleMontantLigne label="Réalisés en 2020, exploitation directe" code="HGW" value={rc.caseHgw ?? null} onChange={v => update('caseHgw', v)} />
          <SingleMontantLigne label="Réalisés en 2021, location à une entreprise exploitante, rétrocession 56 %" code="HHS" value={rc.caseHhs ?? null} onChange={v => update('caseHhs', v)} />
          <SingleMontantLigne label="Réalisés en 2021, rétrocession 66 %" code="HHT" value={rc.caseHht ?? null} onChange={v => update('caseHht', v)} />
          <SingleMontantLigne label="Réalisés en 2021, dans votre entreprise" code="HHU" value={rc.caseHhu ?? null} onChange={v => update('caseHhu', v)} />
          <SingleMontantLigne label="Réalisés en 2021, exploitation directe" code="HHW" value={rc.caseHhw ?? null} onChange={v => update('caseHhw', v)} />
          <SingleMontantLigne label="Réalisés en 2022, location à une entreprise exploitante, rétrocession 56 %" code="HIS" value={rc.caseHis ?? null} onChange={v => update('caseHis', v)} />
          <SingleMontantLigne label="Réalisés en 2022, rétrocession 66 %" code="HIT" value={rc.caseHit ?? null} onChange={v => update('caseHit', v)} />
          <SingleMontantLigne label="Réalisés en 2022, dans votre entreprise" code="HIU" value={rc.caseHiu ?? null} onChange={v => update('caseHiu', v)} />
          <SingleMontantLigne label="Réalisés en 2022, exploitation directe" code="HIW" value={rc.caseHiw ?? null} onChange={v => update('caseHiw', v)} />
          <SingleMontantLigne label="Réalisés en 2023, location à une entreprise exploitante, rétrocession 56 %" code="HJS" value={rc.caseHjs ?? null} onChange={v => update('caseHjs', v)} />
          <SingleMontantLigne label="Réalisés en 2023, rétrocession 66 %" code="HJT" value={rc.caseHjt ?? null} onChange={v => update('caseHjt', v)} />
          <SingleMontantLigne label="Réalisés en 2023, dans votre entreprise" code="HJU" value={rc.caseHju ?? null} onChange={v => update('caseHju', v)} />
          <SingleMontantLigne label="Réalisés en 2023, exploitation directe" code="HJW" value={rc.caseHjw ?? null} onChange={v => update('caseHjw', v)} />
          <SingleMontantLigne label="Réalisés en 2024, location à une entreprise exploitante, rétrocession 56 %" code="HKS" value={rc.caseHks ?? null} onChange={v => update('caseHks', v)} />
          <SingleMontantLigne label="Réalisés en 2024, rétrocession 66 %" code="HKT" value={rc.caseHkt ?? null} onChange={v => update('caseHkt', v)} />
          <SingleMontantLigne label="Réalisés en 2024, dans votre entreprise" code="HKU" value={rc.caseHku ?? null} onChange={v => update('caseHku', v)} />
          <SingleMontantLigne label="Réalisés en 2024, exploitation directe" code="HKW" value={rc.caseHkw ?? null} onChange={v => update('caseHkw', v)} />
          <SingleMontantLigne label="Crédit d'impôt, investissement dans une entreprise des DOM, 2025" code="HJA" value={rc.caseHja ?? null} onChange={v => update('caseHja', v)} />
        </SousGroupe>

        <SousGroupe titre="Logement social outre-mer" aide="Montant de la réduction. Plafonds propres et plafonnement global appliqués par l'outil.">
          <SingleMontantLigne label="Logement social, investissements 2025" code="HYJ" value={rc.caseHyj ?? null} onChange={v => update('caseHyj', v)} />
          <SingleMontantLigne label="Report logement social, investissements 2020" code="HYE" value={rc.caseHye ?? null} onChange={v => update('caseHye', v)} />
          <SingleMontantLigne label="Report logement social, investissements 2021" code="HYF" value={rc.caseHyf ?? null} onChange={v => update('caseHyf', v)} />
          <SingleMontantLigne label="Report logement social, investissements 2022" code="HYG" value={rc.caseHyg ?? null} onChange={v => update('caseHyg', v)} />
          <SingleMontantLigne label="Report logement social, investissements 2023" code="HYH" value={rc.caseHyh ?? null} onChange={v => update('caseHyh', v)} />
          <SingleMontantLigne label="Report logement social, investissements 2024" code="HYI" value={rc.caseHyi ?? null} onChange={v => update('caseHyi', v)} />
        </SousGroupe>

        <SousGroupe titre="Investissements immobiliers outre-mer" aide="Montant de la réduction. Plafonds propres et plafonnement global appliqués par l'outil.">
          <SingleMontantLigne label="Immobilier engagé avant 2011, agrément avant 2009" code="HOA" value={rc.caseHoa ?? null} onChange={v => update('caseHoa', v)} />
          <SingleMontantLigne label="Immobilier engagé avant 2011, agrément 2009" code="HOB" value={rc.caseHob ?? null} onChange={v => update('caseHob', v)} />
          <SingleMontantLigne label="Immobilier engagé avant 2011, agrément 2010" code="HOC" value={rc.caseHoc ?? null} onChange={v => update('caseHoc', v)} />
          <SingleMontantLigne label="Immobilier engagé en 2011, agrément avant 2009" code="HOH" value={rc.caseHoh ?? null} onChange={v => update('caseHoh', v)} />
          <SingleMontantLigne label="Immobilier engagé en 2011, agrément 2009" code="HOI" value={rc.caseHoi ?? null} onChange={v => update('caseHoi', v)} />
          <SingleMontantLigne label="Immobilier engagé en 2011, agrément 2010" code="HOJ" value={rc.caseHoj ?? null} onChange={v => update('caseHoj', v)} />
          <SingleMontantLigne label="Immobilier engagé en 2011, autres investissements" code="HOK" value={rc.caseHok ?? null} onChange={v => update('caseHok', v)} />
          <SingleMontantLigne label="Immobilier engagé avant 2011, agrément avant 2009 (2e ligne)" code="HOL" value={rc.caseHol ?? null} onChange={v => update('caseHol', v)} />
          <SingleMontantLigne label="Immobilier engagé avant 2011, agrément 2009 (2e ligne)" code="HOM" value={rc.caseHom ?? null} onChange={v => update('caseHom', v)} />
          <SingleMontantLigne label="Immobilier engagé avant 2011, agrément 2010 (2e ligne)" code="HON" value={rc.caseHon ?? null} onChange={v => update('caseHon', v)} />
          <SingleMontantLigne label="Immobilier engagé en 2011, agrément avant 2009 (2e ligne)" code="HOO" value={rc.caseHoo ?? null} onChange={v => update('caseHoo', v)} />
          <SingleMontantLigne label="Immobilier engagé en 2011, agrément 2009 (2e ligne)" code="HOP" value={rc.caseHop ?? null} onChange={v => update('caseHop', v)} />
          <SingleMontantLigne label="Immobilier engagé en 2011, agrément 2010 (2e ligne)" code="HOQ" value={rc.caseHoq ?? null} onChange={v => update('caseHoq', v)} />
          <SingleMontantLigne label="Immobilier engagé en 2011, agrément 2011" code="HOR" value={rc.caseHor ?? null} onChange={v => update('caseHor', v)} />
          <SingleMontantLigne label="Immobilier engagé en 2012, agrément avant 2009" code="HOS" value={rc.caseHos ?? null} onChange={v => update('caseHos', v)} />
          <SingleMontantLigne label="Immobilier engagé en 2012, agrément 2009" code="HOT" value={rc.caseHot ?? null} onChange={v => update('caseHot', v)} />
          <SingleMontantLigne label="Immobilier engagé en 2012, agrément 2010 (2e ligne)" code="HOU" value={rc.caseHou ?? null} onChange={v => update('caseHou', v)} />
          <SingleMontantLigne label="Immobilier engagé en 2012, agrément 2011 (2e ligne)" code="HOV" value={rc.caseHov ?? null} onChange={v => update('caseHov', v)} />
          <SingleMontantLigne label="Immobilier engagé en 2012, autres investissements" code="HOW" value={rc.caseHow ?? null} onChange={v => update('caseHow', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2013, engagé avant 2011" code="HOD" value={rc.caseHod ?? null} onChange={v => update('caseHod', v)} />
          <SingleMontantLigne label="Immobilier engagé en 2012, agrément 2010" code="HOE" value={rc.caseHoe ?? null} onChange={v => update('caseHoe', v)} />
          <SingleMontantLigne label="Immobilier engagé en 2012, agrément 2011" code="HOF" value={rc.caseHof ?? null} onChange={v => update('caseHof', v)} />
          <SingleMontantLigne label="Immobilier engagé en 2012 ou 2013, agrément 2010" code="HOG" value={rc.caseHog ?? null} onChange={v => update('caseHog', v)} />
          <SingleMontantLigne label="Immobilier engagé en 2012 ou 2013, agrément 2011" code="HOX" value={rc.caseHox ?? null} onChange={v => update('caseHox', v)} />
          <SingleMontantLigne label="Immobilier engagé en 2012 ou 2013, agrément 2012" code="HOY" value={rc.caseHoy ?? null} onChange={v => update('caseHoy', v)} />
          <SingleMontantLigne label="Immobilier engagé en 2012 ou 2013, autres investissements" code="HOZ" value={rc.caseHoz ?? null} onChange={v => update('caseHoz', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2014, engagés avant 2011" code="HUA" value={rc.caseHua ?? null} onChange={v => update('caseHua', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2014, engagés en 2011, agrément 2010" code="HUB" value={rc.caseHub ?? null} onChange={v => update('caseHub', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2014, engagés en 2011, agrément 2011" code="HUC" value={rc.caseHuc ?? null} onChange={v => update('caseHuc', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2014, engagés depuis 2012, agrément 2010" code="HUD" value={rc.caseHud ?? null} onChange={v => update('caseHud', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2014, engagés depuis 2012, agrément 2011" code="HUE" value={rc.caseHue ?? null} onChange={v => update('caseHue', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2014, engagés depuis 2012, agrément 2012" code="HUF" value={rc.caseHuf ?? null} onChange={v => update('caseHuf', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2014, engagés depuis 2012, autres investissements" code="HUG" value={rc.caseHug ?? null} onChange={v => update('caseHug', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2015, engagés avant 2011" code="HUH" value={rc.caseHuh ?? null} onChange={v => update('caseHuh', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2015, engagés en 2011, agrément 2010" code="HUI" value={rc.caseHui ?? null} onChange={v => update('caseHui', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2015, engagés en 2011, agrément 2011" code="HUJ" value={rc.caseHuj ?? null} onChange={v => update('caseHuj', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2015, engagés depuis 2012, agrément 2010" code="HUK" value={rc.caseHuk ?? null} onChange={v => update('caseHuk', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2015, engagés depuis 2012, agrément 2011" code="HUL" value={rc.caseHul ?? null} onChange={v => update('caseHul', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2015, engagés depuis 2012, agrément 2012" code="HUM" value={rc.caseHum ?? null} onChange={v => update('caseHum', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2015, engagés depuis 2012, autres investissements" code="HUN" value={rc.caseHun ?? null} onChange={v => update('caseHun', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2016, engagés avant 2011" code="HUO" value={rc.caseHuo ?? null} onChange={v => update('caseHuo', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2016, engagés en 2011, agrément 2010" code="HUP" value={rc.caseHup ?? null} onChange={v => update('caseHup', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2016, engagés en 2011, agrément 2011" code="HUQ" value={rc.caseHuq ?? null} onChange={v => update('caseHuq', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2016, engagés depuis 2012, agrément 2010" code="HUR" value={rc.caseHur ?? null} onChange={v => update('caseHur', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2016, engagés depuis 2012, agrément 2011" code="HUS" value={rc.caseHus ?? null} onChange={v => update('caseHus', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2016, engagés depuis 2012, agrément 2012" code="HUT" value={rc.caseHut ?? null} onChange={v => update('caseHut', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2016, engagés depuis 2012, autres investissements" code="HUU" value={rc.caseHuu ?? null} onChange={v => update('caseHuu', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2017, engagés avant 2011" code="HVA" value={rc.caseHva ?? null} onChange={v => update('caseHva', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2017, engagés en 2011, agrément 2010" code="HVB" value={rc.caseHvb ?? null} onChange={v => update('caseHvb', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2017, engagés en 2011, agrément 2011" code="HVC" value={rc.caseHvc ?? null} onChange={v => update('caseHvc', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2017, engagés depuis 2012, agrément 2010" code="HVD" value={rc.caseHvd ?? null} onChange={v => update('caseHvd', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2017, engagés depuis 2012, agrément 2011" code="HVE" value={rc.caseHve ?? null} onChange={v => update('caseHve', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2017, engagés depuis 2012, agrément 2012" code="HVF" value={rc.caseHvf ?? null} onChange={v => update('caseHvf', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2017, engagés depuis 2012, autres investissements" code="HVG" value={rc.caseHvg ?? null} onChange={v => update('caseHvg', v)} />
        </SousGroupe>

        <SousGroupe titre="Travaux de réhabilitation outre-mer" aide="Montant de la réduction. Plafonds propres et plafonnement global appliqués par l'outil.">
          <SingleMontantLigne label="Travaux de réhabilitation et confortation, 2021" code="HVK" value={rc.caseHvk ?? null} onChange={v => update('caseHvk', v)} />
          <SingleMontantLigne label="Travaux de réhabilitation et confortation, 2022" code="HVL" value={rc.caseHvl ?? null} onChange={v => update('caseHvl', v)} />
          <SingleMontantLigne label="Travaux de réhabilitation et confortation, 2023" code="HVM" value={rc.caseHvm ?? null} onChange={v => update('caseHvm', v)} />
          <SingleMontantLigne label="Travaux de réhabilitation et confortation, 2024" code="HVN" value={rc.caseHvn ?? null} onChange={v => update('caseHvn', v)} />
          <SingleMontantLigne label="Travaux de réhabilitation et confortation, 2025" code="HVO" value={rc.caseHvo ?? null} onChange={v => update('caseHvo', v)} />
        </SousGroupe>

        <SousGroupe titre="Autres cases outre-mer" aide="Montant de la réduction. Plafonds propres et plafonnement global appliqués par l'outil.">
          <SingleMontantLigne label="Case liée, sans effet sur le calcul" code="HQA" value={rc.caseHqa ?? null} onChange={v => update('caseHqa', v)} />
          <SingleMontantLigne label="Case liée, sans effet sur le calcul" code="HKC" value={rc.caseHkc ?? null} onChange={v => update('caseHkc', v)} />
          <SingleMontantLigne label="Case liée, sans effet sur le calcul" code="HLV" value={rc.caseHlv ?? null} onChange={v => update('caseHlv', v)} />
        </SousGroupe>
    </Cadre2042>
  );
};

export default ReductionsCreditsImpotForm;
