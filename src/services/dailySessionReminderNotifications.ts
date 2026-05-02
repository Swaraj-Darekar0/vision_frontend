import * as Notifications from 'expo-notifications';
import dayjs from 'dayjs';
import {
  ensureVisionNotificationChannel,
  getVisionNotificationSound,
  markVisionNotificationSoundUnavailable,
} from './notificationSound';

const REMINDER_PREFIX = 'vision.daily-session-reminder';
const REMINDER_CHANNEL_ID = 'daily-session-reminders-pop-v1';

type ReminderSlot = {
  hour: number;
  minute: number;
  title: string;
  body: (remainingCount: number) => string;
};

const REMINDER_SLOTS: ReminderSlot[] = [
  {
    hour: 18,
    minute: 0,
    title: 'Your sessions are still waiting',
    body: (remainingCount) =>
      `You still have ${formatSessionCount(remainingCount)} left today. Open Vision and record one before the day slips away.`,
  },
  {
    hour: 21,
    minute: 0,
    title: 'Do not leave today unfinished',
    body: (remainingCount) =>
      `You told yourself today mattered. ${formatSessionCount(remainingCount, true)} still untouched. Open Vision and get one done.`,
  },
  {
    hour: 23,
    minute: 0,
    title: 'Last call for today',
    body: (remainingCount) =>
      `Leaving ${formatSessionCount(remainingCount)} blank tonight means tomorrow starts with a debt. Open Vision and record now.`,
  },
];

function formatSessionCount(count: number, sentenceStart = false) {
  const label = count === 1 ? 'session is' : 'sessions are';
  const phrase = `${count} ${label}`;
  return sentenceStart ? phrase.charAt(0).toUpperCase() + phrase.slice(1) : phrase;
}

function reminderId(userId: string, dateKey: string, hour: number) {
  return `${REMINDER_PREFIX}.${userId}.${dateKey}.${hour}`;
}

async function ensureNotificationPermission() {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted || existing.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function cancelDailySessionReminders(userId: string) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const prefix = `${REMINDER_PREFIX}.${userId}.`;

  await Promise.all(
    scheduled
      .filter((notification) => notification.identifier.startsWith(prefix))
      .map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier)),
  );
}

export async function scheduleDailySessionReminders({
  userId,
  remainingTodayCount,
}: {
  userId: string;
  remainingTodayCount: number;
}) {
  await cancelDailySessionReminders(userId);

  if (remainingTodayCount <= 0) {
    return;
  }

  const hasPermission = await ensureNotificationPermission();
  if (!hasPermission) {
    return;
  }

  await ensureVisionNotificationChannel(REMINDER_CHANNEL_ID, 'Daily session reminders');

  const now = dayjs();
  const dateKey = now.format('YYYY-MM-DD');

  await Promise.all(
    REMINDER_SLOTS.map(async (slot) => {
      const triggerAt = now.hour(slot.hour).minute(slot.minute).second(0).millisecond(0);
      if (!triggerAt.isAfter(now)) {
        return;
      }

      const request: Notifications.NotificationRequestInput = {
        identifier: reminderId(userId, dateKey, slot.hour),
        content: {
          title: slot.title,
          body: slot.body(remainingTodayCount),
          sound: getVisionNotificationSound(),
          data: {
            type: 'daily_session_reminder',
            userId,
            remainingTodayCount,
            date: dateKey,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerAt.toDate(),
          channelId: REMINDER_CHANNEL_ID,
        },
      };

      try {
        await Notifications.scheduleNotificationAsync(request);
      } catch (error) {
        markVisionNotificationSoundUnavailable(error);
        await Notifications.scheduleNotificationAsync({
          ...request,
          content: {
            ...request.content,
            sound: true,
          },
        });
      }
    }),
  );
}
