import { useCallback, useEffect, useRef, useState } from 'react';

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutoSaveOptions {
  delay?: number;
  savedDisplayDuration?: number;
}

/**
 * Sauvegarde automatique générique : débounce `save` quand `dependencies`
 * change, et expose `saveNow` pour un déclenchement immédiat (ex: onBlur,
 * qui annule le débounce en attente). Le statut 'saved' repasse seul à
 * 'idle' après `savedDisplayDuration` ; 'error' reste affiché tant qu'aucune
 * nouvelle sauvegarde n'a réussi (jamais d'échec silencieux).
 */
export function useAutoSave(
  save: () => Promise<boolean>,
  dependencies: unknown[],
  { delay = 1500, savedDisplayDuration = 2000 }: UseAutoSaveOptions = {}
) {
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const isInitialMount = useRef(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;

  const runSave = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setStatus('saving');
    const success = await saveRef.current();
    if (success) {
      setStatus('saved');
      if (savedResetRef.current) clearTimeout(savedResetRef.current);
      savedResetRef.current = setTimeout(() => setStatus('idle'), savedDisplayDuration);
    } else {
      setStatus('error');
    }
  }, [savedDisplayDuration]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(runSave, delay);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (savedResetRef.current) clearTimeout(savedResetRef.current);
    };
  }, []);

  const saveNow = useCallback(() => {
    runSave();
  }, [runSave]);

  return { status, saveNow };
}
