import { useState, useEffect } from 'react';
import { scenarioRegimeService, ScenarioRegime } from '@/services/scenarioRegimeService';
import { toast } from '@/hooks/use-toast';

export const useScenariosRegime = () => {
  const [scenariosRegime, setScenariosRegime] = useState<ScenarioRegime[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchScenariosRegime = async () => {
    try {
      setLoading(true);
      const data = await scenarioRegimeService.getScenariosRegime();
      setScenariosRegime(data);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les scénarios de changement de régime",
        variant: "destructive",
      });
      console.error('Error fetching scenarios regime:', error);
    } finally {
      setLoading(false);
    }
  };

  const createScenarioRegime = async (scenario: Omit<ScenarioRegime, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const newScenario = await scenarioRegimeService.createScenarioRegime(scenario);
      setScenariosRegime(prev => [newScenario, ...prev]);
      toast({
        title: "Succès",
        description: "Scénario de changement de régime ajouté avec succès",
      });
      return newScenario;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le scénario de changement de régime",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteScenarioRegime = async (id: string) => {
    try {
      await scenarioRegimeService.deleteScenarioRegime(id);
      setScenariosRegime(prev => prev.filter(s => s.id !== id));
      toast({
        title: "Succès",
        description: "Scénario de changement de régime supprimé avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le scénario de changement de régime",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchScenariosRegime();
  }, []);

  return {
    scenariosRegime,
    loading,
    fetchScenariosRegime,
    createScenarioRegime,
    deleteScenarioRegime
  };
};
