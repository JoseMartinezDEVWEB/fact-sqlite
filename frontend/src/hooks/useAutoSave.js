import { useState, useEffect, useCallback, useRef } from 'react';

export function useAutoSave(key, data, delay = 2000) {
  const STORAGE_KEY = `autosave_${key}`;
  const [hasSavedData, setHasSavedData] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== null;
    } catch {
      return false;
    }
  });
  const timerRef = useRef(null);
  const prevDataRef = useRef(data);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (data === prevDataRef.current) return;
    prevDataRef.current = data;
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        setHasSavedData(true);
      } catch { /* quota exceeded, ignore */ }
    }, delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [data, delay, STORAGE_KEY]);

  const getSavedData = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, [STORAGE_KEY]);

  const clearSave = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setHasSavedData(false);
      prevDataRef.current = null;
    } catch { /* ignore */ }
  }, [STORAGE_KEY]);

  return { hasSavedData, getSavedData, clearSave };
}
