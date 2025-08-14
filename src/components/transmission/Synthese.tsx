import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calculator, Users, FileText, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Types simplifiés pour le nouveau système
interface Person {
  id: string;
  nom: string;
  prenom?: string;
  lienFamilial: string;
  dateNaissance?: string;
  handicap?: boolean;
  estDecede?: boolean;
}

interface FamilyData {
  defunt: Person;
  conjoint?: Person;
  enfants: Person[];
  parents: Person[];
  freresSoeurs: Person[];
  grandsParents: Person[];
  onclesTantes: Person[];
  cousins: Person[];
}

interface PatrimoineData {
  biensExistants: number;
  passifs: number;
  fraisFuneraires: number;
}

interface Donation {
  id: string;
  date: string;
  beneficiaire: string;
  valeur: number;
  avancementPart: boolean; // true = en avancement, false = hors part
}

interface DevolutionResult {
  ordre: 1 | 2 | 3 | 4 | 5;
  heritiers: Array<{
    id: string;
    nom: string;
    lien: string;
    quotePart: number;
    montant: number;
    vientParRepresentation: boolean;
  }>;
  fente: boolean;
  representation: boolean;
}

interface ReserveResult {
  masseCalcul: number;
  reserve: number;
  quotiteDisponible: number;
  tauxReserve: number; // 1/2, 2/3, 3/4 selon le nb d'enfants
}

interface FiscalResult {
  totalDroits: number;
  parBeneficiaire: Record<string, {
    partBrute: number;
    abattement: number;
    baseTaxable: number;
    droits: number;
    taux: number;
  }>;
}

