import { AddButton } from '@/components/layout/workspace-panel';
import { PanelCard, PanelCardDescription, PanelCardHeader, PanelCardTitle, panelInsetClass } from '@/components/layout/panel-section';
import { AideTooltip } from '@/components/fiscalite/DeclarationLigne';
import { cn } from '@/lib/utils';
import type { Declaration2044Result, Immeuble2044Result } from '@/lib/fiscalite/calculerDeclaration2044';
import { SEUIL_MICRO_FONCIER } from '@/lib/immobilier/foncierFoyer';
import { FORFAIT_FRAIS_GESTION_PAR_LOCAL, renovationEnergetiqueApplicable, TAUX_DEDUCTION_SPECIFIQUE_2044 } from '@/lib/fiscalite/calculerDeclaration2044';
import { COLONNES_IMMEUBLE_2044, COLONNES_PART_2044, type Declaration2044ImmeubleRecord, type Declaration2044PartRecord } from '@/services/declaration2044Service';
import type { useDeclaration2044 } from '@/hooks/useDeclaration2044';
import { formatEuros, Grille2044, LigneCalculee, LigneGroupe, LigneSaisie, MontantCellule } from './Grille2044';

type Etat2044 = ReturnType<typeof useDeclaration2044>;

type ColonneImmeuble = keyof Pick<Declaration2044ImmeubleRecord,
  | 'loyers_bruts' | 'depenses_charge_locataires' | 'recettes_diverses' | 'valeur_locative_reservee'
  | 'frais_administration_gestion' | 'nombre_locaux' | 'primes_assurance' | 'travaux'
  | 'travaux_renovation_energetique' | 'charges_non_recuperees' | 'indemnites_eviction' | 'taxes_foncieres'
  | 'taux_deduction_specifique' | 'provisions_charges' | 'regularisation_provisions' | 'interets_emprunt'
  | 'reintegration_supplement_deduction'>;

interface LigneImmeuble {
  code: string;
  libelle: string;
  colonne: ColonneImmeuble;
  resultat: keyof Immeuble2044Result;
  aide?: string;
  /** Saisie autre qu'un montant en euros. */
  unite?: 'locaux' | '%';
}

const RECETTES: LigneImmeuble[] = [
  { code: '211', libelle: 'Loyers (ou fermages) bruts encaissés', colonne: 'loyers_bruts', resultat: 'ligne211' },
  { code: '212', libelle: 'Dépenses mises par convention à la charge des locataires', colonne: 'depenses_charge_locataires', resultat: 'ligne212' },
  { code: '213', libelle: 'Recettes brutes diverses', colonne: 'recettes_diverses', resultat: 'ligne213', aide: 'Y compris subventions ANAH et indemnités d’assurance.' },
  { code: '214', libelle: 'Valeur locative des propriétés dont vous vous réservez la jouissance', colonne: 'valeur_locative_reservee', resultat: 'ligne214' },
];

