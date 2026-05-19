import { useState, useEffect, useCallback } from 'react';
import {
  societeBilanService, SocieteBilan,
  societeAssocieService, SocieteAssocie,
  societePacteService, SocietePacte,
  societeCCAService, SocieteCCA,
  societeDutreilService, SocieteDutreil,
} from '@/services/societeExtendedService';

export const useSocieteBilans = (societeId: string | null) => {
  const [bilans, setBilans] = useState<SocieteBilan[]>([]);
  const [loading, setLoading] = useState(false);
  const refetch = useCallback(async () => {
    if (!societeId) { setBilans([]); return; }
    setLoading(true);
    try { setBilans(await societeBilanService.list(societeId)); }
    finally { setLoading(false); }
  }, [societeId]);
  useEffect(() => { refetch(); }, [refetch]);
  return { bilans, loading, refetch };
};

export const useSocieteAssocies = (societeId: string | null) => {
  const [associes, setAssocies] = useState<SocieteAssocie[]>([]);
  const [loading, setLoading] = useState(false);
  const refetch = useCallback(async () => {
    if (!societeId) { setAssocies([]); return; }
    setLoading(true);
    try { setAssocies(await societeAssocieService.list(societeId)); }
    finally { setLoading(false); }
  }, [societeId]);
  useEffect(() => { refetch(); }, [refetch]);
  return { associes, loading, refetch };
};

export const useSocietePacte = (societeId: string | null) => {
  const [pacte, setPacte] = useState<SocietePacte | null>(null);
  const [loading, setLoading] = useState(false);
  const refetch = useCallback(async () => {
    if (!societeId) { setPacte(null); return; }
    setLoading(true);
    try { setPacte(await societePacteService.get(societeId)); }
    finally { setLoading(false); }
  }, [societeId]);
  useEffect(() => { refetch(); }, [refetch]);
  return { pacte, loading, refetch };
};

export const useSocieteCCA = (societeId: string | null) => {
  const [cca, setCca] = useState<SocieteCCA[]>([]);
  const [loading, setLoading] = useState(false);
  const refetch = useCallback(async () => {
    if (!societeId) { setCca([]); return; }
    setLoading(true);
    try { setCca(await societeCCAService.list(societeId)); }
    finally { setLoading(false); }
  }, [societeId]);
  useEffect(() => { refetch(); }, [refetch]);
  return { cca, loading, refetch };
};

export const useSocieteDutreil = (societeId: string | null) => {
  const [dutreil, setDutreil] = useState<SocieteDutreil | null>(null);
  const [loading, setLoading] = useState(false);
  const refetch = useCallback(async () => {
    if (!societeId) { setDutreil(null); return; }
    setLoading(true);
    try { setDutreil(await societeDutreilService.get(societeId)); }
    finally { setLoading(false); }
  }, [societeId]);
  useEffect(() => { refetch(); }, [refetch]);
  return { dutreil, loading, refetch };
};
