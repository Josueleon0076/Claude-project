import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { dueMs, todayKey } from '../logic/dates';
import { occurrencesOn } from '../logic/occurrences';
import {
  ACTION_COMPLETE,
  ACTION_SNOOZE,
  rescheduleReminders,
  setBadge,
  setupNotifications,
} from '../logic/notifications';
import { sampleTasks } from './sample';

const TASKS_KEY = 'agenda.tasks.v1';
const SETTINGS_KEY = 'agenda.settings.v1';
export const DEFAULT_SETTINGS = { nagMinutes: 5, preAlertMinutes: 0 };

const TasksContext = createContext(null);

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

function setOcc(task, key, patch) {
  const prev = task.occ?.[key] || {};
  const next = { ...prev, ...patch };
  for (const k of Object.keys(next)) if (next[k] == null) delete next[k];
  const occ = { ...(task.occ || {}) };
  if (Object.keys(next).length) occ[key] = next;
  else delete occ[key];
  return { ...task, occ };
}

export function TasksProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [permission, setPermission] = useState('unknown');
  const [now, setNow] = useState(Date.now());
  const [focusRequest, setFocusRequest] = useState(null);
  const latest = useRef({ tasks, settings });
  latest.current = { tasks, settings };

  // Carga inicial.
  useEffect(() => {
    (async () => {
      try {
        const [t, s] = await Promise.all([AsyncStorage.getItem(TASKS_KEY), AsyncStorage.getItem(SETTINGS_KEY)]);
        if (t) setTasks(JSON.parse(t));
        if (s) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(s) });
      } finally {
        setLoaded(true);
      }
      setPermission(await setupNotifications());
    })();
  }, []);

  // Reloj interno para que los "vencida hace X min" se actualicen solos.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 20000);
    return () => clearInterval(id);
  }, []);

  // Guardar y reprogramar avisos en cada cambio.
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    const handle = setTimeout(() => rescheduleReminders(tasks, settings), 400);
    return () => clearTimeout(handle);
  }, [tasks, settings, loaded]);

  // Al volver a la app se renueva la ventana de avisos programados.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      setNow(Date.now());
      if (latest.current && loaded) rescheduleReminders(latest.current.tasks, latest.current.settings);
    });
    return () => sub.remove();
  }, [loaded]);

  const overdueToday = useMemo(
    () => occurrencesOn(tasks, todayKey()).filter((o) => !o.doneAt && o.due <= now).length,
    [tasks, now]
  );
  useEffect(() => {
    setBadge(overdueToday);
  }, [overdueToday]);

  const addTask = useCallback((data) => {
    setTasks((ts) => [...ts, { ...data, id: newId(), occ: {}, createdAt: Date.now() }]);
  }, []);

  const updateTask = useCallback((id, data) => {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...data } : t)));
  }, []);

  const deleteTask = useCallback((id) => {
    setTasks((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const skipOccurrence = useCallback((id, key) => {
    setTasks((ts) => ts.map((t) => (t.id === id ? setOcc(t, key, { skipped: true }) : t)));
  }, []);

  const setDone = useCallback((id, key, done) => {
    setTasks((ts) =>
      ts.map((t) => (t.id === id ? setOcc(t, key, { doneAt: done ? Date.now() : null, snoozeUntil: null }) : t))
    );
  }, []);

  const snooze = useCallback((id, key, minutes) => {
    setTasks((ts) =>
      ts.map((t) => {
        if (t.id !== id) return t;
        const base = Math.max(Date.now(), dueMs(key, t.time));
        return setOcc(t, key, { snoozeUntil: base + minutes * 60000 });
      })
    );
  }, []);

  const loadSample = useCallback((key) => {
    setTasks((ts) => [...ts, ...sampleTasks(key).map((t) => ({ ...t, id: newId(), occ: {}, createdAt: Date.now() }))]);
  }, []);

  const updateSettings = useCallback((patch) => setSettings((s) => ({ ...s, ...patch })), []);

  // Botones "Completada" / "Posponer" desde la notificación.
  useEffect(() => {
    if (!loaded || Platform.OS === 'web') return;
    const handle = (response) => {
      if (!response) return;
      const { taskId, key } = response.notification.request.content.data || {};
      if (response.actionIdentifier === ACTION_COMPLETE && taskId) setDone(taskId, key, true);
      else if (response.actionIdentifier === ACTION_SNOOZE && taskId) snooze(taskId, key, 15);
      else setFocusRequest({ key: key || todayKey(), at: Date.now() });
      Notifications.clearLastNotificationResponse();
    };
    handle(Notifications.getLastNotificationResponse());
    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    return () => sub.remove();
  }, [loaded, setDone, snooze]);

  const value = {
    tasks,
    settings,
    loaded,
    permission,
    now,
    focusRequest,
    addTask,
    updateTask,
    deleteTask,
    skipOccurrence,
    setDone,
    snooze,
    loadSample,
    updateSettings,
    refreshPermission: async () => setPermission(await setupNotifications()),
  };
  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks() {
  return useContext(TasksContext);
}
