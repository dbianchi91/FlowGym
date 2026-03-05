import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { getAllGoalsByStatus, GoalRecord } from '../data/database';
import { useFocusEffect } from '@react-navigation/native';
import { formatToItalianDate } from '../utils/dateUtils';
import GoalLogModal from '../components/GoalLogModal';
import { useTranslation } from 'react-i18next';

type TabKey = 'active' | 'completed' | 'failed';

const TABS: { key: TabKey; labelKey: string }[] = [
    { key: 'active', labelKey: 'goals.tab_active' },
    { key: 'completed', labelKey: 'goals.tab_completed' },
    { key: 'failed', labelKey: 'goals.tab_failed' },
];

export default function GoalHistoryScreen() {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<TabKey>('active');
    const [goals, setGoals] = useState<GoalRecord[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [logModalVisible, setLogModalVisible] = useState(false);
    const [selectedGoalForLog, setSelectedGoalForLog] = useState<GoalRecord | null>(null);

    const loadGoals = useCallback(async () => {
        setRefreshing(true);
        const data = await getAllGoalsByStatus(activeTab);
        setGoals(data);
        setRefreshing(false);
    }, [activeTab]);

    useFocusEffect(
        useCallback(() => {
            loadGoals();
        }, [loadGoals])
    );

    const handleTabChange = (key: TabKey) => {
        setActiveTab(key);
    };

    const handleOpenLogbook = (goal: GoalRecord) => {
        setSelectedGoalForLog(goal);
        setLogModalVisible(true);
    };

    const getBorderColor = (tab: TabKey) => {
        if (tab === 'completed') return '#10B981';
        if (tab === 'failed') return '#EF4444';
        return '#FCD34D';
    };

    return (
        <View style={styles.container}>
            {/* Custom Tab Bar */}
            <View style={styles.tabBar}>
                {TABS.map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                        onPress={() => setActiveTab(tab.key)}
                    >
                        <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                            {t(tab.labelKey)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Goal List */}
            {goals.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyEmoji}>
                        {activeTab === 'active' ? '🎯' : activeTab === 'completed' ? '🏆' : '💪'}
                    </Text>
                    <Text style={styles.emptyStateText}>
                        {activeTab === 'active' ? t('goals.empty_active', { defaultValue: 'Nessun obiettivo in corso.' }) :
                            activeTab === 'completed' ? t('goals.empty_completed', { defaultValue: 'Nessun obiettivo raggiunto ancora.' }) :
                                t('goals.empty_failed', { defaultValue: 'Nessun obiettivo fallito.' })}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={goals}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={loadGoals} tintColor="#FCD34D" />
                    }
                    renderItem={({ item }) => (
                        <View style={[styles.goalCard, { borderLeftColor: getBorderColor(activeTab) }]}>
                            <Text style={styles.goalTitle}>{item.title}</Text>
                            <View style={styles.goalProgressRow}>
                                <View style={styles.goalProgressBarBg}>
                                    <View style={[
                                        styles.goalProgressBarFill,
                                        { width: `${Math.min(100, (item.progress / item.target) * 100)}%` },
                                        activeTab === 'completed' && { backgroundColor: '#10B981' },
                                        activeTab === 'failed' && { backgroundColor: '#EF4444' },
                                    ]} />
                                </View>
                                <Text style={styles.goalProgressText}>{item.progress} / {item.target}</Text>
                            </View>
                            <View style={styles.goalInfoRow}>
                                <Text style={styles.goalType}>
                                    {item.type === 'short' ? t('home.goal_short', { defaultValue: 'Breve Termine' }) : item.type === 'mid' ? t('home.goal_mid', { defaultValue: 'Medio Termine' }) : t('home.goal_long', { defaultValue: 'Lungo Termine' })}
                                </Text>
                                <View style={styles.footerRight}>
                                    <Text style={styles.dateText}>{t('goals.created_at', { defaultValue: 'Creato:' })} {formatToItalianDate(item.created_at)}</Text>
                                    <TouchableOpacity style={styles.logBtn} onPress={() => handleOpenLogbook(item)}>
                                        <Text style={styles.logBtnText}>{t('goals.log_btn')}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    )}
                />
            )}

            <GoalLogModal
                visible={logModalVisible}
                goal={selectedGoalForLog}
                onClose={() => setLogModalVisible(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111827' },
    header: { paddingTop: 60, paddingBottom: 16, paddingHorizontal: 24, backgroundColor: '#1F2937' },
    title: { fontSize: 24, fontWeight: 'bold', color: 'white' },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#1F2937',
        paddingHorizontal: 16,
        paddingBottom: 12,
        paddingTop: 16,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: '#FCD34D',
    },
    tabText: { color: '#6B7280', fontWeight: 'bold', fontSize: 14 },
    tabTextActive: { color: '#FCD34D' },
    listContainer: { padding: 24 },
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    emptyEmoji: { fontSize: 48, marginBottom: 16 },
    emptyStateText: { color: '#9CA3AF', fontSize: 16, textAlign: 'center' },
    goalCard: {
        backgroundColor: '#1F2937',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#FCD34D',
    },
    goalTitle: { color: '#E5E7EB', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
    goalProgressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    goalProgressBarBg: { flex: 1, height: 6, backgroundColor: '#374151', borderRadius: 3, overflow: 'hidden', marginRight: 12 },
    goalProgressBarFill: { height: '100%', backgroundColor: '#3B82F6', borderRadius: 3 },
    goalProgressText: { color: '#9CA3AF', fontSize: 12, fontWeight: 'bold', width: 50, textAlign: 'right' },
    goalInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    goalType: { color: '#9CA3AF', fontSize: 13, fontWeight: '600' },
    dateText: { color: '#6B7280', fontSize: 12 },
    footerRight: { alignItems: 'flex-end' },
    logBtn: { marginTop: 8, backgroundColor: '#374151', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    logBtnText: { color: '#FCD34D', fontSize: 12, fontWeight: 'bold' },
});