const FRAIS: LigneImmeuble[] = [
  { code: '221', libelle: 'Frais d’administration et de gestion', colonne: 'frais_administration_gestion', resultat: 'ligne221', aide: 'Rémunération des gardiens, concierges, agences, honoraires, frais de procédure.' },
  { code: '222', libelle: `Autres frais de gestion (${FORFAIT_FRAIS_GESTION_PAR_LOCAL} € par local)`, colonne: 'nombre_locaux', resultat: 'ligne222', unite: 'locaux', aide: 'Forfait de 20 € par local, toujours déductible : 1 local par défaut, saisissez le nombre de locaux de l’immeuble s’il y en a plusieurs.' },
  { code: '223', libelle: 'Primes d’assurance', colonne: 'primes_assurance', resultat: 'ligne223' },
  { code: '224', libelle: 'Dépenses de réparation, d’entretien et d’amélioration', colonne: 'travaux', resultat: 'ligne224' },
  { code: '224bis', libelle: 'Travaux de rénovation énergétique (sortie des classes E, F, G)', colonne: 'travaux_renovation_energetique', resultat: 'ligne224bis', aide: 'Travaux faisant passer le bien d’une classe E, F ou G à A, B, C ou D. Dépenses payées de 2023 à 2025, par des professionnels : elles relèvent le plafond du déficit imputable sur le revenu global (au plus 21 400 €). À justifier par deux DPE : classe E, F ou G avant travaux, A à D après, au plus tard le 31.12.2025 ; à défaut, le revenu est recalculé sans majoration.' },
  { code: '225', libelle: 'Charges récupérables non récupérées au départ du locataire', colonne: 'charges_non_recuperees', resultat: 'ligne225' },
  { code: '226', libelle: 'Indemnités d’éviction, frais de relogement', colonne: 'indemnites_eviction', resultat: 'ligne226' },
  { code: '227', libelle: 'Taxes foncières, taxes annexes', colonne: 'taxes_foncieres', resultat: 'ligne227', aide: 'Hors taxe d’enlèvement des ordures ménagères, récupérable sur le locataire.' },
  { code: '228', libelle: 'Déductions spécifiques (taux appliqué à la ligne 215)', colonne: 'taux_deduction_specifique', resultat: 'ligne228', unite: '%', aide: 'Conventionnement Anah — Borloo ancien : 30 % (intermédiaire), 45 % ou 60 % (social), 70 % (intermédié) ; Cosse : 15 % ou 30 % (intermédiaire), 50 % ou 70 % (social), 85 % (intermédié) ; carrières : 40 %. Loc’Avantages est une réduction d’impôt : rien à porter ici.' },
  { code: '229', libelle: 'Provisions pour charges de copropriété payées', colonne: 'provisions_charges', resultat: 'ligne229' },
  { code: '230', libelle: 'Régularisation des provisions déduites l’an dernier', colonne: 'regularisation_provisions', resultat: 'ligne230', aide: 'Part non déductible des provisions déduites l’année précédente (à retrancher). Montant négatif si les charges réelles ont dépassé les provisions : supplément de charges.' },
];