export const Synthese = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [familyData, setFamilyData] = useState<FamilyData | null>(null);
  const [patrimoineData, setPatrimoineData] = useState<PatrimoineData | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [devolutionResult, setDevolutionResult] = useState<DevolutionResult | null>(null);
  const [reserveResult, setReserveResult] = useState<ReserveResult | null>(null);
  const [fiscalResult, setFiscalResult] = useState<FiscalResult | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Charger les données familiales
      const family = await loadFamilyData();
      setFamilyData(family);

      // Charger le patrimoine
      const patrimoine = await loadPatrimoineData();
      setPatrimoineData(patrimoine);

      // Charger les donations
      const donationsData = await loadDonations();
      setDonations(donationsData);

      // Effectuer les calculs si on a toutes les données
      if (family && patrimoine) {
        calculateTransmission(family, patrimoine, donationsData);
      }

    } catch (err) {
      console.error('Erreur lors du chargement:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const loadFamilyData = async (): Promise<FamilyData> => {
    // Profil du défunt
    const { data: profile } = await supabase
      .from('family_profiles')
      .select('*')
      .eq('user_id', user!.id)
      .maybeSingle();

    // Statut matrimonial
    const { data: marital } = await supabase
      .from('marital_status')
      .select('*')
      .eq('user_id', user!.id)
      .maybeSingle();

    // Liens familiaux
    const { data: links } = await supabase
      .from('family_links')
      .select('*')
      .eq('user_id', user!.id);

    const defunt: Person = {
      id: user!.id,
      nom: profile?.nom || 'Défunt',
      prenom: profile?.prenom || '',
      lienFamilial: 'défunt',
      dateNaissance: profile?.date_naissance,
      handicap: profile?.personne_handicapee
    };

    let conjoint: Person | undefined;
    if (marital?.statut_couple && ['Marié(e)', 'Pacsé(e)'].includes(marital.statut_couple)) {
      conjoint = {
        id: `conjoint-${user!.id}`,
        nom: marital.nom_conjoint || 'Conjoint',
        prenom: marital.prenom_conjoint || '',
        lienFamilial: 'conjoint',
        dateNaissance: marital.date_naissance_conjoint
      };
    }

    // Organiser les liens par type
    const enfants: Person[] = [];
    const parents: Person[] = [];
    const freresSoeurs: Person[] = [];
    const grandsParents: Person[] = [];
    const onclesTantes: Person[] = [];
    const cousins: Person[] = [];

    (links || []).forEach(link => {
      const person: Person = {
        id: `person-${link.id}`,
        nom: link.nom,
        prenom: link.prenom || '',
        lienFamilial: link.lien_familial,
        dateNaissance: link.date_naissance || undefined,
        handicap: link.handicap
      };

      switch (link.lien_familial) {
        case 'enfant':
          enfants.push(person);
          break;
        case 'père':
        case 'mère':
        case 'parent':
          parents.push(person);
          break;
        case 'frère':
        case 'soeur':
        case 'frere_soeur':
          freresSoeurs.push(person);
          break;
        case 'grand-père':
        case 'grand-mère':
        case 'grand_parent':
          grandsParents.push(person);
          break;
        case 'oncle':
        case 'tante':
          onclesTantes.push(person);
          break;
        case 'cousin':
        case 'cousine':
          cousins.push(person);
          break;
      }
    });

    return {
      defunt,
      conjoint,
      enfants,
      parents,
      freresSoeurs,
      grandsParents,
      onclesTantes,
      cousins
    };
  };

  const loadPatrimoineData = async (): Promise<PatrimoineData> => {
    // Assets
    const { data: assets } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', user!.id);

    // Charges
    const { data: charges } = await supabase
      .from('charges')
      .select('*')
      .eq('user_id', user!.id);

    const biensExistants = (assets || []).reduce((sum, asset) => 
      sum + (Number(asset.valeur_estimee) || 0), 0
    );

    const passifs = (charges || []).reduce((sum, charge) => 
      sum + (Number(charge.montant) || 0), 0
    );

    return {
      biensExistants,
      passifs,
      fraisFuneraires: 1500 // Forfait légal
    };
  };

  const loadDonations = async (): Promise<Donation[]> => {
    const { data: liberalites } = await supabase
      .from('liberalites')
      .select('*')
      .eq('user_id', user!.id)
      .eq('type', 'donation');

    // Filtrer les 15 dernières années
    const quinzeAnsAgo = new Date();
    quinzeAnsAgo.setFullYear(quinzeAnsAgo.getFullYear() - 15);

    return (liberalites || [])
      .filter(lib => {
        const dateActe = new Date(lib.date_acte || '');
        return dateActe >= quinzeAnsAgo;
      })
      .map(lib => ({
        id: lib.id!,
        date: lib.date_acte || '',
        beneficiaire: lib.beneficiaire || 'inconnu',
        valeur: Number(lib.montant) || 0,
        avancementPart: true // Par défaut en avancement de part
      }));
  };

  const calculateTransmission = (family: FamilyData, patrimoine: PatrimoineData, donations: Donation[]) => {
    // 1. Calculer la dévolution successorale
    const devolution = calculateDevolution(family, patrimoine.biensExistants - patrimoine.passifs);
    setDevolutionResult(devolution);

    // 2. Calculer réserve et quotité disponible
    const reserve = calculateReserve(family, patrimoine, donations);
    setReserveResult(reserve);

    // 3. Calculer les droits fiscaux
    const fiscal = calculateFiscal(devolution, donations);
    setFiscalResult(fiscal);
  };

  const calculateDevolution = (family: FamilyData, patrimoine: number): DevolutionResult => {
    // Déterminer l'ordre applicable selon les règles françaises
    let ordre: 1 | 2 | 3 | 4 | 5 = 5;
    let heritiers: any[] = [];
    let fente = false;
    let representation = false;

    // 1er ordre : descendants
    if (family.enfants.length > 0) {
      ordre = 1;
      const partParEnfant = 1 / family.enfants.length;
      
      heritiers = family.enfants.map(enfant => ({
        id: enfant.id,
        nom: `${enfant.prenom} ${enfant.nom}`,
        lien: 'enfant',
        quotePart: partParEnfant,
        montant: patrimoine * partParEnfant,
        vientParRepresentation: false
      }));

      // Ajouter le conjoint s'il existe
      if (family.conjoint) {
        // Option par défaut : 1/4 en pleine propriété
        const partConjoint = 0.25;
        const partRestanteEnfants = 0.75;
        
        heritiers.unshift({
          id: family.conjoint.id,
          nom: `${family.conjoint.prenom} ${family.conjoint.nom}`,
          lien: 'conjoint',
          quotePart: partConjoint,
          montant: patrimoine * partConjoint,
          vientParRepresentation: false
        });

        // Ajuster les parts des enfants
        heritiers.slice(1).forEach(enfant => {
          enfant.quotePart = partRestanteEnfants / family.enfants.length;
          enfant.montant = patrimoine * enfant.quotePart;
        });
      }
    }
    // 2ème ordre : ascendants privilégiés + collatéraux privilégiés
    else if (family.parents.length > 0 || family.freresSoeurs.length > 0) {
      ordre = 2;
      
      const pere = family.parents.find(p => p.lienFamilial.includes('père') || p.lienFamilial === 'parent');
      const mere = family.parents.find(p => p.lienFamilial.includes('mère') || p.lienFamilial === 'parent');
      
      let partRestante = 1;
      
      // Ajouter le conjoint d'abord
      if (family.conjoint) {
        const nbParents = family.parents.length;
        const partConjoint = nbParents === 2 ? 0.5 : (nbParents === 1 ? 0.75 : 1);
        
        heritiers.push({
          id: family.conjoint.id,
          nom: `${family.conjoint.prenom} ${family.conjoint.nom}`,
          lien: 'conjoint',
          quotePart: partConjoint,
          montant: patrimoine * partConjoint,
          vientParRepresentation: false
        });
        
        partRestante = 1 - partConjoint;
      }
      
      // Répartir selon les règles du 2ème ordre
      if (pere && mere && family.freresSoeurs.length > 0) {
        // Père: 1/4, Mère: 1/4, Frères/sœurs: 1/2
        heritiers.push({
          id: pere.id,
          nom: `${pere.prenom} ${pere.nom}`,
          lien: 'parent',
          quotePart: partRestante * 0.25,
          montant: patrimoine * partRestante * 0.25,
          vientParRepresentation: false
        });
        
        heritiers.push({
          id: mere.id,
          nom: `${mere.prenom} ${mere.nom}`,
          lien: 'parent',
          quotePart: partRestante * 0.25,
          montant: patrimoine * partRestante * 0.25,
          vientParRepresentation: false
        });
        
        const partParFS = (partRestante * 0.5) / family.freresSoeurs.length;
        family.freresSoeurs.forEach(fs => {
          heritiers.push({
            id: fs.id,
            nom: `${fs.prenom} ${fs.nom}`,
            lien: 'frere_soeur',
            quotePart: partParFS,
            montant: patrimoine * partParFS,
            vientParRepresentation: false
          });
        });
      } else if ((pere || mere) && family.freresSoeurs.length > 0) {
        // Un parent: 1/4, Frères/sœurs: 3/4
        const parent = pere || mere;
        heritiers.push({
          id: parent!.id,
          nom: `${parent!.prenom} ${parent!.nom}`,
          lien: 'parent',
          quotePart: partRestante * 0.25,
          montant: patrimoine * partRestante * 0.25,
          vientParRepresentation: false
        });
        
        const partParFS = (partRestante * 0.75) / family.freresSoeurs.length;
        family.freresSoeurs.forEach(fs => {
          heritiers.push({
            id: fs.id,
            nom: `${fs.prenom} ${fs.nom}`,
            lien: 'frere_soeur',
            quotePart: partParFS,
            montant: patrimoine * partParFS,
            vientParRepresentation: false
          });
        });
      } else if (pere && mere && family.freresSoeurs.length === 0) {
        // Seulement les parents: 1/2 chacun
        heritiers.push({
          id: pere.id,
          nom: `${pere.prenom} ${pere.nom}`,
          lien: 'parent',
          quotePart: partRestante * 0.5,
          montant: patrimoine * partRestante * 0.5,
          vientParRepresentation: false
        });
        
        heritiers.push({
          id: mere.id,
          nom: `${mere.prenom} ${mere.nom}`,
          lien: 'parent',
          quotePart: partRestante * 0.5,
          montant: patrimoine * partRestante * 0.5,
          vientParRepresentation: false
        });
      } else if (family.freresSoeurs.length > 0) {
        // Seulement des frères/sœurs
        const partParFS = partRestante / family.freresSoeurs.length;
        family.freresSoeurs.forEach(fs => {
          heritiers.push({
            id: fs.id,
            nom: `${fs.prenom} ${fs.nom}`,
            lien: 'frere_soeur',
            quotePart: partParFS,
            montant: patrimoine * partParFS,
            vientParRepresentation: false
          });
        });
      }
    }
    // 3ème ordre : ascendants ordinaires
    else if (family.grandsParents.length > 0) {
      ordre = 3;
      fente = true;
      
      let partRestante = 1;
      
      // Ajouter le conjoint
      if (family.conjoint) {
        heritiers.push({
          id: family.conjoint.id,
          nom: `${family.conjoint.prenom} ${family.conjoint.nom}`,
          lien: 'conjoint',
          quotePart: 1,
          montant: patrimoine,
          vientParRepresentation: false
        });
        partRestante = 0; // Conjoint prend tout
      } else {
        // Application de la fente (simplifiée)
        const partParGP = 1 / family.grandsParents.length;
        family.grandsParents.forEach(gp => {
          heritiers.push({
            id: gp.id,
            nom: `${gp.prenom} ${gp.nom}`,
            lien: 'grand_parent',
            quotePart: partParGP,
            montant: patrimoine * partParGP,
            vientParRepresentation: false
          });
        });
      }
    }
    // 4ème ordre : collatéraux ordinaires
    else if (family.onclesTantes.length > 0 || family.cousins.length > 0) {
      ordre = 4;
      fente = true;
      
      const collateraux = [...family.onclesTantes, ...family.cousins];
      
      if (family.conjoint) {
        heritiers.push({
          id: family.conjoint.id,
          nom: `${family.conjoint.prenom} ${family.conjoint.nom}`,
          lien: 'conjoint',
          quotePart: 1,
          montant: patrimoine,
          vientParRepresentation: false
        });
      } else {
        const partParCollateral = 1 / collateraux.length;
        collateraux.forEach(coll => {
          heritiers.push({
            id: coll.id,
            nom: `${coll.prenom} ${coll.nom}`,
            lien: coll.lienFamilial.includes('oncle') || coll.lienFamilial.includes('tante') ? 'oncle_tante' : 'cousin',
            quotePart: partParCollateral,
            montant: patrimoine * partParCollateral,
            vientParRepresentation: false
          });
        });
      }
    }
    // Au-delà : État
    else {
      ordre = 5;
      if (family.conjoint) {
        heritiers.push({
          id: family.conjoint.id,
          nom: `${family.conjoint.prenom} ${family.conjoint.nom}`,
          lien: 'conjoint',
          quotePart: 1,
          montant: patrimoine,
          vientParRepresentation: false
        });
      }
    }

    return {
      ordre,
      heritiers,
      fente,
      representation
    };
  };

  const calculateReserve = (family: FamilyData, patrimoine: PatrimoineData, donations: Donation[]): ReserveResult => {
    const nbEnfants = family.enfants.length;
    let tauxReserve = 0;
    
    // Calculer le taux de réserve selon le nombre d'enfants
    if (nbEnfants === 1) {
      tauxReserve = 0.5; // 1/2
    } else if (nbEnfants === 2) {
      tauxReserve = 2/3; // 2/3
    } else if (nbEnfants >= 3) {
      tauxReserve = 0.75; // 3/4
    } else if (!nbEnfants && family.conjoint) {
      tauxReserve = 0.25; // 1/4 pour le conjoint sans enfants
    }
    
    // Masse de calcul = biens existants - passifs + donations
    const valeurDonations = donations.reduce((sum, don) => sum + don.valeur, 0);
    const masseCalcul = patrimoine.biensExistants - patrimoine.passifs + valeurDonations;
    
    const reserve = masseCalcul * tauxReserve;
    const quotiteDisponible = masseCalcul - reserve;
    
    return {
      masseCalcul,
      reserve,
      quotiteDisponible,
      tauxReserve
    };
  };

  const calculateFiscal = (devolution: DevolutionResult, donations: Donation[]): FiscalResult => {
    const parBeneficiaire: Record<string, any> = {};
    let totalDroits = 0;

    devolution.heritiers.forEach(heritier => {
      // Abattements selon le lien de parenté
      let abattement = 1594; // Abattement de base
      
      switch (heritier.lien) {
        case 'conjoint':
          abattement = Infinity; // Exonération totale
          break;
        case 'enfant':
        case 'parent':
          abattement = 100000;
          break;
        case 'frere_soeur':
          abattement = 15932;
          break;
        case 'neveu_niece':
          abattement = 7967;
          break;
      }
      
      // Vérifier les donations antérieures pour le rappel fiscal
      const donationsPersonne = donations.filter(don => don.beneficiaire === heritier.id);
      const valeurDonationsRappelees = donationsPersonne.reduce((sum, don) => sum + don.valeur, 0);
      
      // Abattement résiduel après donations
      const abattementDisponible = Math.max(0, abattement - valeurDonationsRappelees);
      
      // Base taxable après abattement
      const baseTaxable = Math.max(0, heritier.montant - abattementDisponible);
      
      // Calcul des droits selon le barème
      let droits = 0;
      let taux = 0;
      
      if (heritier.lien === 'conjoint') {
        droits = 0;
        taux = 0;
      } else if (['enfant', 'parent'].includes(heritier.lien)) {
        // Barème ligne directe
        if (baseTaxable <= 8072) {
          droits = baseTaxable * 0.05;
          taux = 5;
        } else if (baseTaxable <= 12109) {
          droits = 8072 * 0.05 + (baseTaxable - 8072) * 0.10;
          taux = 10;
        } else if (baseTaxable <= 15932) {
          droits = 8072 * 0.05 + (12109 - 8072) * 0.10 + (baseTaxable - 12109) * 0.15;
          taux = 15;
        } else if (baseTaxable <= 552324) {
          droits = 8072 * 0.05 + (12109 - 8072) * 0.10 + (15932 - 12109) * 0.15 + (baseTaxable - 15932) * 0.20;
          taux = 20;
        } else if (baseTaxable <= 902838) {
          droits = 8072 * 0.05 + (12109 - 8072) * 0.10 + (15932 - 12109) * 0.15 + (552324 - 15932) * 0.20 + (baseTaxable - 552324) * 0.30;
          taux = 30;
        } else if (baseTaxable <= 1805677) {
          droits = 8072 * 0.05 + (12109 - 8072) * 0.10 + (15932 - 12109) * 0.15 + (552324 - 15932) * 0.20 + (902838 - 552324) * 0.30 + (baseTaxable - 902838) * 0.40;
          taux = 40;
        } else {
          droits = 8072 * 0.05 + (12109 - 8072) * 0.10 + (15932 - 12109) * 0.15 + (552324 - 15932) * 0.20 + (902838 - 552324) * 0.30 + (1805677 - 902838) * 0.40 + (baseTaxable - 1805677) * 0.45;
          taux = 45;
        }
      } else if (heritier.lien === 'frere_soeur') {
        // Barème frères et sœurs
        if (baseTaxable <= 24430) {
          droits = baseTaxable * 0.35;
          taux = 35;
        } else {
          droits = 24430 * 0.35 + (baseTaxable - 24430) * 0.45;
          taux = 45;
        }
      } else {
        // Autres (neveu/nièce, cousins, etc.)
        if (heritier.lien === 'neveu_niece') {
          droits = baseTaxable * 0.55;
          taux = 55;
        } else {
          droits = baseTaxable * 0.60;
          taux = 60;
        }
      }
      
      parBeneficiaire[heritier.id] = {
        partBrute: heritier.montant,
        abattement: abattementDisponible,
        baseTaxable,
        droits: Math.round(droits),
        taux
      };
      
      totalDroits += droits;
    });

    return {
      totalDroits: Math.round(totalDroits),
      parBeneficiaire
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Chargement des données...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div className="text-center">
          <h3 className="text-lg font-semibold">Erreur</h3>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={loadData} className="mt-4">
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  if (!familyData || !patrimoineData) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold mb-2">Données insuffisantes</h3>
        <p className="text-muted-foreground mb-4">
          Veuillez renseigner vos données dans les sections Famille et Patrimoine.
        </p>
        <Button onClick={loadData}>
          Recharger
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Vue d'ensemble */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Calculator className="h-5 w-5 text-primary" />
              <div className="text-sm text-muted-foreground">Patrimoine net</div>
            </div>
            <div className="text-2xl font-bold">
              {formatCurrency(patrimoineData.biensExistants - patrimoineData.passifs)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-primary" />
              <div className="text-sm text-muted-foreground">Ordre succession</div>
            </div>
            <div className="text-2xl font-bold">
              {devolutionResult?.ordre || '-'}
              {devolutionResult?.ordre === 1 && 'er'}
              {devolutionResult?.ordre && devolutionResult.ordre > 1 && 'ème'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-primary" />
              <div className="text-sm text-muted-foreground">Réserve</div>
            </div>
            <div className="text-2xl font-bold">
              {reserveResult ? formatCurrency(reserveResult.reserve) : '-'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-destructive" />
              <div className="text-sm text-muted-foreground">Droits succession</div>
            </div>
            <div className="text-2xl font-bold text-destructive">
              {fiscalResult ? formatCurrency(fiscalResult.totalDroits) : '-'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Détail de la dévolution */}
      {devolutionResult && (
        <Card>
          <CardHeader>
            <CardTitle>Dévolution successorale</CardTitle>
            <CardDescription>
              Répartition selon les règles du {devolutionResult.ordre}
              {devolutionResult.ordre === 1 && 'er'}
              {devolutionResult.ordre > 1 && 'ème'} ordre
              {devolutionResult.fente && ' - Avec fente'}
              {devolutionResult.representation && ' - Avec représentation'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {devolutionResult.heritiers.map(heritier => (
                <div key={heritier.id} className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">{heritier.nom}</div>
                    <div className="text-sm text-muted-foreground capitalize">{heritier.lien}</div>
                    {heritier.vientParRepresentation && (
                      <div className="text-xs text-blue-600">Par représentation</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatCurrency(heritier.montant)}</div>
                    <div className="text-sm text-muted-foreground">
                      {(heritier.quotePart * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Détail fiscal */}
      {fiscalResult && (
        <Card>
          <CardHeader>
            <CardTitle>Calcul des droits de succession</CardTitle>
            <CardDescription>
              Droits calculés selon le barème fiscal français avec rappel des donations sur 15 ans
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(fiscalResult.parBeneficiaire).map(([heritierId, fiscal]) => {
                const heritier = devolutionResult?.heritiers.find(h => h.id === heritierId);
                return (
                  <div key={heritierId} className="p-4 border rounded-lg">
                    <div className="font-medium mb-2">{heritier?.nom}</div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Part brute</div>
                        <div className="font-medium">{formatCurrency(fiscal.partBrute)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Abattement</div>
                        <div className="font-medium">{formatCurrency(fiscal.abattement)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Base taxable</div>
                        <div className="font-medium">{formatCurrency(fiscal.baseTaxable)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Taux</div>
                        <div className="font-medium">{fiscal.taux}%</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Droits</div>
                        <div className="font-bold text-destructive">{formatCurrency(fiscal.droits)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <div className="font-semibold">Total des droits de succession</div>
                  <div className="text-xl font-bold text-destructive">
                    {formatCurrency(fiscalResult.totalDroits)}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informations sur la réserve */}
      {reserveResult && (
        <Card>
          <CardHeader>
            <CardTitle>Réserve héréditaire et quotité disponible</CardTitle>
            <CardDescription>
              Protection des héritiers réservataires
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm text-muted-foreground">Masse de calcul</div>
                <div className="text-lg font-semibold">{formatCurrency(reserveResult.masseCalcul)}</div>
                <div className="text-xs text-muted-foreground">
                  Biens existants + donations
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Réserve ({(reserveResult.tauxReserve * 100).toFixed(0)}%)</div>
                <div className="text-lg font-semibold">{formatCurrency(reserveResult.reserve)}</div>
                <div className="text-xs text-muted-foreground">
                  Part protégée
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Quotité disponible</div>
                <div className="text-lg font-semibold">{formatCurrency(reserveResult.quotiteDisponible)}</div>
                <div className="text-xs text-muted-foreground">
                  Libre disposition
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};