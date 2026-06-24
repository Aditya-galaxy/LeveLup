// LevelUp local notifications scheduler.
// Daily 8pm incomplete-mission ping + 9pm streak risk.
// Permission requested lazily. Silently no-ops on web / Expo Go where unavailable.

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const REM_8PM_ID = "levelup-8pm";
const REM_9PM_ID = "levelup-9pm";

let configured = false;

async function ensureConfigured() {
  if (configured) return;
  configured = true;
  try {
    await Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  } catch {}
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    await ensureConfigured();
    const settings = await Notifications.getPermissionsAsync();
    if (settings.granted) return true;
    if (!settings.canAskAgain) return false;
    const req = await Notifications.requestPermissionsAsync();
    return !!req.granted;
  } catch {
    return false;
  }
}

/**
 * Schedule the two daily reminders. Caller passes whether they are needed.
 * If `incomplete` is false at 8pm, the ping still fires (we evaluate at send-time
 * with the app open or via a content variation). For simplicity we always schedule
 * both — content is generic.
 */
export async function scheduleDailyReminders(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await ensureConfigured();
    await cancelAllReminders();

    await Notifications.scheduleNotificationAsync({
      identifier: REM_8PM_ID,
      content: {
        title: "SYSTEM ALERT",
        body: "Mission window closes in 3 hours. Execute.",
        sound: false,
      },
      // @ts-expect-error trigger union — DAILY by hour/minute is supported on iOS/Android
      trigger: { hour: 20, minute: 0, repeats: true },
    });

    await Notifications.scheduleNotificationAsync({
      identifier: REM_9PM_ID,
      content: {
        title: "SYSTEM ALERT",
        body: "Streak at risk. Complete a primary mission to preserve multiplier.",
        sound: false,
      },
      // @ts-expect-error trigger union
      trigger: { hour: 21, minute: 0, repeats: true },
    });
  } catch (e) {
    // ignore — Expo Go on Android disallows scheduling in SDK 53+
  }
}

export async function cancelAllReminders(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelScheduledNotificationAsync(REM_8PM_ID);
  } catch {}
  try {
    await Notifications.cancelScheduledNotificationAsync(REM_9PM_ID);
  } catch {}
}

export async function fireRankUpAlert(toRank: string): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await ensureConfigured();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "RANK UP",
        body: `The System acknowledges. You are now ${toRank}-Class.`,
        sound: false,
      },
      trigger: null,
    });
  } catch {}
}
