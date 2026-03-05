import { CheckInRecord } from '../data/database';
import i18next from 'i18next';

export type AiMessage = {
    title: string;
    message: string;
    ctaLabel: string;
    ctaAction: 'startSkill' | 'openCheckIn' | 'openActivities' | 'none';
};

export type AiContext = {
    name: string;
    level: number;
    streak: number;
    streakTarget: number;
    todayCheckIn: CheckInRecord | null;
    recentStruggles: 'mood' | 'sleep' | 'energy' | 'none';
    weeklyAvg: { energy: number; mood: number; focus: number; sleep: number; drive: number };
    weeklyTrend: { energy: number; mood: number; focus: number; sleep: number; drive: number };
    lastSkillStatus: 'completed' | 'postponed' | 'skipped' | 'none';
    timeSlot: 'morning' | 'lunch' | 'evening' | 'night';
    lang: string;
};

type Tone = 'gentle' | 'coach' | 'energetic' | 'calm' | 'balanced' | 'empathic';

export const buildTimeSlot = (): 'morning' | 'lunch' | 'evening' | 'night' => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'lunch';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night';
};

export const selectTone = (ctx: AiContext): Tone => {
    if (ctx.recentStruggles && ctx.recentStruggles !== 'none') return 'empathic';
    if (ctx.todayCheckIn && ctx.todayCheckIn.mood <= 2) return 'gentle';
    if (ctx.streak >= ctx.streakTarget && ctx.streak > 0) return 'coach';
    if (ctx.todayCheckIn && ctx.todayCheckIn.energy >= 4) return 'energetic';
    if (ctx.todayCheckIn && ctx.todayCheckIn.sleep <= 2 && (ctx.timeSlot === 'evening' || ctx.timeSlot === 'night')) return 'calm';
    return 'balanced';
};

export const generateContextualMessage = (ctx: AiContext): AiMessage => {
    const tone = selectTone(ctx);
    const t = i18next.t.bind(i18next);

    // Provide default fallback variables
    const vars = {
        name: ctx.name || t('home.champion', { defaultValue: 'Campione' }),
        streak: ctx.streak,
        target: ctx.streakTarget,
        moodAvg: Math.round(ctx.weeklyAvg.mood * 10) / 10 || 3,
        energyAvg: Math.round(ctx.weeklyAvg.energy * 10) / 10 || 3,
        sleepAvg: Math.round(ctx.weeklyAvg.sleep * 10) / 10 || 3,
        energyDelta: Math.round(ctx.weeklyTrend.energy * 10) / 10 || 0,
    };

    // We select a random variant from 1 to 3 for each tone and timeSlot combination.
    // In our i18n, we will define keys like: ai.gentle.morning.1.title
    const variant = Math.floor(Math.random() * 3) + 1; // 1, 2 or 3

    // Fallback if the specific timeSlot variant doesn't exist? i18next handles fallbacks or we use a general one.
    // For simplicity, we define a solid base in JSON.
    const keyPrefix = `ai.${tone}.${ctx.timeSlot}.${variant}`;

    // Read values, providing safe minimal default inline if missing
    let title = t(`${keyPrefix}.title`, { ...vars, defaultValue: t(`ai.${tone}.general.title`, { ...vars, defaultValue: 'FlowGym' }) });
    let message = t(`${keyPrefix}.message`, { ...vars, defaultValue: t(`ai.${tone}.general.message`, { ...vars, defaultValue: 'Pronto per il tuo prossimo step?' }) });
    let ctaLabel = t(`${keyPrefix}.ctaLabel`, { ...vars, defaultValue: t(`ai.${tone}.general.ctaLabel`, { ...vars, defaultValue: 'Inizia' }) });

    // Determine action based on tone/context
    let ctaAction: 'startSkill' | 'openCheckIn' | 'openActivities' | 'none' = 'openActivities';
    if (!ctx.todayCheckIn) {
        ctaAction = 'openCheckIn';
        ctaLabel = t('ai.global.checkin_cta', { defaultValue: 'Fai il Check-In' });
        title = t('ai.global.checkin_title', { name: vars.name, defaultValue: `Buon momento, ${vars.name}` });
        message = t('ai.global.checkin_msg', { defaultValue: 'Inizia la tua sessione dicendomi come ti senti oggi.' });
    } else {
        // If they did checkin, let's point them to activities or a pending skill if that was managed globally
        ctaAction = 'openActivities';
    }

    return { title, message, ctaLabel, ctaAction };
};

// Legacy fallback wrapper just in case (mainly used by SkillScreen currently)
export const generatePersonalizedMessage = async (energy: number, mood: number, focus: number): Promise<string> => {
    const t = i18next.t.bind(i18next);
    if (mood <= 2) return t('ai_legacy.mood_low', { defaultValue: "Notiamo livelli sub-ottimali di dopamina oggi. Sii gentile con te stesso e procedi per piccoli passi." });
    if (energy <= 2) return t('ai_legacy.energy_low', { defaultValue: "Rileviamo esaurimento energetico. Questa azione ridurrà il battito cardiaco senza spesa extra." });
    if (focus <= 2) return t('ai_legacy.focus_low', { defaultValue: "Scatter cognitivo rilevato. Questa micro-skill clinica ti aiuterà a riancorare l'attenzione." });
    if (mood >= 4 && energy >= 4) return t('ai_legacy.high', { defaultValue: "Ottimi indicatori! Sei pronto per il 'Deep Work'. Sfrutta il momento." });

    return t('ai_legacy.balanced', { defaultValue: "Equilibrio omeostatico ottimale. Mantieni questa frequenza con una pratica di mantenimento." });
};

export const getDynamicCheckInPrompt = (recentRecords: CheckInRecord[]): string => {
    const t = i18next.t.bind(i18next);
    if (recentRecords.length === 0) return t('checkin.prompt_default', { defaultValue: "Come ti senti oggi?" });

    const yesterdayStr = new Date();
    yesterdayStr.setDate(yesterdayStr.getDate() - 1);
    const yestIso = yesterdayStr.toISOString().split('T')[0];

    const yesterdayRecord = recentRecords.find(r => r.date === yestIso);

    if (yesterdayRecord) {
        if (yesterdayRecord.sleep <= 2) return t('checkin.prompt_sleep_recovery', { defaultValue: "Hai riposato meglio stanotte?" });
        if (yesterdayRecord.mood <= 2) return t('checkin.prompt_mood_recovery', { defaultValue: "Ieri è stata dura. Come va oggi l'umore?" });
        if (yesterdayRecord.energy >= 4) return t('checkin.prompt_energy_streak', { defaultValue: "Ieri avevi un'ottima energia! Ha tenuto botta?" });
    }

    return t('checkin.prompt_default', { defaultValue: "Come ti senti oggi?" });
};