export function ImmeublesSection({ etat, annee }: { etat: Etat2044; annee: number }) {
  const { immeubles, resultat, modifierImmeuble, supprimerImmeuble, ajouterImmeuble, prerempliImmeubles } = etat;
  const chargesAVerifier = immeubles.flatMap((i) => (prerempliImmeubles[i.id]?.chargesAVerifier ?? [])
    .map((libelle) => `${i.denomination ?? prerempliImmeubles[i.id]?.valeurs.denomination ?? ''} : ${libelle}`));
  const chargesEcartees = immeubles.flatMap((i) => prerempliImmeubles[i.id]?.chargesEcartees ?? []);
  const lignes = resultat.immeubles;
  const nbColonnes = immeubles.length + 3;
  const somme = (cle: keyof Immeuble2044Result) => lignes.reduce((s, l) => s + (l[cle] as number), 0);

  const frais = FRAIS.filter((l) => l.code !== '224bis' || renovationEnergetiqueApplicable(annee));

  const saisie = (l: LigneImmeuble) => (
    <LigneSaisie
      key={l.code}
      code={l.code}
      libelle={<span className="inline-flex items-center gap-1.5">{l.libelle}{l.aide && <AideTooltip texte={l.aide} />}</span>}
      cellules={immeubles.map((i, idx) => (
        <div key={i.id} className="space-y-0.5">
          {l.unite === '%' ? (
            <select
              aria-label={`Ligne ${l.code} — ${i.denomination ?? ''}`}
              value={i[l.colonne] === null ? '' : String(Number(i[l.colonne]))}
              onChange={(e) => modifierImmeuble(i.id, { [l.colonne]: e.target.value === '' ? null : Number(e.target.value) })}
              className={cn(
                'h-7 w-full rounded-[2px] border border-transparent bg-transparent px-2 text-right text-[13px] tabular-nums',
                'hover:border-border focus:border-lagon focus:bg-background focus:outline-none',
                i[l.colonne] !== null ? 'font-medium text-foreground' : 'text-muted-foreground',
              )}
            >
              <option value="">Aucune</option>
              {TAUX_DEDUCTION_SPECIFIQUE_2044.map((t) => <option key={t} value={t}>{t} %</option>)}
            </select>
          ) : (
          <MontantCellule
            ariaLabel={`Ligne ${l.code} — ${i.denomination ?? ''}`}
            value={i[l.colonne] === null ? null : Number(i[l.colonne])}
            prerempli={l.colonne === 'nombre_locaux'
              ? 1
              : prerempliImmeubles[i.id]?.valeurs[COLONNES_IMMEUBLE_2044[l.colonne]] as number | undefined}
            min={l.colonne === 'nombre_locaux' ? 1 : l.colonne === 'regularisation_provisions' ? -Infinity : 0}
            step={l.unite === 'locaux' ? 1 : undefined}
            suffixe={l.unite === 'locaux' ? '×' : '€'}
            onCommit={(v) => modifierImmeuble(i.id, { [l.colonne]: v })}
          />
          )}
          {l.unite && (lignes[idx][l.resultat] as number) > 0 && (
            <div className="pr-2 text-right text-[11px] tabular-nums text-muted-foreground">= {formatEuros(lignes[idx][l.resultat] as number)}</div>
          )}
        </div>
      ))}
      total={somme(l.resultat)}
    />
  );

  return (
    <PanelCard>
      <PanelCardHeader className="flex items-start justify-between gap-4">
        <div>
          <PanelCardTitle>Propriétés rurales et urbaines</PanelCardTitle>
          <PanelCardDescription>
            Montants encaissés et payés en {annee}, un immeuble (ou groupe d’immeubles de même nature) par colonne. Les biens loués nus d’Immobilier sont préremplis à la part du foyer ; une saisie (en gras) remplace la valeur préremplie.
          </PanelCardDescription>
        </div>
        <AddButton onClick={ajouterImmeuble}>Ajouter un immeuble</AddButton>
      </PanelCardHeader>

      {immeubles.length === 0 ? (
        <p className={cn(panelInsetClass, 'text-[13px] text-muted-foreground')}>Aucun immeuble déclaré.</p>
      ) : (
        <Grille2044
          colonnes={immeubles.map((i) => ({ id: i.id, denomination: i.denomination ?? prerempliImmeubles[i.id]?.valeurs.denomination ?? '', relie: !!i.asset_id }))}
          onRenommer={(id, denomination) => modifierImmeuble(id, { denomination })}
          onSupprimer={supprimerImmeuble}
        >
          <LigneGroupe colSpan={nbColonnes}>Recettes</LigneGroupe>
          {RECETTES.map(saisie)}
          <LigneCalculee code="215" libelle="Total des recettes" valeurs={lignes.map((l) => l.ligne215)} total={resultat.caseE} fort />

          <LigneGroupe colSpan={nbColonnes}>Frais et charges</LigneGroupe>
          {frais.map(saisie)}
          <LigneCalculee code="240" libelle="Total des frais et charges (221 à 229 − 230)" valeurs={lignes.map((l) => l.ligne240)} total={resultat.caseF} fort />

          <LigneGroupe colSpan={nbColonnes}>Intérêts et résultat</LigneGroupe>
          {saisie({ code: '250', libelle: 'Intérêts d’emprunt', colonne: 'interets_emprunt', resultat: 'ligne250', aide: 'Intérêts et frais d’emprunt, assurance emprunteur comprise.' })}
          <LigneCalculee code="261" libelle="Revenus fonciers taxables (215 − 240 − 250)" valeurs={lignes.map((l) => l.ligne261)} total={somme('ligne261')} />
          {saisie({ code: '262', libelle: 'Réintégration du supplément de déduction', colonne: 'reintegration_supplement_deduction', resultat: 'ligne262', aide: 'Cas particuliers (Besson, Borloo, Cosse…) : voir la notice.' })}
          <LigneCalculee code="263" libelle="Bénéfice ou déficit (261 + 262)" valeurs={lignes.map((l) => l.ligne263)} total={resultat.caseI} fort />
        </Grille2044>
      )}
      {immeubles.some((i) => prerempliImmeubles[i.id]?.interetsApproximatifs) && (
        <p className={cn(panelInsetClass, 'mt-4 text-[12.5px] text-muted-foreground')}>
          Intérêts estimés sur les 12 prochains mois pour{' '}
          {immeubles.filter((i) => prerempliImmeubles[i.id]?.interetsApproximatifs)
            .map((i) => i.denomination ?? prerempliImmeubles[i.id]?.valeurs.denomination).join(', ')}
          {' '}: complétez le contrat de l’emprunt dans Patrimoine (capital initial, première échéance, durée) pour
          obtenir les intérêts de l’année, ou reportez le montant de l’attestation de la banque.
        </p>
      )}
      {chargesAVerifier.length > 0 && (
        <p className={cn(panelInsetClass, 'mt-4 text-[12.5px] text-muted-foreground')}>
          Classement à vérifier : ces charges n’ont pas été reconnues avec certitude et sont rangées par défaut
          sur la ligne indiquée ({chargesAVerifier.join(' ; ')}).
        </p>
      )}
      {chargesEcartees.length > 0 && (
        <p className={cn(panelInsetClass, 'mt-4 text-[12.5px] text-muted-foreground')}>
          Charges écartées : ordures ménagères et charges locatives (récupérables sur le locataire ; celles non
          récupérées à son départ vont ligne 225), taxe sur les bureaux d’Île-de-France (non déductible), assurance
          emprunteur (déjà comprise ligne 250) — {chargesEcartees.join(' ; ')}.
        </p>
      )}
    </PanelCard>
  );
}

