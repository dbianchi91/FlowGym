import { getCheckInsByRange } from '../data/database';
import { formatToItalianDate } from './dateUtils';

export type WeeklyInsight = {
    key: string;        // i18n key like 'insights.trend_up'
    icon: string;
    params: Record<string, string | number>;
};

const getDayName = (dateStr: string, lang: string): string => {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = { weekday: 'long' };
    return new Intl.DateTimeFormat(lang, options).format(date);
};

export async function generateWeeklyInsights(lang: string = 'it'): Promise<WeeklyInsight[]> {
    // Need at least 14 days to do a proper trend comparison (last 7 vs previous 7)
    const allRecords = await getCheckInsByRange(14);

    // Sort chronological: oldest to newest
    const sorted = [...allRecords].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (sorted.length < 3) {
        return []; // Not enough data
    }

    const recent = sorted.slice(-7);
    const previous = sorted.slice(0, Math.max(0, sorted.length - 7));

    const insights: WeeklyInsight[] = [];

    // 1. Averages
    const avgRecentEnergy = recent.reduce((sum, r) => sum + r.energy, 0) / recent.length;
    const avgRecentMood = recent.reduce((sum, r) => sum + r.mood, 0) / recent.length;
    const avgRecentFocus = recent.reduce((sum, r) => sum + r.focus, 0) / recent.length;
    const avgRecentSleep = recent.reduce((sum, r) => sum + r.sleep, 0) / recent.length;

    // 2. Trend (Energy)
    if (previous.length >= 3) {
        const avgPrevEnergy = previous.reduce((sum, r) => sum + r.energy, 0) / previous.length;
        const deltaEnergy = avgRecentEnergy - avgPrevEnergy;

        if (deltaEnergy >= 0.5) {
            insights.push({
                key: 'insights.trend_up',
                icon: '📈',
                params: { metric: 'Energy', delta: Math.round(deltaEnergy * 10) / 10 }
            });
        } else if (deltaEnergy <= -0.5) {
            insights.push({
                key: 'insights.trend_down',
                icon: '📉',
                params: { metric: 'Energy', delta: Math.abs(Math.round(deltaEnergy * 10) / 10), category: 'Movimento' }
            });
        }
    }

    // 3. Best/Worst Day
    if (recent.length >= 4) {
        let bestDay = recent[0];
        let worstDay = recent[0];
        let maxScore = -1;
        let minScore = 30;

        for (const r of recent) {
            const sum = r.energy + r.mood + r.focus + r.sleep + r.drive;
            if (sum > maxScore) { maxScore = sum; bestDay = r; }
            if (sum < minScore) { minScore = sum; worstDay = r; }
        }

        insights.push({
            key: 'insights.best_day',
            icon: '🏆',
            params: { day: getDayName(bestDay.date, lang) }
        });

        // Only show worst day if it's really bad (average < 2.5)
        if (minScore / 5 < 2.5) {
            insights.push({
                key: 'insights.worst_day',
                icon: '⚠️',
                params: { day: getDayName(worstDay.date, lang), metric: 'Media', value: Math.round((minScore / 5) * 10) / 10 }
            });
        }
    }

    // 4. Sleep -> Focus correlation
    // People with bad sleep and bad focus
    const badSleepDays = recent.filter(r => r.sleep <= 2);
    if (badSleepDays.length >= 2) {
        const avgFocusOnBadSleep = badSleepDays.reduce((sum, r) => sum + r.focus, 0) / badSleepDays.length;
        if (avgFocusOnBadSleep <= 2.5) {
            insights.push({
                key: 'insights.correlation',
                icon: '💡',
                params: { metric1: 'Sonno', threshold: 3, metric2: 'Focus' }
            });
        }
    }

    return insights.slice(0, 4); // Max 4 insights
}
