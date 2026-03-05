import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { getCheckInsByRange, CheckInRecord } from '../data/database';
import { LineChart } from 'react-native-chart-kit';
import { useIsFocused } from '@react-navigation/native';
import { formatToItalianDate } from '../utils/dateUtils';
import { useTranslation } from 'react-i18next';
import { generateWeeklyInsights, WeeklyInsight } from '../utils/insightsEngine';
import i18next from 'i18next';

const screenWidth = Dimensions.get("window").width;

type FilterOption = { key: string; days: number };
const FILTERS: FilterOption[] = [
    { key: '7', days: 7 },
    { key: '30', days: 30 },
    { key: '90', days: 90 },
];

export default function HistoryScreen() {
    const { t } = useTranslation();
    const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
    const [insights, setInsights] = useState<WeeklyInsight[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [selectedDays, setSelectedDays] = useState<number>(7);
    const isFocused = useIsFocused();

    const loadData = async (days: number) => {
        setLoading(true);
        const data = await getCheckInsByRange(days);
        setCheckIns(data.reverse()); // chronological order

        if (days === 7) {
            const generatedInsights = await generateWeeklyInsights(i18next.language);
            setInsights(generatedInsights);
        } else {
            setInsights([]);
        }

        setLoading(false);
    };

    useEffect(() => {
        if (isFocused) {
            loadData(selectedDays);
        }
    }, [isFocused, selectedDays]);

    const handleFilterChange = (days: number) => {
        setSelectedDays(days);
    };

    if (loading) return <View style={styles.container}><Text style={{ color: 'white', marginTop: 80 }}>{t('history.loading', { defaultValue: 'Caricamento...' })}</Text></View>;

    const chartData = checkIns.length > 0 ? {
        labels: checkIns.length <= 10
            ? checkIns.map(c => c.date.split('-').reverse().slice(0, 2).join('/'))
            : checkIns.filter((_, i) => i % Math.ceil(checkIns.length / 8) === 0).map(c => c.date.split('-').reverse().slice(0, 2).join('/')),
        datasets: [
            {
                data: checkIns.map(c => c.mood),
                color: (opacity = 1) => `rgba(252, 211, 77, ${opacity})`,
                strokeWidth: 2
            },
            {
                data: checkIns.map(c => c.energy),
                color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                strokeWidth: 2
            }
        ],
        legend: [t('history.legend_mood', { defaultValue: 'Umore' }), t('history.legend_energy', { defaultValue: 'Energia' })]
    } : null;

    const chartConfig = {
        backgroundGradientFrom: "#1F2937",
        backgroundGradientTo: "#1F2937",
        color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
        strokeWidth: 2,
        useShadowColorFromDataset: false
    };

    const getFilterLabel = (days: number) => {
        if (days === 7) return t('history.days_7', { defaultValue: '7 gg' });
        if (days === 30) return t('history.month_1', { defaultValue: '1 mese' });
        if (days === 90) return t('history.months_3', { defaultValue: '3 mesi' });
        return '';
    };

    const filterLabel = getFilterLabel(selectedDays);

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: 16 }}>

            {/* Filter Bar */}
            <View style={styles.filterBar}>
                {FILTERS.map(f => (
                    <TouchableOpacity
                        key={f.days}
                        style={[styles.filterBtn, selectedDays === f.days && styles.filterBtnActive]}
                        onPress={() => handleFilterChange(f.days)}
                    >
                        <Text style={[styles.filterText, selectedDays === f.days && styles.filterTextActive]}>{getFilterLabel(f.days)}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.subtitle}>
                {t('history.subtitle_checkins', { count: checkIns.length, filterLabel: filterLabel, defaultValue: `${checkIns.length} check-in negli ultimi ${filterLabel} (dati locali)` })}
            </Text>

            {insights.length > 0 && selectedDays === 7 && (
                <View style={styles.insightsContainer}>
                    <Text style={styles.insightsTitle}>{t('history.insights_title', { defaultValue: '💡 Insights della Settimana' })}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.insightsScroll}>
                        {insights.map((insight, idx) => (
                            <View key={idx} style={styles.insightCard}>
                                <Text style={styles.insightIcon}>{insight.icon}</Text>
                                <Text style={styles.insightText}>{t(insight.key, { ...insight.params })}</Text>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            )}

            {chartData && checkIns.length > 1 ? (
                <View style={styles.chartContainer}>
                    <LineChart
                        data={chartData}
                        width={screenWidth - 48}
                        height={220}
                        chartConfig={chartConfig}
                        bezier
                        style={{ borderRadius: 16 }}
                    />
                </View>
            ) : checkIns.length <= 1 ? (
                <Text style={styles.noData}>{t('history.no_data')}</Text>
            ) : null}

            <View style={styles.listContainer}>
                {checkIns.slice().reverse().map((c, i) => (
                    <View key={i} style={styles.historyCard}>
                        <Text style={styles.historyDate}>{formatToItalianDate(c.date)}</Text>
                        <Text style={styles.historyStats}>
                            🔋 {c.energy}  😊 {c.mood}  🎯 {c.focus}  💤 {c.sleep}  🔥 {c.drive}
                        </Text>
                    </View>
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111827', paddingHorizontal: 24 },
    filterBar: {
        flexDirection: 'row',
        backgroundColor: '#1F2937',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 16,
    },
    filterBtn: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
    },
    filterBtnActive: {
        backgroundColor: '#3B82F6',
    },
    filterText: {
        color: '#9CA3AF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    filterTextActive: {
        color: 'white',
    },
    subtitle: { fontSize: 14, color: '#9CA3AF', marginBottom: 24 },
    insightsContainer: { marginBottom: 24 },
    insightsTitle: { fontSize: 18, fontWeight: 'bold', color: 'white', marginBottom: 12 },
    insightsScroll: { flexDirection: 'row' },
    insightCard: { backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: 16, borderRadius: 12, marginRight: 12, width: screenWidth * 0.6, borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.3)' },
    insightIcon: { fontSize: 24, marginBottom: 8 },
    insightText: { color: '#E5E7EB', fontSize: 14, lineHeight: 20 },
    chartContainer: { alignItems: 'center', marginBottom: 32 },
    noData: { color: '#D1D5DB', fontSize: 16, fontStyle: 'italic', textAlign: 'center', marginTop: 40, marginBottom: 32 },
    listContainer: { paddingBottom: 60 },
    historyCard: { backgroundColor: '#1F2937', padding: 16, borderRadius: 12, marginBottom: 12 },
    historyDate: { color: '#60A5FA', fontWeight: 'bold', marginBottom: 8 },
    historyStats: { color: '#E5E7EB', fontSize: 16 }
});
