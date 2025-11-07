import { supabase } from '@/integrations/supabase/client';
import { secureService } from './secureService';
import { sanitizeObject } from '@/lib/security';

export interface Societe {
  id: string;
  user_id: string;
  denomination: string;
  type_societe: string;
  date_creation?: string;
  valeur_estimee?: number;
  pourcentage_ifi?: number;
  capital_social?: number;
  nombre_titres?: number;
  nombre_salaries?: number;
  jour_cloture?: string;
  mois_cloture?: string;
  siret?: string;
  rue_adresse?: string;
  code_postal?: string;
  commune?: string;
  pays?: string;
  type_activite?: string;
  regime_fiscal?: string;
  valeur_ifi?: number;
  activite?: string;
  holding?: string;
  forme_societe_civile?: string;
  created_at?: string;
  updated_at?: string;
}

export const societeService = {
  async getAll(): Promise<Societe[]> {
    const { user } = await secureService.getCurrentUserSecure();
    if (!user) return [];

    const { data, error } = await supabase
      .from('societes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Log access to sensitive financial data
    await secureService.logFinancialDataAccess(user.id, 'societes', data?.length);
    
    return data || [];
  },

  async getById(id: string): Promise<Societe> {
    const { user } = await secureService.getCurrentUserSecure();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('societes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    
    // Log access to sensitive financial data
    await secureService.logFinancialDataAccess(user.id, 'societes', 1);
    
    return data;
  },

  async create(societe: Omit<Societe, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Societe> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Sanitize input data
    const sanitizedSociete = sanitizeObject(societe);

    const { data, error } = await supabase
      .from('societes')
      .insert([{ ...sanitizedSociete, user_id: user.id }])
      .select()
      .single();

    if (error) throw error;
    
    // Log creation of sensitive financial data
    await secureService.logDataModification(user.id, 'societes', `Created new company: ${sanitizedSociete.denomination}`);
    
    return data;
  },

  async update(id: string, societe: Partial<Omit<Societe, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<Societe> {
    const { user } = await secureService.getCurrentUserSecure();
    if (!user) throw new Error('User not authenticated');

    // Sanitize input data
    const sanitizedSociete = sanitizeObject(societe);

    const { data, error } = await supabase
      .from('societes')
      .update(sanitizedSociete)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    // Log modification of sensitive financial data
    await secureService.logDataModification(user.id, 'societes', `Updated company: ${id}`);
    
    return data;
  },

  async delete(id: string): Promise<void> {
    const { user } = await secureService.getCurrentUserSecure();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('societes')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    // Log deletion of sensitive financial data
    await secureService.logDataModification(user.id, 'societes', `Deleted company: ${id}`);
  }
};