import { useState, useEffect, useCallback } from 'react';
import { societeParticipationService, SocieteParticipation } from '@/services/societeParticipationService';

export const useSocieteParticipations = () => {
  const [participations, setParticipations] = useState<SocieteParticipation[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      setParticipations(await societeParticipationService.list());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { participations, loading, refetch };
};
