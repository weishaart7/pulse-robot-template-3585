import { supabase } from '@/integrations/supabase/client';

export type ScenarioRegimeType = 'realise' | 'envisage';

export interface ScenarioRegime {
  id?: string;
  user_id?: string;
  type: ScenarioRegimeType;
  regime_cible: string;
  date: string;
  motivation_civile?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const scenarioRegimeService = {
  async getScenariosRegime(): Promise<ScenarioRegime[]> {
    const { data, error } = await supabase
      .from('scenarios_regime')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;
    return (data || []) as unknown as ScenarioRegime[];
  },

  async createScenarioRegime(scenario: Omit<ScenarioRegime, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<ScenarioRegime> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('scenarios_regime')
      .insert({ ...scenario, user_id: user.id } as unknown as never)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as ScenarioRegime;
  },

  async deleteScenarioRegime(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Verify user owns this scenario before deleting
    const { data: existingScenario } = await supabase
      .from('scenarios_regime')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!existingScenario || existingScenario.user_id !== user.id) {
      throw new Error('Unauthorized: Scenario not found or access denied');
    }

    const { error } = await supabase
      .from('scenarios_regime')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
