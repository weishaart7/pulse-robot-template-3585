import { supabase } from '@/integrations/supabase/client';
import type { DeficitFoncierReporte, TypeDeficitFoncierReporte } from '@/lib/immobilier/foncierFoyer';

// Stock de déficits fonciers reportables (location nue, régime réel), saisi
// manuellement par l'utilisateur — voir la migration create_deficits_fonciers_reportes
// pour le détail des règles CGI. Le calcul de consommation reste entièrement dans
// computeFoyerFoncier (fonction pure) : ce service ne fait que persister le stock,
// sans jamais recalculer ou décrémenter montant_restant lui-même.

export interface DeficitFoncierReporteRecord {
  id: string;
  user_id: string;
  annee_origine: number;
  type: TypeDeficitFoncierReporte;
  montant_initial: number;
  montant_restant: number;
  commentaire?: string | null;
  created_at?: string;
  updated_at?: string;
}

const requireUser = async () => {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Non authentifié');
  return data.user;
};

export const deficitFoncierService = {
  async list(): Promise<DeficitFoncierReporteRecord[]> {
    const user = await requireUser();
    const { data, error } = await supabase
      .from('deficits_fonciers_reportes')
      .select('*')
      .eq('user_id', user.id)
      .order('annee_origine', { ascending: true });
    if (error) throw error;
    return (data || []) as DeficitFoncierReporteRecord[];
  },

  async create(deficit: {
    annee_origine: number;
    type: TypeDeficitFoncierReporte;
    montant_initial: number;
    montant_restant: number;
    commentaire?: string | null;
  }): Promise<DeficitFoncierReporteRecord> {
    const user = await requireUser();
    const { data, error } = await supabase
      .from('deficits_fonciers_reportes')
      .insert({ ...deficit, user_id: user.id })
      .select()
      .single();
    if (error) throw error;
    return data as DeficitFoncierReporteRecord;
  },

  async update(
    id: string,
    changes: Partial<Pick<DeficitFoncierReporteRecord, 'annee_origine' | 'type' | 'montant_initial' | 'montant_restant' | 'commentaire'>>,
  ): Promise<DeficitFoncierReporteRecord> {
    const user = await requireUser();
    const { data, error } = await supabase
      .from('deficits_fonciers_reportes')
      .update(changes)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) throw error;
    return data as DeficitFoncierReporteRecord;
  },

  async delete(id: string): Promise<void> {
    const user = await requireUser();
    const { error } = await supabase
      .from('deficits_fonciers_reportes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw error;
  },

  /**
   * Applique le résultat d'une simulation (ConsommationDeficitReporte[] de
   * computeFoyerFoncier) au stock persisté : met à jour montant_restant pour
   * chaque ligne consommée, et ajoute deux nouvelles lignes pour le déficit
   * généré cette année (hors intérêts / intérêts) si applicable. Action
   * explicite déclenchée par l'utilisateur (bouton dédié), jamais automatique.
   */
  async reporterAlAnneeSuivante(params: {
    consommation: { id?: string; montantRestantApres: number }[];
    anneeCourante: number;
    nouveauDeficitHorsInterets: number;
    nouveauDeficitInterets: number;
  }): Promise<void> {
    const user = await requireUser();
    const { consommation, anneeCourante, nouveauDeficitHorsInterets, nouveauDeficitInterets } = params;

    for (const c of consommation) {
      if (!c.id) continue;
      const { error } = await supabase
        .from('deficits_fonciers_reportes')
        .update({ montant_restant: c.montantRestantApres })
        .eq('id', c.id)
        .eq('user_id', user.id);
      if (error) throw error;
    }

    const nouvellesLignes: {
      user_id: string;
      annee_origine: number;
      type: TypeDeficitFoncierReporte;
      montant_initial: number;
      montant_restant: number;
    }[] = [];
    if (nouveauDeficitHorsInterets > 0) {
      nouvellesLignes.push({
        user_id: user.id,
        annee_origine: anneeCourante,
        type: 'hors_interets',
        montant_initial: nouveauDeficitHorsInterets,
        montant_restant: nouveauDeficitHorsInterets,
      });
    }
    if (nouveauDeficitInterets > 0) {
      nouvellesLignes.push({
        user_id: user.id,
        annee_origine: anneeCourante,
        type: 'interets',
        montant_initial: nouveauDeficitInterets,
        montant_restant: nouveauDeficitInterets,
      });
    }
    if (nouvellesLignes.length > 0) {
      const { error } = await supabase.from('deficits_fonciers_reportes').insert(nouvellesLignes);
      if (error) throw error;
    }
  },
};

export function toDeficitFoncierReporte(record: DeficitFoncierReporteRecord): DeficitFoncierReporte {
  return {
    id: record.id,
    anneeOrigine: record.annee_origine,
    type: record.type,
    montantRestant: record.montant_restant,
  };
}
