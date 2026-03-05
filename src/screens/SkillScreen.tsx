import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { saveSkillHistory, addXP, recordSkillShown, recordSkillCompleted, recordSkillPostponed } from '../data/database';
import { generatePersonalizedMessage } from '../services/aiService';
import { Skill } from '../utils/ruleEngine';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import OptionModal from '../components/OptionModal';
import { useTranslation } from 'react-i18next';

const BDJ_IMAGES: Record<number, any> = {
    0: require('../assets/imgs/bdj/bdj_01_heaven.png'),
    1: require('../assets/imgs/bdj/bdj_02_bow.png'),
    2: require('../assets/imgs/bdj/bdj_03_separate.png'),
    3: require('../assets/imgs/bdj/bdj_04_lookback.png'),
    4: require('../assets/imgs/bdj/bdj_05_swing.png'),
    5: require('../assets/imgs/bdj/bdj_06_touchfeet.png'),
    6: require('../assets/imgs/bdj/bdj_07_fists.png'),
    7: require('../assets/imgs/bdj/bdj_08_tiptoes.png'),
};

export default function SkillScreen({ route, navigation }: any) {
    const { t } = useTranslation();
    const { skill, scores }: { skill: Skill, scores: any } = route.params;
    const [timeLeft, setTimeLeft] = useState<number>(skill.duration_minutes * 60);
    const [isActive, setIsActive] = useState<boolean>(false);
    const [isCompleted, setIsCompleted] = useState<boolean>(false);
    const [aiMessage, setAiMessage] = useState<string | null>(null);
    const [showPostponeModal, setShowPostponeModal] = useState(false);

    useEffect(() => {
        const loadAiText = async () => {
            const message = await generatePersonalizedMessage(
                scores?.energy || 3,
                scores?.mood || 3,
                scores?.focus || 3
            );
            setAiMessage(message);
            // Record skill presentation
            await recordSkillShown(skill.id);
        };
        loadAiText();
    }, []);

    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(time => time - 1);
            }, 1000);
        } else if (timeLeft === 0 && isActive) {
            setIsActive(false);
            setIsCompleted(true);
            if (interval) clearInterval(interval);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isActive, timeLeft]);

    const toggleTimer = () => setIsActive(!isActive);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleFinish = async () => {
        await saveSkillHistory(skill.id, isCompleted);
        if (isCompleted) {
            await recordSkillCompleted(skill.id);
            await addXP(25);
        }
        // Remove any pending skill since we did it
        await AsyncStorage.removeItem('pendingSkill');
        navigation.navigate('MainTabs');
    };

    const handlePostpone = () => {
        setShowPostponeModal(true);
    };

    const postponeSkill = async (minutes: number) => {
        // Telemetry update
        await recordSkillPostponed(skill.id);

        // Save skill to AsyncStorage so Home can show it
        await AsyncStorage.setItem('pendingSkill', JSON.stringify({ skill, scores }));

        // Schedule a reminder notification
        try {
            if (minutes === -1) {
                // Tonight at 20:00
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: t('skill.notification_title', { defaultValue: 'La tua Micro-Skill ti aspetta! 🧘' }),
                        body: t('skill.notification_body', { title: skill.title, defaultValue: `Hai rimandato "${skill.title}". È il momento di completarla!` }),
                        sound: true,
                    },
                    trigger: {
                        type: Notifications.SchedulableTriggerInputTypes.DAILY,
                        hour: 20,
                        minute: 0,
                    } as Notifications.DailyTriggerInput,
                });
            } else {
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: t('skill.notification_title', { defaultValue: 'La tua Micro-Skill ti aspetta! 🧘' }),
                        body: t('skill.notification_body', { title: skill.title, defaultValue: `Hai rimandato "${skill.title}". È il momento di completarla!` }),
                        sound: true,
                    },
                    trigger: {
                        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                        seconds: minutes * 60,
                        repeats: false,
                    } as Notifications.TimeIntervalTriggerInput,
                });
            }
        } catch (e) {
            console.log('Errore programmazione notifica reminder:', e);
        }

        navigation.navigate('MainTabs');
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.categoryBadge}>{t(`skills.${skill.id}.category`, { defaultValue: skill.category })}</Text>
            <Text style={styles.title}>{t(`skills.${skill.id}.title`, { defaultValue: skill.title })}</Text>
            <Text style={styles.description}>{t(`skills.${skill.id}.description`, { defaultValue: skill.description })}</Text>

            {aiMessage ? (
                <View style={styles.aiBox}>
                    <Text style={styles.aiText}>✨ {aiMessage}</Text>
                </View>
            ) : (
                <ActivityIndicator size="small" color="#FCD34D" style={{ marginBottom: 24, alignSelf: 'flex-start' }} />
            )}

            <View style={styles.timerContainer}>
                <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
                {!isCompleted && (
                    <TouchableOpacity style={styles.playBtn} onPress={toggleTimer}>
                        <Text style={styles.playBtnText}>{isActive ? t('skill.btn_pause', { defaultValue: "Pausa" }) : t('skill.btn_start', { defaultValue: "Inizia" })}</Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.stepsContainer}>
                <Text style={styles.stepsHeader}>{t('skill.steps_header', { defaultValue: 'Passaggi:' })}</Text>
                {skill.steps.map((step: string, idx: number) => (
                    <View key={idx} style={styles.stepItem}>
                        {skill.id === 'extra_baduanjin' && BDJ_IMAGES[idx] && (
                            <Image source={BDJ_IMAGES[idx]} style={styles.stepImage} resizeMode="contain" />
                        )}
                        <View style={styles.stepRow}>
                            <Text style={styles.stepNumber}>{idx + 1}</Text>
                            <Text style={styles.stepText}>{t(`skills.${skill.id}.steps.${idx}`, { defaultValue: step })}</Text>
                        </View>
                    </View>
                ))}
            </View>

            <TouchableOpacity
                style={[styles.finishBtn, isCompleted ? styles.finishBtnDone : null]}
                onPress={handleFinish}
            >
                <Text style={styles.finishBtnText}>{isCompleted ? t('skill.btn_complete_xp', { defaultValue: 'Completa (+25 XP)' }) : t('skill.btn_home', { defaultValue: 'Torna alla Home' })}</Text>
            </TouchableOpacity>

            {!isCompleted && (
                <TouchableOpacity style={styles.postponeBtn} onPress={handlePostpone}>
                    <Text style={styles.postponeBtnText}>{t('skill.btn_postpone_icon', { defaultValue: '⏰ Rimanda' })}</Text>
                </TouchableOpacity>
            )}

            <OptionModal
                visible={showPostponeModal}
                title={t('skill.modal_postpone_title', { defaultValue: 'Rimanda Micro-Skill' })}
                options={[
                    { label: t('skill.postpone_1h', { defaultValue: 'Tra 1 Ora' }), onPress: () => postponeSkill(60) },
                    { label: t('skill.postpone_2h', { defaultValue: 'Tra 2 Ore' }), onPress: () => postponeSkill(120) },
                    { label: t('skill.postpone_evening', { defaultValue: 'Stasera (20:00)' }), onPress: () => postponeSkill(-1) },
                ]}
                onCancel={() => setShowPostponeModal(false)}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111827' },
    content: { padding: 24, paddingBottom: 60 },
    categoryBadge: { color: '#FCD34D', fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 8 },
    title: { fontSize: 32, fontWeight: 'bold', color: 'white', marginBottom: 16 },
    description: { fontSize: 16, color: '#D1D5DB', marginBottom: 32, lineHeight: 24 },
    timerContainer: { backgroundColor: '#1F2937', padding: 24, borderRadius: 16, alignItems: 'center', marginBottom: 32 },
    timerText: { fontSize: 48, fontWeight: 'bold', color: '#60A5FA', fontFamily: 'monospace', marginBottom: 16 },
    playBtn: { backgroundColor: '#3B82F6', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 99 },
    playBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    stepsContainer: { marginBottom: 32 },
    stepsHeader: { fontSize: 20, fontWeight: 'bold', color: 'white', marginBottom: 16 },
    stepItem: { marginBottom: 20, alignItems: 'flex-start' },
    stepImage: { width: '100%', height: 200, borderRadius: 12, marginBottom: 12, backgroundColor: '#1F2937' },
    stepRow: { flexDirection: 'row', alignItems: 'flex-start' },
    stepNumber: { backgroundColor: '#374151', color: '#9CA3AF', width: 28, height: 28, borderRadius: 14, textAlign: 'center', lineHeight: 28, marginRight: 12, fontWeight: 'bold' },
    stepText: { color: '#E5E7EB', fontSize: 16, flex: 1, lineHeight: 24 },
    aiBox: { backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)', marginBottom: 32 },
    aiText: { color: '#FDE68A', fontSize: 16, fontStyle: 'italic', lineHeight: 24 },
    finishBtn: { backgroundColor: '#4B5563', paddingVertical: 16, borderRadius: 99, alignItems: 'center', marginBottom: 12 },
    finishBtnDone: { backgroundColor: '#10B981' },
    finishBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    postponeBtn: { backgroundColor: 'transparent', paddingVertical: 14, borderRadius: 99, alignItems: 'center', borderWidth: 1, borderColor: '#FCD34D' },
    postponeBtnText: { color: '#FCD34D', fontSize: 16, fontWeight: 'bold' },
});
