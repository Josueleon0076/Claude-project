// Estado global del progreso: se carga del almacenamiento del teléfono,
// se actualiza con funciones puras de src/logic y se guarda tras cada cambio.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { LESSON_COUNTS } from '../content';
import { unlockNew } from '../logic/achievements';
import { clone, hydrate, initialState } from '../logic/progress';

const STORAGE_KEY = 'englishboost:progress:v1';

const ProgressContext = createContext(null);

export function ProgressProvider({ children }) {
  const [state, setState] = useState(null);
  const [newAchievements, setNewAchievements] = useState([]);
  const stateRef = useRef(null);

  useEffect(() => {
    (async () => {
      let saved = null;
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        saved = raw ? JSON.parse(raw) : null;
      } catch (e) {
        console.warn('No se pudo leer el progreso guardado', e);
      }
      const loaded = hydrate(saved);
      stateRef.current = loaded;
      setState(loaded);
    })();
  }, []);

  const persist = useCallback((next) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch((e) =>
      console.warn('No se pudo guardar el progreso', e),
    );
  }, []);

  /**
   * Aplica `producer(draft)` sobre una copia del estado, revisa logros y guarda.
   * Devuelve lo que devuelva el producer.
   */
  const update = useCallback(
    (producer) => {
      const draft = clone(stateRef.current);
      const result = producer(draft);
      const unlocked = unlockNew(draft, LESSON_COUNTS);
      stateRef.current = draft;
      setState(draft);
      persist(draft);
      if (unlocked.length) setNewAchievements((q) => [...q, ...unlocked]);
      return result;
    },
    [persist],
  );

  const reset = useCallback(() => {
    const fresh = initialState();
    stateRef.current = fresh;
    setState(fresh);
    persist(fresh);
  }, [persist]);

  const dismissAchievements = useCallback(() => setNewAchievements([]), []);

  const value = useMemo(
    () => ({ state, update, reset, newAchievements, dismissAchievements }),
    [state, update, reset, newAchievements, dismissAchievements],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress debe usarse dentro de <ProgressProvider>');
  return ctx;
}
