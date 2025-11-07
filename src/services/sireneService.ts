interface SireneEtablissement {
  siren: string;
  siret: string;
  nom_complet: string;
  nom_raison_sociale?: string;
  siege: {
    siret: string;
    activite_principale: string;
    code_postal?: string;
    commune?: string;
    libelle_commune?: string;
    libelle_voie?: string;
    numero_voie?: string;
    type_voie?: string;
    date_creation: string;
  };
  activite_principale?: string;
  date_creation?: string;
  tranche_effectif_salarie?: string;
  nature_juridique?: string;
  capital_social?: number;
  numero_tva_intracommunautaire?: string;
}

interface SireneResponse {
  results: SireneEtablissement[];
  total_results: number;
}

export interface SireneData {
  denomination: string;
  siret: string;
  dateCreation?: string;
  activite?: string;
  codePostal?: string;
  commune?: string;
  adresse?: string;
  effectif?: string;
  formeJuridique?: string;
  capitalSocial?: number;
}

class SireneService {
  private baseUrl = 'https://recherche-entreprises.api.gouv.fr';

  async searchBySiren(siren: string): Promise<SireneData | null> {
    try {
      const response = await fetch(`${this.baseUrl}/search?q=${siren}&per_page=1`);
      if (!response.ok) {
        throw new Error('Erreur lors de la recherche');
      }
      const data: SireneResponse = await response.json();
      
      if (data.results.length === 0) {
        return null;
      }

      return this.mapToSireneData(data.results[0]);
    } catch (error) {
      console.error('Error searching by SIREN:', error);
      throw error;
    }
  }

  async searchByDenomination(denomination: string): Promise<SireneData[]> {
    try {
      const response = await fetch(`${this.baseUrl}/search?q=${encodeURIComponent(denomination)}&per_page=10`);
      if (!response.ok) {
        throw new Error('Erreur lors de la recherche');
      }
      const data: SireneResponse = await response.json();
      
      return data.results.map(result => this.mapToSireneData(result));
    } catch (error) {
      console.error('Error searching by denomination:', error);
      throw error;
    }
  }

  private mapToSireneData(etablissement: SireneEtablissement): SireneData {
    const siege = etablissement.siege;
    
    // Construire l'adresse complète
    let adresse = '';
    if (siege.numero_voie) adresse += siege.numero_voie + ' ';
    if (siege.type_voie) adresse += siege.type_voie + ' ';
    if (siege.libelle_voie) adresse += siege.libelle_voie;

    return {
      denomination: etablissement.nom_complet || etablissement.nom_raison_sociale || '',
      siret: etablissement.siret,
      dateCreation: siege.date_creation || etablissement.date_creation,
      activite: siege.activite_principale || etablissement.activite_principale,
      codePostal: siege.code_postal,
      commune: siege.libelle_commune || siege.commune,
      adresse: adresse.trim(),
      effectif: etablissement.tranche_effectif_salarie,
      formeJuridique: etablissement.nature_juridique,
      capitalSocial: etablissement.capital_social,
    };
  }
}

export const sireneService = new SireneService();