type ColonnePart = keyof Pick<Declaration2044PartRecord, 'revenus_bruts' | 'frais_et_charges' | 'dont_renovation_energetique' | 'interets_emprunt'>;

const LIGNES_PARTS: { code: string; libelle: string; colonne: ColonnePart; aide?: string }[] = [
  { code: '111', libelle: 'Revenus bruts', colonne: 'revenus_bruts' },
  { code: '112', libelle: 'Frais et charges (sauf intérêts d’emprunt)', colonne: 'frais_et_charges' },
  { code: '112bis', libelle: 'Dont travaux de rénovation énergétique', colonne: 'dont_renovation_energetique', aide: 'Part de la ligne 112, sortie des classes E, F ou G.' },
  { code: '113', libelle: 'Intérêts d’emprunt', colonne: 'interets_emprunt', aide: 'Intérêts de l’emprunt personnel contracté pour acquérir les parts.' },
];

export function PartsSection({ etat, annee }: { etat: Etat2044; annee: number }) {
  const { parts, resultat, modifierPart, supprimerPart, ajouterPart, prerempliParts } = etat;
  const totaux: Record<ColonnePart, number> = {
    revenus_bruts: resultat.caseA, frais_et_charges: resultat.caseB,
    dont_renovation_energetique: resultat.caseJ, interets_emprunt: resultat.caseC,
  };

  return (
    <PanelCard>
      <PanelCardHeader className="flex items-start justify-between gap-4">
        <div>
          <PanelCardTitle>Parts de sociétés immobilières ou de FPI</PanelCardTitle>
          <PanelCardDescription>
            SCI à l’IR, SCPI, fonds de placement immobilier non soumis à l’IS. Pour une SCPI, la valeur préremplie (revenus distribués des 12 derniers mois) est une approximation : reportez les montants de l’attestation fiscale.
          </PanelCardDescription>
        </div>
        <AddButton onClick={ajouterPart}>Ajouter une société</AddButton>
      </PanelCardHeader>

      {parts.length === 0 ? (
        <p className={cn(panelInsetClass, 'text-[13px] text-muted-foreground')}>Aucune part de société déclarée.</p>
      ) : (
        <Grille2044
          colonnes={parts.map((p) => ({ id: p.id, denomination: p.denomination ?? prerempliParts[p.id]?.denomination ?? '', relie: !!p.asset_id }))}
          onRenommer={(id, denomination) => modifierPart(id, { denomination })}
          onSupprimer={supprimerPart}
        >
          {LIGNES_PARTS.filter((l) => l.code !== '112bis' || renovationEnergetiqueApplicable(annee)).map((l) => (
            <LigneSaisie
              key={l.code}
              code={l.code}
              libelle={<span className="inline-flex items-center gap-1.5">{l.libelle}{l.aide && <AideTooltip texte={l.aide} />}</span>}
              cellules={parts.map((p) => (
                <MontantCellule
                  key={p.id}
                  ariaLabel={`Ligne ${l.code} — ${p.denomination ?? ''}`}
                  value={p[l.colonne] === null ? null : Number(p[l.colonne])}
                  prerempli={prerempliParts[p.id]?.[COLONNES_PART_2044[l.colonne]] as number | undefined}
                  suffixe="€"
                  onCommit={(v) => modifierPart(p.id, { [l.colonne]: v })}
                />
              ))}
              total={totaux[l.colonne]}
            />
          ))}
          <LigneCalculee code="114" libelle="Bénéfice ou déficit (111 − 112 − 113)" valeurs={resultat.parts.map((p) => p.ligne114)} total={resultat.caseD} fort />
        </Grille2044>
      )}
    </PanelCard>
  );
}

