import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { getWeeklyCheckIns, getActiveGoals, GoalRecord, saveGoal, updateGoalProgress, updateGoalStatus, getUserProfile, UserProfileRecord, addXP, getConsecutiveFailedGoals } from '../data/database';
import { useIsFocused } from '@react-navigation/native';
import { useToast } from '../components/ToastProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Skill } from '../utils/ruleEngine';
import ConfirmModal from '../components/ConfirmModal';
import ConfettiCelebration from '../components/ConfettiCelebration';
import MessageModal from '../components/MessageModal';
import OptionModal from '../components/OptionModal';
import GoalLogModal from '../components/GoalLogModal';
import LanguageSelectorModal from '../components/LanguageSelectorModal';
import { useTranslation } from 'react-i18next';
import { generateContextualMessage, AiContext, buildTimeSlot, AiMessage } from '../services/aiService';

export default function HomeScreen({ navigation }: any) {
    const { t, i18n } = useTranslation();
    const [streak, setStreak] = useState<number>(0);
    const [hasCheckedInToday, setHasCheckedInToday] = useState<boolean>(false);
    const [goals, setGoals] = useState<GoalRecord[]>([]);
    const [profile, setProfile] = useState<UserProfileRecord | null>(null);
    const [aiMessage, setAiMessage] = useState<AiMessage | null>(null);

    // Goal creation state
    const [newGoalTitle, setNewGoalTitle] = useState<string>('');
    const [newGoalType, setNewGoalType] = useState<'short' | 'mid' | 'long'>('short');
    const [newGoalTarget, setNewGoalTarget] = useState<string>('10');
    const [showGoalForm, setShowGoalForm] = useState(false);
    const [pendingSkill, setPendingSkill] = useState<{ skill: Skill, scores: any } | null>(null);

    // Modal State
    const [confirmModalVisible, setConfirmModalVisible] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{ goal: GoalRecord, type: 'complete' | 'fail' } | null>(null);
    const [showCelebration, setShowCelebration] = useState(false);
    const [messageModal, setMessageModal] = useState<{ visible: boolean, title: string, message: string, type: 'success' | 'encouragement' }>({
        visible: false,
        title: '',
        message: '',
        type: 'success'
    });
    const [finalizationModalVisible, setFinalizationModalVisible] = useState(false);
    const [goalToFinalize, setGoalToFinalize] = useState<GoalRecord | null>(null);
    const [logModalVisible, setLogModalVisible] = useState(false);
    const [selectedGoalForLog, setSelectedGoalForLog] = useState<GoalRecord | null>(null);
    const [languageModalVisible, setLanguageModalVisible] = useState(false);

    const isFocused = useIsFocused();
    const { showToast } = useToast();

    const loadData = async () => {
        const records = await getWeeklyCheckIns();
        setStreak(records.length);

        const today = new Date().toISOString().split('T')[0];
        setHasCheckedInToday(records.length > 0 && records[0].date === today);

        const activeGoals = await getActiveGoals();
        setGoals(activeGoals);
        const userProfile = await getUserProfile();
        setProfile(userProfile);

        // Check for pending skill
        const pendingStr = await AsyncStorage.getItem('pendingSkill');
        let pending = null;
        if (pendingStr) {
            pending = JSON.parse(pendingStr);
            setPendingSkill(pending);
        } else {
            setPendingSkill(null);
        }

        let recentStruggles: 'mood' | 'sleep' | 'energy' | 'none' = 'none';
        if (records.length >= 3) {
            const last3 = records.slice(0, 3);
            if (last3.every(r => r.mood <= 2)) recentStruggles = 'mood';
            else if (last3.every(r => r.sleep <= 2)) recentStruggles = 'sleep';
            else if (last3.every(r => r.energy <= 2)) recentStruggles = 'energy';
        } else if (records.length === 2) {
            const last2 = records.slice(0, 2);
            if (last2.every(r => r.mood <= 2)) recentStruggles = 'mood';
            else if (last2.every(r => r.sleep <= 2)) recentStruggles = 'sleep';
            else if (last2.every(r => r.energy <= 2)) recentStruggles = 'energy';
        }

        // Generate AI Context
        const ctx: AiContext = {
            name: userProfile.name || '',
            level: userProfile.level,
            streak: records.length, // Simplified streak for now
            streakTarget: userProfile.streak_target || 7,
            todayCheckIn: records.length > 0 && records[0].date === today ? records[0] : null,
            recentStruggles,
            weeklyAvg: { energy: 3, mood: 3, focus: 3, sleep: 3, drive: 3 },
            weeklyTrend: { energy: 0, mood: 0, focus: 0, sleep: 0, drive: 0 },
            lastSkillStatus: pending ? 'postponed' : 'none',
            timeSlot: buildTimeSlot(),
            lang: 'it' // Handled implicitly by i18next inside aiService
        };

        if (records.length > 0) {
            ctx.weeklyAvg = {
                energy: records.reduce((s, c) => s + c.energy, 0) / records.length,
                mood: records.reduce((s, c) => s + c.mood, 0) / records.length,
                focus: records.reduce((s, c) => s + c.focus, 0) / records.length,
                sleep: records.reduce((s, c) => s + c.sleep, 0) / records.length,
                drive: records.reduce((s, c) => s + c.drive, 0) / records.length,
            };
        }
        setAiMessage(generateContextualMessage(ctx));
    };

    useEffect(() => {
        if (isFocused) {
            loadData();
        }
    }, [isFocused, i18n.language]);

    const handleAddGoal = async () => {
        if (newGoalTitle.trim().length === 0) return;
        let target = parseInt(newGoalTarget, 10);
        if (isNaN(target) || target < 1) target = 1;

        const failedCount = await getConsecutiveFailedGoals();
        if (failedCount >= 2 && target > 3 && newGoalType !== 'long') {
            setMessageModal({
                visible: true,
                title: t('ai.coach.general.title', { defaultValue: 'Consiglio del Coach' }),
                message: t('goals.adaptive_suggestion', { defaultValue: "Ho notato che gli ultimi obiettivi erano sfidanti. Inizio questo, ma non esitare a spezzarlo in step più piccoli!" }),
                type: 'encouragement'
            });
        }

        await saveGoal(newGoalTitle.trim(), newGoalType, target);
        setNewGoalTitle('');
        setNewGoalTarget('10');
        setShowGoalForm(false);
        await loadData();
    };

    const handleProgressGoal = async (goalSnapshot: GoalRecord) => {
        const updatedGoal = await updateGoalProgress(goalSnapshot.id);

        if (!updatedGoal) return;

        await addXP(5);

        if (Number(updatedGoal.progress) >= Number(updatedGoal.target)) {
            setGoalToFinalize(updatedGoal);
            setFinalizationModalVisible(true);
            showToast(5, t('home.target_reached'));
        } else {
            showToast(5, t('home.step_forward'));
        }

        await loadData();
    };

    const executeFinalizeGoal = async (goal: GoalRecord, type: 'complete' | 'fail') => {
        if (type === 'complete') {
            await updateGoalStatus(goal.id, 'completed');
            let bonusXP = 50;
            if (goal.type === 'mid') bonusXP = 150;
            if (goal.type === 'long') bonusXP = 500;
            await addXP(bonusXP);
            const msg = profile?.name ? t('home.completed_toast', { name: profile.name }) : t('home.completed_default');
            showToast(bonusXP, msg);
            setShowCelebration(true);
        } else {
            await updateGoalStatus(goal.id, 'failed');
            const userName = profile?.name ? ` ${profile.name}` : '';
            const encouragements = [
                t('home.encouragement_1', { name: userName }),
                t('home.encouragement_2', { name: userName }),
                t('home.encouragement_3', { name: userName }),
                t('home.encouragement_4', { name: userName }),
                t('home.encouragement_5', { name: userName })
            ];
            setMessageModal({
                visible: true,
                title: t('home.modal_title_fail'),
                message: encouragements[Math.floor(Math.random() * encouragements.length)],
                type: 'encouragement'
            });
        }
        await loadData();
    };

    const handleCompleteGoal = (goal: GoalRecord) => {
        setConfirmAction({ goal, type: 'complete' });
        setConfirmModalVisible(true);
    };

    const handleFailGoal = (goal: GoalRecord) => {
        setConfirmAction({ goal, type: 'fail' });
        setConfirmModalVisible(true);
    };

    const handleOpenLogbook = (goal: GoalRecord) => {
        setSelectedGoalForLog(goal);
        setLogModalVisible(true);
    };

    const executeConfirmAction = async () => {
        if (!confirmAction) return;
        const { goal, type } = confirmAction;

        await executeFinalizeGoal(goal, type);

        setConfirmModalVisible(false);
        setConfirmAction(null);
    };

    const calculateLevelProgress = () => {
        if (!profile) return 0;
        // Current Level threshold
        const xpForCurrentLevel = 50 * Math.pow(profile.level - 1, 2);
        const xpForNextLevel = 50 * Math.pow(profile.level, 2);

        const xpInCurrentLevel = profile.xp - xpForCurrentLevel;
        const xpNeeded = xpForNextLevel - xpForCurrentLevel;

        return Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeeded) * 100));
    };

    // UI Colors (Calm Tech + Highlights)
    // Background: #111827 (Slate 900)
    // Surface: #1F2937 (Slate 800)
    // Primary Text: #F3F4F6 (Gray 100)
    // Accent (CTA): #10B981 (Emerald 500)
    // Highlight (Energy/Focus): #FCD34D (Amber 300)

    const progressWidth = `${calculateLevelProgress()}%`;

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60, paddingTop: 16 }}>
            <View style={styles.header}>
                {profile && (
                    <View style={styles.profileBox}>
                        <View style={styles.levelRow}>
                            <Text style={styles.levelText}>{t('home.level', { defaultValue: 'Livello' })} {profile.level}</Text>
                            <Text style={styles.xpText}>{profile.xp} XP</Text>
                        </View>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: progressWidth as any }]} />
                        </View>
                    </View>
                )}
                <TouchableOpacity onPress={() => setLanguageModalVisible(true)} style={styles.langBtn}>
                    <Text style={styles.langBtnIcon}>🌐</Text>
                </TouchableOpacity>
            </View>

            {aiMessage ? (
                <View style={styles.aiCard}>
                    <Text style={styles.aiTitle}>{aiMessage.title}</Text>
                    <Text style={styles.aiMessage}>{aiMessage.message}</Text>
                </View>
            ) : (
                <View style={styles.greetingHeader}>
                    <Text style={styles.greetingTitle}>
                        {profile?.name ? t('home.greeting_name', { name: profile.name }) : t('home.greeting')}
                    </Text>
                    <Text style={styles.greetingSubtitle}>{t('home.subtitle')}</Text>
                </View>
            )}

            <TouchableOpacity
                style={[styles.checkInButton, hasCheckedInToday && styles.checkInButtonDone]}
                onPress={() => !hasCheckedInToday && navigation.navigate('CheckInFlow')}
                activeOpacity={hasCheckedInToday ? 1 : 0.7}
            >
                <Text style={styles.buttonText}>
                    {hasCheckedInToday ? t('home.check_in_done') + ' ✓' : (aiMessage ? aiMessage.ctaLabel : t('home.check_in_btn'))}
                </Text>
                <Text style={styles.streakBadge}>🔥 {streak} / {profile?.streak_target || 7}</Text>
            </TouchableOpacity>

            {/* Pending Micro-Skill Card */}
            {pendingSkill && (
                <TouchableOpacity
                    style={styles.pendingSkillCard}
                    onPress={() => navigation.navigate('SkillScreen', { skill: pendingSkill.skill, scores: pendingSkill.scores })}
                >
                    <View style={{ flex: 1 }}>
                        <Text style={styles.pendingSkillLabel}>{t('activities.pending_skill_label', { defaultValue: '🧘 Micro-Skill in sospeso' })}</Text>
                        <Text style={styles.pendingSkillTitle}>{t(`skills.${pendingSkill.skill.id}.title`, { defaultValue: pendingSkill.skill.title })}</Text>
                    </View>
                    <Text style={styles.pendingSkillCta}>{t('activities.resume', { defaultValue: 'Riprendi →' })}</Text>
                </TouchableOpacity>
            )}

            <View style={styles.goalsContainer}>
                <View style={styles.goalsHeaderRow}>
                    <Text style={styles.goalsTitle}>{t('home.goals_title')}</Text>
                    <TouchableOpacity onPress={() => setShowGoalForm(!showGoalForm)}>
                        <Text style={styles.addBtnIcon}>{showGoalForm ? '−' : '＋'}</Text>
                    </TouchableOpacity>
                </View>

                {showGoalForm && (
                    <View style={styles.goalFormBox}>
                        <TextInput
                            style={styles.inputTitle}
                            placeholder={t('home.goal_title_placeholder')}
                            placeholderTextColor="#6B7280"
                            value={newGoalTitle}
                            onChangeText={setNewGoalTitle}
                        />
                        <View style={styles.formRow}>
                            <View style={styles.typeSelector}>
                                {['short', 'mid', 'long'].map((tType) => (
                                    <TouchableOpacity
                                        key={tType}
                                        style={[styles.typeBtn, newGoalType === tType && styles.typeBtnActive]}
                                        onPress={() => setNewGoalType(tType as any)}
                                    >
                                        <Text style={[styles.typeBtnText, newGoalType === tType && styles.typeBtnTextActive]}>
                                            {tType === 'short' ? 'gg' : tType === 'mid' ? t('home.goal_mid') : t('home.goal_long')}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <TextInput
                                style={styles.inputTarget}
                                keyboardType="numeric"
                                placeholder={t('home.goal_steps')}
                                placeholderTextColor="#6B7280"
                                value={newGoalTarget}
                                onChangeText={setNewGoalTarget}
                            />
                        </View>
                        <TouchableOpacity style={styles.saveGoalBtn} onPress={handleAddGoal}>
                            <Text style={styles.saveGoalBtnText}>{t('home.btn_save')}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {['short', 'mid', 'long'].map(type => {
                    const filtered = goals.filter(g => g.type === type);
                    if (filtered.length === 0) return null;
                    return (
                        <View key={type} style={styles.goalSection}>
                            <Text style={styles.sectionTitle}>
                                {type === 'short' ? t('home.goal_short', { defaultValue: 'Breve Termine' }) : type === 'mid' ? t('home.goal_mid', { defaultValue: 'Medio Termine' }) : t('home.goal_long', { defaultValue: 'Lungo Termine' })}
                            </Text>
                            {filtered.map(goal => (
                                <View key={goal.id} style={styles.goalCard}>
                                    <View style={styles.goalHeader}>
                                        <Text style={styles.goalTitle}>{goal.title}</Text>
                                        <TouchableOpacity style={styles.logBtnSmall} onPress={() => handleOpenLogbook(goal)}>
                                            <Text style={styles.logBtnTextSmall}>{t('goals.log_btn')}</Text>
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.goalProgressContainer}>
                                        <View style={styles.goalProgressBarBg}>
                                            <View style={[styles.goalProgressBarFill, { width: `${Math.min(100, (goal.progress / goal.target) * 100)}%` }]} />
                                        </View>
                                        <Text style={styles.goalProgressText}>
                                            {goal.progress} / {goal.target}
                                        </Text>
                                    </View>

                                    <View style={styles.goalActionsRow}>
                                        <TouchableOpacity style={styles.actionBtnSmall} onPress={() => handleFailGoal(goal)}>
                                            <Text style={styles.actionBtnTextSmall}>✗ {t('home.btn_fail')}</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity style={styles.actionBtnMain} onPress={() => handleProgressGoal(goal)}>
                                            <Text style={styles.actionBtnTextMain}>+1 {t('home.btn_progress', { defaultValue: 'Avanza' })}</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity style={styles.actionBtnSmallSuccess} onPress={() => handleCompleteGoal(goal)}>
                                            <Text style={styles.actionBtnTextSmallSuccess}>✓ {t('home.btn_done', { defaultValue: 'Fatto' })}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>
                    );
                })}

                {goals.length === 0 && !showGoalForm && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>{t('home.empty_goals_title', { defaultValue: 'Nessun obiettivo impostato.' })}</Text>
                        <Text style={styles.emptyStateSub}>{t('home.empty_goals_sub', { defaultValue: 'Pianta un seme oggi per raccoglierne i frutti domani.' })}</Text>
                    </View>
                )}
            </View>

            <ConfirmModal
                visible={confirmModalVisible}
                title={confirmAction?.type === 'complete' ? t('home.confirm_complete_title', { defaultValue: 'Obiettivo Raggiunto?' }) : t('home.confirm_fail_title', { defaultValue: 'Obiettivo Fallito?' })}
                message={confirmAction?.type === 'complete'
                    ? t('home.confirm_complete_msg', { defaultValue: `Hai completato "${confirmAction?.goal.title}"?`, title: confirmAction?.goal.title })
                    : t('home.confirm_fail_msg', { defaultValue: `Segnare "${confirmAction?.goal.title}" come fallito?`, title: confirmAction?.goal.title })}
                confirmText={confirmAction?.type === 'complete' ? t('home.btn_success_confirm', { defaultValue: 'Sì, Raggiunto!' }) : t('home.btn_fail_confirm', { defaultValue: 'Sì, Fallito' })}
                isDestructive={confirmAction?.type === 'fail'}
                onConfirm={executeConfirmAction}
                onCancel={() => {
                    setConfirmModalVisible(false);
                    setConfirmAction(null);
                }}
            />

            <MessageModal
                visible={messageModal.visible}
                title={messageModal.title}
                message={messageModal.message}
                type={messageModal.type}
                onClose={() => setMessageModal(prev => ({ ...prev, visible: false }))}
            />

            <ConfettiCelebration
                visible={showCelebration}
                onComplete={() => setShowCelebration(false)}
            />

            <OptionModal
                visible={finalizationModalVisible}
                title={t('home.modal_title_confirm')}
                options={[
                    {
                        label: '🏆 ' + t('home.btn_success'),
                        onPress: () => goalToFinalize && executeFinalizeGoal(goalToFinalize, 'complete')
                    },
                    {
                        label: '💪 Fallito (per ora)',
                        isDestructive: true,
                        onPress: () => goalToFinalize && executeFinalizeGoal(goalToFinalize, 'fail')
                    },
                ]}
                onCancel={() => {
                    setFinalizationModalVisible(false);
                    setGoalToFinalize(null);
                }}
            />

            <GoalLogModal
                visible={logModalVisible}
                goal={selectedGoalForLog}
                onClose={() => setLogModalVisible(false)}
            />

            <LanguageSelectorModal
                visible={languageModalVisible}
                onClose={() => setLanguageModalVisible(false)}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111827' },
    header: { paddingHorizontal: 24, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    profileBox: { flex: 1, marginRight: 16 },
    langBtn: { padding: 8, backgroundColor: '#1F2937', borderRadius: 12 },
    langBtnIcon: { fontSize: 24 },
    levelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    levelText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    xpText: { color: '#9CA3AF', fontSize: 14, fontWeight: '600' },
    progressBarBg: { height: 8, backgroundColor: '#374151', borderRadius: 4, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: '#FCD34D', borderRadius: 4 },

    greetingHeader: { paddingHorizontal: 24, marginBottom: 24 },
    greetingTitle: { fontSize: 28, fontWeight: 'bold', color: 'white', marginBottom: 4 },
    greetingSubtitle: { fontSize: 16, color: '#9CA3AF' },

    aiCard: { backgroundColor: '#1F2937', marginHorizontal: 24, padding: 20, borderRadius: 16, marginBottom: 24, borderLeftWidth: 4, borderLeftColor: '#3B82F6' },
    aiTitle: { fontSize: 18, fontWeight: 'bold', color: 'white', marginBottom: 8 },
    aiMessage: { fontSize: 15, color: '#D1D5DB', lineHeight: 22 },

    checkInButton: {
        backgroundColor: '#10B981', marginHorizontal: 24, padding: 20, borderRadius: 16,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5,
        marginBottom: 32
    },
    checkInButtonDone: {
        backgroundColor: '#374151',
        shadowOpacity: 0,
        elevation: 0
    },
    buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    streakBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, color: 'white', fontWeight: 'bold' },

    goalsContainer: { paddingHorizontal: 24 },
    goalsHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    goalsTitle: { fontSize: 22, fontWeight: 'bold', color: 'white' },
    addBtnIcon: { color: '#10B981', fontSize: 32, fontWeight: '300' },

    goalFormBox: { backgroundColor: '#1F2937', padding: 16, borderRadius: 12, marginBottom: 24 },
    inputTitle: { color: 'white', backgroundColor: '#374151', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 16 },
    formRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    typeSelector: { flexDirection: 'row', flex: 1, marginRight: 12, backgroundColor: '#374151', borderRadius: 8, overflow: 'hidden' },
    typeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
    typeBtnActive: { backgroundColor: '#3B82F6' },
    typeBtnText: { color: '#9CA3AF', fontWeight: 'bold', fontSize: 14 },
    typeBtnTextActive: { color: 'white' },
    inputTarget: { width: 80, backgroundColor: '#374151', color: 'white', borderRadius: 8, paddingHorizontal: 16, textAlign: 'center', fontSize: 16 },
    saveGoalBtn: { backgroundColor: '#10B981', padding: 12, borderRadius: 8, alignItems: 'center' },
    saveGoalBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

    goalSection: { marginBottom: 24 },
    sectionTitle: { color: '#9CA3AF', textTransform: 'uppercase', fontSize: 12, fontWeight: 'bold', letterSpacing: 1, marginBottom: 12 },
    goalCard: { backgroundColor: '#1F2937', padding: 20, borderRadius: 20, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#FCD34D' },
    goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    goalTitle: { color: '#E5E7EB', fontSize: 18, fontWeight: 'bold', flex: 1, marginRight: 8 },
    logBtnSmall: { backgroundColor: '#374151', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    logBtnTextSmall: { color: '#FCD34D', fontSize: 12, fontWeight: 'bold' },

    goalProgressContainer: { marginBottom: 20 },
    goalProgressBarBg: { height: 8, backgroundColor: '#374151', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
    goalProgressBarFill: { height: '100%', backgroundColor: '#3B82F6', borderRadius: 4 },
    goalProgressText: { color: '#9CA3AF', fontSize: 14, fontWeight: 'bold', textAlign: 'right' },

    goalActionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
    actionBtnMain: { flex: 2, backgroundColor: '#3B82F6', paddingVertical: 12, borderRadius: 12, alignItems: 'center', shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
    actionBtnSmall: { flex: 1, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: '#EF4444', paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
    actionBtnSmallSuccess: { flex: 1, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 1, borderColor: '#10B981', paddingVertical: 10, borderRadius: 12, alignItems: 'center' },

    actionBtnTextMain: { color: 'white', fontWeight: 'bold', fontSize: 15 },
    actionBtnTextSmall: { color: '#EF4444', fontWeight: 'bold', fontSize: 12 },
    actionBtnTextSmallSuccess: { color: '#10B981', fontWeight: 'bold', fontSize: 12 },

    pendingSkillCard: {
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderWidth: 1,
        borderColor: '#FCD34D',
        marginHorizontal: 24,
        marginBottom: 24,
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    pendingSkillLabel: { color: '#FCD34D', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
    pendingSkillTitle: { color: '#E5E7EB', fontSize: 16, fontWeight: '600' },
    pendingSkillCta: { color: '#FCD34D', fontWeight: 'bold', fontSize: 14 },

    emptyState: { paddingVertical: 40, alignItems: 'center' },
    emptyStateText: { color: '#D1D5DB', fontSize: 18, fontWeight: '500', marginBottom: 8 },
    emptyStateSub: { color: '#6B7280', fontSize: 14, textAlign: 'center' }
});
