import { useState, useEffect } from 'react';
import { societeService, Societe } from '@/services/societeService';
import { useToast } from '@/hooks/use-toast';

export const useSocietes = () => {
  const [societes, setSocietes] = useState<Societe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchSocietes = async () => {
    try {
      setIsLoading(true);
      const data = await societeService.getAll();
      setSocietes(data);
    } catch (error) {
      console.error('Error fetching societes:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les sociétés",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSocietes();
  }, []);

  return {
    societes,
    isLoading,
    refetch: fetchSocietes
  };
};
