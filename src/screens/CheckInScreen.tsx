import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { saveCheckIn, addXP, getWeeklyCheckIns } from '../data/database';
import { determineSkill, Skill } from '../utils/ruleEngine';
import { setupDailyNotification } from '../services/notificationService';
import { useTranslation } from 'react-i18next';
import { getDynamicCheckInPrompt } from '../services/aiService';

interface ScoreSelectorProps {
    label: string;
    score: number;
    onSelect: (val: number) => void;
}

const ScoreSelector: React.FC<ScoreSelectorProps> = ({ label, score, onSelect }) => (
    <View style={styles.selectorContainer}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.buttonsContainer}>
            {[1, 2, 3, 4, 5].map((val) => (
                <TouchableOpacity
                    key={val}
                    style={[styles.scoreBtn, score === val && styles.scoreBtnActive]}
                    onPress={() => onSelect(val)}
                >
                    <Text style={[styles.scoreText, score === val && styles.scoreTextActive]}>{val}</Text>
                </TouchableOpacity>
            ))}
        </View>
    </View>
);

export default function CheckInScreen({ navigation }: any) {
    const { t, i18n } = useTranslation();
    const [scores, setScores] = useState({ energy: 3, mood: 3, focus: 3, sleep: 3, drive: 3 });
    const [dynamicPrompt, setDynamicPrompt] = useState<string>('');

    useEffect(() => {
        const loadPrompt = async () => {
            const records = await getWeeklyCheckIns();
            setDynamicPrompt(getDynamicCheckInPrompt(records));
        };
        loadPrompt();
    }, [i18n.language]);

    const handleComplete = async () => {
        // Save to local SQLite
        await saveCheckIn(scores.energy, scores.mood, scores.focus, scores.sleep, scores.drive);
        await addXP(10); // +10 XP for daily checkin

        // Determine skill via Rule Engine (now async with Thompson Sampling)
        const suggestedSkill: Skill = await determineSkill(scores.energy, scores.mood, scores.focus, scores.sleep, scores.drive);

        // Re-evaluate notifications (cancel today's 18:30 backup reminder if present)
        await setupDailyNotification();

        // Navigate to Skill Presentation
        navigation.replace('SkillScreen', { skill: suggestedSkill, scores: scores });
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.header}>{dynamicPrompt || t('checkin.title', { defaultValue: 'Come ti senti oggi?' })}</Text>
            <Text style={styles.subheader}>{t('checkin.subtitle', { defaultValue: 'I tuoi dati restano sul dispositivo (offline).' })}</Text>

            <ScoreSelector
                label={`🔋 ${t('checkin.energy', { defaultValue: 'Energia' })}`}
                score={scores.energy}
                onSelect={(val: number) => setScores({ ...scores, energy: val })}
            />
            <ScoreSelector
                label={`😊 ${t('checkin.mood', { defaultValue: 'Umore' })}`}
                score={scores.mood}
                onSelect={(val: number) => setScores({ ...scores, mood: val })}
            />
            <ScoreSelector
                label={`🎯 ${t('checkin.focus', { defaultValue: 'Focus' })}`}
                score={scores.focus}
                onSelect={(val: number) => setScores({ ...scores, focus: val })}
            />
            <ScoreSelector
                label={`🔥 ${t('checkin.drive', { defaultValue: 'Motivazione' })}`}
                score={scores.drive}
                onSelect={(val: number) => setScores({ ...scores, drive: val })}
            />
            <ScoreSelector
                label={`💤 ${t('checkin.sleep', { defaultValue: 'Sonno' })}`}
                score={scores.sleep}
                onSelect={(val: number) => setScores({ ...scores, sleep: val })}
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handleComplete}>
                <Text style={styles.submitBtnText}>{t('checkin.save_btn', { defaultValue: 'Ottieni la tua Micro-Skill' })}</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111827' },
    content: { padding: 24, paddingBottom: 60, alignItems: 'center' },
    header: { fontSize: 32, fontWeight: 'bold', color: '#F3F4F6', marginBottom: 8, textAlign: 'center' },
    subheader: { fontSize: 14, color: '#9CA3AF', marginBottom: 32, textAlign: 'center' },
    selectorContainer: { width: '100%', marginBottom: 24 },
    label: { fontSize: 18, color: '#E5E7EB', marginBottom: 12, fontWeight: '600' },
    buttonsContainer: { flexDirection: 'row', justifyContent: 'space-between' },
    scoreBtn: {
        width: 50, height: 50, borderRadius: 25, backgroundColor: '#1F2937',
        justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#374151'
    },
    scoreBtnActive: { backgroundColor: '#3B82F6', borderColor: '#60A5FA' },
    scoreText: { color: '#D1D5DB', fontSize: 18, fontWeight: 'bold' },
    scoreTextActive: { color: 'white' },
    submitBtn: {
        backgroundColor: '#10B981', paddingVertical: 16, paddingHorizontal: 32,
        borderRadius: 99, width: '100%', alignItems: 'center', marginTop: 24,
    },
    submitBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});
