import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { Skill } from '../utils/ruleEngine';
import { addXP, getWeeklyCheckIns } from '../data/database';
import { useToast } from '../components/ToastProvider';
import { useTranslation } from 'react-i18next';

import extraActivitiesData from '../data/extra_skills.json';

// Extra activities always available — scientifically grounded
const EXTRA_ACTIVITIES: Skill[] = extraActivitiesData as Skill[];

export default function ActivitiesScreen({ navigation }: any) {
    const { t } = useTranslation();
    const [pendingSkill, setPendingSkill] = useState<{ skill: Skill; scores: any } | null>(null);
    const [hasCheckedInToday, setHasCheckedInToday] = useState<boolean>(true); // Default to true to avoid layout shift
    const isFocused = useIsFocused();
    const { showToast } = useToast();

    useEffect(() => {
        const loadStatus = async () => {
            // Check Daily Check-In
            const records = await getWeeklyCheckIns();
            const today = new Date().toISOString().split('T')[0];
            const checkedIn = records.length > 0 && records[0].date === today;
            setHasCheckedInToday(checkedIn);

            // Check for pending skill
            const pendingStr = await AsyncStorage.getItem('pendingSkill');
            if (pendingStr) {
                setPendingSkill(JSON.parse(pendingStr));
            } else {
                setPendingSkill(null);
            }
        };
        if (isFocused) loadStatus();
    }, [isFocused]);

    const handleStartActivity = (skill: Skill) => {
        navigation.navigate('SkillScreen', { skill, scores: { energy: 3, mood: 3, focus: 3, sleep: 3, drive: 3 } });
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 80, paddingTop: 16 }}>

            {/* Daily Microskill / Check-In Prompt */}
            {!hasCheckedInToday ? (
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>{t('activities.missing_checkin_label', { defaultValue: '📅 CHECK-IN MANCANTE' })}</Text>
                    <TouchableOpacity
                        style={styles.checkInCard}
                        onPress={() => navigation.navigate('CheckInFlow')}
                    >
                        <Text style={styles.checkInTitle}>{t('activities.start_checkin', { defaultValue: 'Inizia il Check-In' })}</Text>
                        <Text style={styles.checkInDesc}>{t('activities.checkin_desc', { defaultValue: 'Completa il monitoraggio di oggi per sbloccare la tua microskill personalizzata.' })}</Text>
                        <View style={styles.pendingFooter}>
                            <Text style={styles.pendingCta}>{t('activities.go_to_checkin', { defaultValue: 'Vai al Check-In →' })}</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            ) : pendingSkill ? (
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>{t('activities.pending_skill_label', { defaultValue: '🧘 MICRO-SKILL IN SOSPESO' })}</Text>
                    <TouchableOpacity
                        style={styles.pendingCard}
                        onPress={() => navigation.navigate('SkillScreen', { skill: pendingSkill.skill, scores: pendingSkill.scores })}
                    >
                        <Text style={styles.pendingCategory}>{t(`skills.${pendingSkill.skill.id}.category`, { defaultValue: pendingSkill.skill.category })}</Text>
                        <Text style={styles.pendingTitle}>{t(`skills.${pendingSkill.skill.id}.title`, { defaultValue: pendingSkill.skill.title })}</Text>
                        <Text style={styles.pendingDesc} numberOfLines={2}>{t(`skills.${pendingSkill.skill.id}.description`, { defaultValue: pendingSkill.skill.description })}</Text>
                        <View style={styles.pendingFooter}>
                            <Text style={styles.pendingDuration}>⏱ {pendingSkill.skill.duration_minutes} {t('activities.duration_min')}</Text>
                            <Text style={styles.pendingCta}>{t('activities.resume', { defaultValue: 'Riprendi →' })}</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            ) : null}

            {/* Extra Activities */}
            <View style={styles.section}>
                <Text style={styles.sectionLabel}>{t('activities.extra_label', { defaultValue: '✨ ATTIVITÀ EXTRA' })}</Text>
                <Text style={styles.sectionHint}>{t('activities.extra_hint', { defaultValue: "Scegli un'attività addizionale per guadagnare +15 XP" })}</Text>

                {EXTRA_ACTIVITIES.map(activity => (
                    <TouchableOpacity
                        key={activity.id}
                        style={styles.activityCard}
                        onPress={() => handleStartActivity(activity)}
                    >
                        <View style={styles.activityHeader}>
                            <Text style={styles.activityCategory}>{t(`skills.${activity.id}.category`, { defaultValue: activity.category })}</Text>
                            <Text style={styles.activityDuration}>⏱ {activity.duration_minutes} {t('activities.duration_min')}</Text>
                        </View>
                        <Text style={styles.activityTitle}>{t(`skills.${activity.id}.title`, { defaultValue: activity.title })}</Text>
                        <Text style={styles.activityDesc} numberOfLines={2}>{t(`skills.${activity.id}.description`, { defaultValue: activity.description })}</Text>
                        <View style={styles.activityFooter}>
                            <Text style={styles.xpBadge}>+15 XP</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111827', paddingHorizontal: 24 },
    section: { marginBottom: 28 },
    sectionLabel: { color: '#FCD34D', fontSize: 12, fontWeight: 'bold', letterSpacing: 1.5, marginBottom: 12 },
    sectionHint: { color: '#6B7280', fontSize: 13, marginBottom: 16 },

    pendingCard: {
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderWidth: 1,
        borderColor: '#FCD34D',
        borderRadius: 16,
        padding: 20,
    },
    pendingCategory: { color: '#FCD34D', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
    pendingTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
    pendingDesc: { color: '#D1D5DB', fontSize: 14, lineHeight: 20, marginBottom: 12 },
    pendingFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    pendingDuration: { color: '#9CA3AF', fontSize: 13 },
    pendingCta: { color: '#FCD34D', fontWeight: 'bold', fontSize: 14 },

    checkInCard: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 1,
        borderColor: '#10B981',
        borderRadius: 16,
        padding: 20,
    },
    checkInTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
    checkInDesc: { color: '#D1D5DB', fontSize: 14, lineHeight: 20, marginBottom: 12 },

    activityCard: {
        backgroundColor: '#1F2937',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#3B82F6',
    },
    activityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    activityCategory: { color: '#60A5FA', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
    activityDuration: { color: '#6B7280', fontSize: 12 },
    activityTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
    activityDesc: { color: '#9CA3AF', fontSize: 13, lineHeight: 18, marginBottom: 12 },
    activityFooter: { alignItems: 'flex-end' },
    xpBadge: { backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#60A5FA', fontSize: 12, fontWeight: 'bold', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
});
