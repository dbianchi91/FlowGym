import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { getUserProfile, getWeeklyCheckIns, getAverageCheckInHour } from '../data/database';
import { generateContextualMessage, AiContext } from './aiService';
import i18next from 'i18next';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export async function setupDailyNotification() {
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#3B82F6',
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('Permessi notifiche negati.');
            return;
        }

        // Cancel all previous scheduled notifications to avoid duplicates
        await Notifications.cancelAllScheduledNotificationsAsync();

        try {
            const t = i18next.t.bind(i18next);
            const profile = await getUserProfile();
            const userName = profile?.name ? ` ${profile.name}` : '';

            const records = await getWeeklyCheckIns();
            const todayStr = new Date().toISOString().split('T')[0];
            const hasCheckedInToday = records.length > 0 && records[0].date === todayStr;

            // Detect recent struggles for empathic tone
            let recentStruggles: 'mood' | 'sleep' | 'energy' | 'none' = 'none';
            if (records.length >= 2) {
                const last = records.slice(0, Math.min(3, records.length));
                if (last.every(r => r.mood <= 2)) recentStruggles = 'mood';
                else if (last.every(r => r.sleep <= 2)) recentStruggles = 'sleep';
                else if (last.every(r => r.energy <= 2)) recentStruggles = 'energy';
            }

            const baseCtx: AiContext = {
                name: profile?.name || '',
                level: profile?.level || 1,
                streak: records.length,
                streakTarget: profile?.streak_target || 7,
                todayCheckIn: hasCheckedInToday ? records[0] : null,
                recentStruggles,
                weeklyAvg: { energy: 3, mood: 3, focus: 3, sleep: 3, drive: 3 },
                weeklyTrend: { energy: 0, mood: 0, focus: 0, sleep: 0, drive: 0 },
                lastSkillStatus: 'none',
                timeSlot: 'morning',
                lang: 'it'
            };

            if (records.length > 0) {
                baseCtx.weeklyAvg = {
                    energy: records.reduce((s, c) => s + c.energy, 0) / records.length,
                    mood: records.reduce((s, c) => s + c.mood, 0) / records.length,
                    focus: records.reduce((s, c) => s + c.focus, 0) / records.length,
                    sleep: records.reduce((s, c) => s + c.sleep, 0) / records.length,
                    drive: records.reduce((s, c) => s + c.drive, 0) / records.length,
                };
            }

            const msgMorning = generateContextualMessage({ ...baseCtx, timeSlot: 'morning' });
            const msgLunch = generateContextualMessage({ ...baseCtx, timeSlot: 'lunch' });
            const msgEvening = generateContextualMessage({ ...baseCtx, timeSlot: 'evening' });

            // Morning Notification (8:00 AM)
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: `☀️ ${msgMorning.title}`,
                    body: msgMorning.message,
                    sound: true,
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DAILY,
                    hour: 8,
                    minute: 0,
                } as Notifications.DailyTriggerInput,
            });

            // Lunch Notification (13:30 PM)
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: `⚡ ${msgLunch.title}`,
                    body: msgLunch.message,
                    sound: true,
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DAILY,
                    hour: 13,
                    minute: 30,
                } as Notifications.DailyTriggerInput,
            });

            // "Missing Check-In" Adaptive Reminder — uses avg check-in time minus 30 min, default 18:30
            if (!hasCheckedInToday) {
                let reminderHour = 18;
                let reminderMinute = 30;

                const avgHour = await getAverageCheckInHour();
                if (avgHour !== null && avgHour >= 8 && avgHour <= 22) {
                    // Schedule 30 min before their usual check-in time
                    const adjustedHour = avgHour - 0.5;
                    reminderHour = Math.floor(adjustedHour);
                    reminderMinute = Math.round((adjustedHour - reminderHour) * 60);
                }

                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: t('notifications.missing_checkin_title', { name: userName.trim(), defaultValue: `🚨 Ehi${userName}, manca il tuo check-in!` }),
                        body: t('notifications.missing_checkin_body', { defaultValue: 'Non interrompere la tua streak. Dedica 5 minuti a te stesso prima di sera.' }),
                        sound: true,
                    },
                    trigger: {
                        type: Notifications.SchedulableTriggerInputTypes.DAILY,
                        hour: reminderHour,
                        minute: reminderMinute,
                    } as Notifications.DailyTriggerInput,
                });

                console.log(`Backup reminder programmato per le ${reminderHour}:${String(reminderMinute).padStart(2, '0')}`);
            }

            // Evening Notification (21:00 PM)
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: `🌙 ${msgEvening.title}`,
                    body: msgEvening.message,
                    sound: true,
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DAILY,
                    hour: 21,
                    minute: 0,
                } as Notifications.DailyTriggerInput,
            });

            console.log("Notifiche giornaliere programmate (08:00, 13:30, adaptive backup, 21:00)");
        } catch (e) {
            console.log("Errore durante la programmazione delle notifiche", e);
        }
    } else {
        console.log('Must use physical device for Push Notifications');
    }
}