function LigneResultat({ code, libelle, valeur, report, fort }: { code: string; libelle: string; valeur: number; report?: string; fort?: boolean }) {
  return (
    <div className={cn('grid grid-cols-[3.5rem_1fr_auto_8rem] items-center gap-3 border-b border-border/60 py-1.5 text-[13px]', fort && 'font-medium')}>
      <span className="text-[12px] tabular-nums text-muted-foreground">{code}</span>
      <span>{libelle}</span>
      <span className="text-[11.5px] text-muted-foreground">{report && `→ case ${report}`}</span>
      <span className={cn('text-right tabular-nums', valeur < 0 && 'text-destructive')}>{formatEuros(valeur)}</span>
    </div>
  );
}

export function ResultatSection({ resultat: r }: { resultat: Declaration2044Result }) {
  return (
    <PanelCard>
      <PanelCardHeader>
        <PanelCardTitle>Calcul du résultat foncier, répartition du déficit</PanelCardTitle>
        <PanelCardDescription>Rubriques 420 à 442, calculées à partir des immeubles et des parts de sociétés.</PanelCardDescription>
      </PanelCardHeader>

      <LigneResultat code="420" libelle="Bénéfice ou déficit total (case D + case I)" valeur={r.ligne420} report={r.ligne420 > 0 ? '4BA' : undefined} fort />

      {r.caseA + r.caseE > 0 && r.caseA + r.caseE <= SEUIL_MICRO_FONCIER && (
        <p className={cn(panelInsetClass, 'mt-4 text-[12.5px] text-muted-foreground')}>
          Recettes de {formatEuros(r.caseA + r.caseE)}, sous le seuil du micro-foncier ({formatEuros(SEUIL_MICRO_FONCIER)}) :
          sauf exclusion du micro-foncier, déposer cette 2044 vaut option pour le régime réel, irrévocable pendant 3 ans.
        </p>
      )}

      {r.casRepartition === null ? (
        <p className={cn(panelInsetClass, 'mt-4 text-[13px] text-muted-foreground')}>
          Pas de déficit cette année : les lignes 430 à 442 ne sont pas à remplir.
        </p>
      ) : (
        <div className="mt-4">
          <LigneResultat code="431" libelle="Total des revenus bruts (A + E + H)" valeur={r.ligne431} />
          <LigneResultat code="432" libelle="Total des intérêts d’emprunt (C + G)" valeur={r.ligne432} />
          <LigneResultat code="433" libelle="Total des autres frais et charges (B + F)" valeur={r.ligne433} />
          <LigneResultat code="434" libelle="Dont travaux de rénovation énergétique (J + K)" valeur={r.ligne434} />
          <div className={cn(panelInsetClass, 'my-3 text-[12.5px] text-muted-foreground')}>
            Plafond d’imputation sur le revenu global : 10 700 € + ligne 434, au plus 21 400 €, soit{' '}
            <span className="font-medium text-foreground">{formatEuros(r.plafondImputation)}</span>.{' '}
            {r.casRepartition === 'interets_superieurs'
              ? 'Les intérêts dépassent les revenus bruts (ligne 435) : seuls les autres frais s’imputent sur le revenu global.'
              : 'Les intérêts sont couverts par les revenus bruts (ligne 440) : le déficit s’impute sur le revenu global dans la limite du plafond.'}
          </div>
          {r.casRepartition === 'interets_superieurs' ? (
            <>
              <LigneResultat code="436" libelle="Ligne 433 dans la limite du plafond" valeur={r.ligne436} report="4BC" fort />
              <LigneResultat code="437" libelle="Ligne 433 au-delà du plafond" valeur={r.ligne437} />
              <LigneResultat code="438" libelle="Intérêts non couverts (432 − 431)" valeur={r.ligne438} />
              <LigneResultat code="439" libelle="Total (437 + 438)" valeur={r.ligne439} report="4BB" fort />
            </>
          ) : (
            <>
              <LigneResultat code="441" libelle="Déficit dans la limite du plafond" valeur={r.ligne441} report="4BC" fort />
              <LigneResultat code="442" libelle="Déficit au-delà du plafond" valeur={r.ligne442} report="4BB" fort />
            </>
          )}
        </div>
      )}
    </PanelCard>
  );
}

