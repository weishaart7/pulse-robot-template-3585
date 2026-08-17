/**
 * Export PDF de l'écran Synthèse (Retraite) — deux parties dans le même
 * document : une page "Synthèse" en langage client (pension, trimestres
 * manquants, épargne complémentaire), puis une "Annexe" détaillant le calcul
 * (répartition par régime, historique des trimestres retenus, hypothèses).
 *
 * Consomme directement les champs déjà exposés par calculerPensionConsolidee
 * (repartitionParRegime, historiqueTrimestres, ageLegal) via
 * UsePensionConsolideeResult — aucun recalcul ici.
 */
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import { UsePensionConsolideeResult } from '@/hooks/usePensionConsolidee';
import { AgeLegal } from './calcul';

export interface DonneesPersonneExportPDF extends UsePensionConsolideeResult {
  nom: string;
}

export interface SyntheseRetraitePDFProps {
  utilisateur: DonneesPersonneExportPDF;
  // null si pas de conjoint, ou si son profil retraite est vide (même règle
  // d'affichage que Synthese.tsx : aDesDonnees).
  conjoint: DonneesPersonneExportPDF | null;
  dateGeneration: Date;
}

const formatEuro0 = (valeur: number) =>
  valeur.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const formatDate = (date: Date) =>
  date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

const formatAgeLegal = (ageLegal: AgeLegal) =>
  ageLegal.mois > 0 ? `${ageLegal.ans} ans et ${ageLegal.mois} mois` : `${ageLegal.ans} ans`;

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#1a1a1a' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  // Emplacement réservé pour un logo cabinet — non utilisé pour l'instant,
  // la structure (bloc dédié en tête de document) est prête à l'accueillir.
  logoPlaceholder: { width: 0, marginRight: 0 },
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  subtitle: { fontSize: 9, color: '#666666' },
  sectionTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginTop: 20, marginBottom: 10 },
  personneTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginTop: 14, marginBottom: 6 },
  card: { borderWidth: 1, borderColor: '#dddddd', borderRadius: 4, padding: 12, marginBottom: 8 },
  cardLabel: { fontSize: 9, color: '#666666', marginBottom: 3 },
  cardValue: { fontSize: 16, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  cardHint: { fontSize: 8, color: '#666666' },
  row: { flexDirection: 'row', gap: 10 },
  table: { marginTop: 4, marginBottom: 10 },
  tableHeaderRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1a1a1a', paddingBottom: 3 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#dddddd', paddingVertical: 3 },
  tableCellLabel: { flex: 2 },
  tableCellValue: { flex: 1, textAlign: 'right' },
  footer: { position: 'absolute', bottom: 20, left: 40, right: 40, fontSize: 7, color: '#999999', textAlign: 'center' },
});

const Entete = ({ dateGeneration }: { dateGeneration: Date }) => (
  <View style={styles.headerRow}>
    <View style={styles.logoPlaceholder} />
    <View>
      <Text style={styles.title}>Synthèse retraite</Text>
      <Text style={styles.subtitle}>Document généré le {formatDate(dateGeneration)}</Text>
    </View>
  </View>
);

const Pied = () => (
  <Text style={styles.footer} fixed>
    Document généré automatiquement à titre indicatif, sur la base des données saisies — ne remplace pas un relevé
    officiel de carrière.
  </Text>
);

