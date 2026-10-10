import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { inWorkHours, planReminders } from './reminderPlan';
import { pendingForReminders } from './occurrences';
import { todayKey } from './dates';

export const CHANNEL_ID = 'recordatorios';
export const ACTION_COMPLETE = 'COMPLETE';
export const ACTION_SNOOZE = 'SNOOZE_15';
const CATEGORY_SINGLE = 'task-single';

const supported = Platform.OS !== 'web';

// Mostrar el aviso aunque la app esté abierta.
if (supported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export async function setupNotifications() {
  if (!supported) return 'unsupported';

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Recordatorios de actividades',
      description: 'Avisos insistentes hasta completar cada actividad',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 400, 200, 400, 200, 400],
      lightColor: '#4338CA',
      sound: 'default',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      enableVibrate: true,
    });
  }

  await Notifications.setNotificationCategoryAsync(CATEGORY_SINGLE, [
    { identifier: ACTION_COMPLETE, buttonTitle: '✅ Completada', options: { opensAppToForeground: true } },
    { identifier: ACTION_SNOOZE, buttonTitle: '⏸ Posponer 15 min', options: { opensAppToForeground: true } },
  ]);

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  if (!current.canAskAgain) return 'denied';
  const asked = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: true },
  });
  return asked.granted ? 'granted' : 'denied';
}

// Las reprogramaciones se encadenan para que nunca corran dos a la vez.
let queue = Promise.resolve();

export function rescheduleReminders(tasks, settings) {
  if (!supported) return Promise.resolve(0);
  queue = queue.then(() => doReschedule(tasks, settings)).catch((e) => {
    console.warn('No se pudieron programar los recordatorios', e);
    return 0;
  });
  return queue;
}

async function doReschedule(tasks, settings) {
  const now = Date.now();
  const plan = planReminders(pendingForReminders(tasks, todayKey()), {
    now,
    nagMinutes: settings.nagMinutes,
    preAlertMinutes: settings.preAlertMinutes,
    isWorkTime: settings.quietEnabled ? (ms) => inWorkHours(ms, settings) : undefined,
    // iOS permite como máximo 64 notificaciones programadas por app.
    limit: Platform.OS === 'ios' ? 60 : 150,
  });

  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const n of plan) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: n.title,
        body: n.body,
        data: n.data,
        sound: 'default',
        badge: n.overdueCount,
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 400, 200, 400],
        categoryIdentifier: n.single ? CATEGORY_SINGLE : undefined,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.at, channelId: CHANNEL_ID },
    });
  }
  return plan.length;
}

export async function setBadge(count) {
  if (!supported) return;
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch {
    // Algunos lanzadores de Android no soportan insignias.
  }
}

export async function sendTestNotification() {
  if (!supported) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🔔 Notificación de prueba',
      body: 'Así se verán los recordatorios de tus actividades.',
      sound: 'default',
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3, channelId: CHANNEL_ID },
  });
}