export function DeficitsAnterieursSection({ resultat: r, annee }: { resultat: Declaration2044Result; annee: number }) {
  return (
    <PanelCard>
      <PanelCardHeader>
        <PanelCardTitle>Déficits antérieurs restant à imputer</PanelCardTitle>
        <PanelCardDescription>
          Rubrique 450 : déficits des années {annee - 10} à {annee - 1}, issus du stock saisi dans Immobilier
          (synthèse foncière). Ils s’imputent du plus ancien au plus récent sur le bénéfice de la ligne 420.
        </PanelCardDescription>
      </PanelCardHeader>

      {r.deficitsAnterieurs.length === 0 ? (
        <p className={cn(panelInsetClass, 'text-[13px] text-muted-foreground')}>Aucun déficit antérieur en stock.</p>
      ) : (
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border text-[11.5px] text-muted-foreground">
              <th className="py-2 text-left font-medium">Année</th>
              <th className="py-2 text-right font-medium">Non imputé au 31/12/{annee - 1}</th>
              <th className="py-2 text-right font-medium">Imputé sur la ligne 420</th>
              <th className="py-2 text-right font-medium">Restant au 31/12/{annee}</th>
            </tr>
          </thead>
          <tbody>
            {r.deficitsAnterieurs.map((d) => (
              <tr key={d.anneeOrigine} className="border-b border-border/60">
                <td className="py-1.5 tabular-nums">{d.anneeOrigine}</td>
                <td className="py-1.5 text-right tabular-nums">{formatEuros(d.nonImpute)}</td>
                <td className="py-1.5 text-right tabular-nums">{formatEuros(d.impute)}</td>
                <td className="py-1.5 text-right tabular-nums">{formatEuros(d.restant)}</td>
              </tr>
            ))}
            <tr className="bg-secondary/50 font-medium">
              <td className="py-1.5 pl-1">451 · Total <span className="font-normal text-muted-foreground">→ case 4BD</span></td>
              <td className="py-1.5 text-right tabular-nums">{formatEuros(r.ligne451)}</td>
              <td className="py-1.5 text-right tabular-nums">{formatEuros(r.deficitsAnterieurs.reduce((s, d) => s + d.impute, 0))}</td>
              <td className="py-1.5 pr-1 text-right tabular-nums">{formatEuros(r.deficitsAnterieurs.reduce((s, d) => s + d.restant, 0))}</td>
            </tr>
          </tbody>
        </table>
      )}
    </PanelCard>
  );
}