const CarteSynthesePersonne = ({ donnees }: { donnees: DonneesPersonneExportPDF }) => {
  const pensionMensuelle = donnees.pensionTotaleConsolidee / 12;
  const trimestresManquants = donnees.trimestresRequis - donnees.trimestresValidesTousRegimes;

  return (
    <View>
      <Text style={styles.personneTitle}>{donnees.nom}</Text>
      <View style={styles.row}>
        <View style={[styles.card, { flex: 1 }]}>
          <Text style={styles.cardLabel}>Pension estimée</Text>
          <Text style={styles.cardValue}>{formatEuro0(pensionMensuelle)} / mois</Text>
          <Text style={styles.cardHint}>Soit {formatEuro0(donnees.pensionTotaleConsolidee)} par an</Text>
          <Text style={styles.cardHint}>{donnees.ageTauxPlein}</Text>
        </View>
        <View style={[styles.card, { flex: 1 }]}>
          <Text style={styles.cardLabel}>Trimestres</Text>
          {trimestresManquants > 0 ? (
            <>
              <Text style={styles.cardValue}>{trimestresManquants} manquants</Text>
              <Text style={styles.cardHint}>
                {donnees.trimestresValidesTousRegimes} validés sur {donnees.trimestresRequis} requis
              </Text>
            </>
          ) : (
            <Text style={styles.cardValue}>
              {donnees.trimestresValidesTousRegimes} / {donnees.trimestresRequis} validés
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

const PageSynthese = ({ utilisateur, conjoint, dateGeneration }: SyntheseRetraitePDFProps) => {
  const pensionCumulee = utilisateur.pensionTotaleConsolidee + (conjoint?.pensionTotaleConsolidee ?? 0);

  return (
    <Page size="A4" style={styles.page}>
      <Entete dateGeneration={dateGeneration} />

      <Text style={styles.sectionTitle}>Votre situation retraite</Text>
      <CarteSynthesePersonne donnees={utilisateur} />
      {conjoint && <CarteSynthesePersonne donnees={conjoint} />}

      {conjoint && (
        <View style={[styles.card, { marginTop: 6 }]}>
          <Text style={styles.cardLabel}>Pension cumulée du foyer</Text>
          <Text style={styles.cardValue}>{formatEuro0(pensionCumulee)} / an</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Épargne complémentaire recommandée</Text>
      <View style={styles.card}>
        <Text style={styles.cardValue}>0 €</Text>
        <Text style={styles.cardHint}>Calcul détaillé à venir — ce montant n'est pas encore une estimation.</Text>
      </View>

      <Pied />
    </Page>
  );
};

const TableRepartitionRegime = ({ donnees }: { donnees: DonneesPersonneExportPDF }) => {
  const { repartitionParRegime } = donnees;
  const lignes: { label: string; valeur: number }[] = [
    { label: 'Régime général — base', valeur: repartitionParRegime.baseRegimeGeneral },
    { label: 'Régime général — complémentaire', valeur: repartitionParRegime.complementaireRegimeGeneral },
    { label: 'Fonction publique', valeur: repartitionParRegime.fonctionPublique },
    { label: 'RAFP', valeur: repartitionParRegime.rafp },
    { label: 'CNAVPL', valeur: repartitionParRegime.cnavpl },
  ].filter((ligne) => ligne.valeur !== 0);

  if (lignes.length === 0) {
    return <Text style={styles.cardHint}>Aucune donnée de répartition disponible.</Text>;
  }

  return (
    <View style={styles.table}>
      <View style={styles.tableHeaderRow}>
        <Text style={styles.tableCellLabel}>Régime</Text>
        <Text style={styles.tableCellValue}>Pension annuelle</Text>
      </View>
      {lignes.map((ligne) => (
        <View style={styles.tableRow} key={ligne.label}>
          <Text style={styles.tableCellLabel}>{ligne.label}</Text>
          <Text style={styles.tableCellValue}>{formatEuro0(ligne.valeur)}</Text>
        </View>
      ))}
    </View>
  );
};

const TableHistoriqueTrimestres = ({ donnees }: { donnees: DonneesPersonneExportPDF }) => {
  const { parAnnee, anneesSansBaremeConnu } = donnees.historiqueTrimestres;

  if (parAnnee.length === 0) {
    return <Text style={styles.cardHint}>Aucun historique de trimestres disponible.</Text>;
  }

  return (
    <View style={styles.table}>
      <View style={styles.tableHeaderRow}>
        <Text style={styles.tableCellLabel}>Année</Text>
        <Text style={styles.tableCellValue}>Cotisés</Text>
        <Text style={styles.tableCellValue}>Assimilés</Text>
      </View>
      {parAnnee.map((ligne) => (
        <View style={styles.tableRow} key={ligne.annee}>
          <Text style={styles.tableCellLabel}>{ligne.annee}</Text>
          <Text style={styles.tableCellValue}>{ligne.cotises}</Text>
          <Text style={styles.tableCellValue}>{ligne.assimiles}</Text>
        </View>
      ))}
      {anneesSansBaremeConnu.length > 0 && (
        <Text style={[styles.cardHint, { marginTop: 4 }]}>
          Années sans barème de validation connu (non comptabilisées ci-dessus) :{' '}
          {anneesSansBaremeConnu.join(', ')}.
        </Text>
      )}
    </View>
  );
};

const HypothesesCalcul = ({ donnees }: { donnees: DonneesPersonneExportPDF }) => (
  <View style={styles.card}>
    <Text style={styles.cardLabel}>Âge du taux plein retenu</Text>
    <Text style={{ marginBottom: 6 }}>{donnees.ageTauxPlein}</Text>
    <Text style={styles.cardLabel}>Âge légal de départ</Text>
    <Text style={{ marginBottom: 6 }}>
      {donnees.ageLegal?.stable ? formatAgeLegal(donnees.ageLegal.age) : donnees.ageLegal?.raison ?? 'Non déterminé.'}
    </Text>
    <Text style={styles.cardLabel}>Trimestres requis pour le taux plein</Text>
    <Text>{donnees.trimestresRequis} trimestres</Text>
  </View>
);

const SectionAnnexePersonne = ({ donnees }: { donnees: DonneesPersonneExportPDF }) => (
  <View>
    <Text style={styles.personneTitle}>{donnees.nom}</Text>
    <Text style={styles.cardLabel}>Répartition par régime</Text>
    <TableRepartitionRegime donnees={donnees} />
    <Text style={styles.cardLabel}>Historique des trimestres retenus</Text>
    <TableHistoriqueTrimestres donnees={donnees} />
    <Text style={styles.cardLabel}>Hypothèses de calcul</Text>
    <HypothesesCalcul donnees={donnees} />
  </View>
);

const PageAnnexe = ({ utilisateur, conjoint, dateGeneration }: SyntheseRetraitePDFProps) => (
  <Page size="A4" style={styles.page}>
    <Entete dateGeneration={dateGeneration} />
    <Text style={styles.sectionTitle}>Annexe — détail du calcul</Text>
    <SectionAnnexePersonne donnees={utilisateur} />
    {conjoint && <SectionAnnexePersonne donnees={conjoint} />}
    <Pied />
  </Page>
);

const SyntheseRetraitePDF = (props: SyntheseRetraitePDFProps) => (
  <Document>
    <PageSynthese {...props} />
    <PageAnnexe {...props} />
  </Document>
);

export async function exporterSyntheseRetraitePDF(props: SyntheseRetraitePDFProps): Promise<void> {
  const blob = await pdf(<SyntheseRetraitePDF {...props} />).toBlob();
  const url = URL.createObjectURL(blob);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = `synthese-retraite-${props.dateGeneration.toISOString().slice(0, 10)}.pdf`;
  document.body.appendChild(lien);
  lien.click();
  document.body.removeChild(lien);
  URL.revokeObjectURL(url);
}
