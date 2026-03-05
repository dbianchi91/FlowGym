import React, { useState, useEffect } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, TextInput, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { getGoalLogs, addGoalLog, GoalLogRecord, GoalRecord } from '../data/database';
import { formatToItalianDate } from '../utils/dateUtils';
import { useTranslation } from 'react-i18next';

interface GoalLogModalProps {
    visible: boolean;
    goal: GoalRecord | null;
    onClose: () => void;
}

export default function GoalLogModal({ visible, goal, onClose }: GoalLogModalProps) {
    const { t } = useTranslation();
    const [logs, setLogs] = useState<GoalLogRecord[]>([]);
    const [newLog, setNewLog] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible && goal) {
            loadLogs();
        }
    }, [visible, goal]);

    const loadLogs = async () => {
        if (!goal) return;
        const data = await getGoalLogs(goal.id);
        setLogs(data);
    };

    const handleAddLog = async () => {
        if (!goal || !newLog.trim()) return;
        setLoading(true);
        await addGoalLog(goal.id, newLog.trim());
        setNewLog('');
        await loadLogs();
        setLoading(false);
    };

    const formatDateTime = (isoString: string) => {
        const date = new Date(isoString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    };

    return (
        <Modal
            transparent
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalBox}
                >
                    <View style={styles.header}>
                        <View style={styles.headerInfo}>
                            <Text style={styles.title}>{t('goals.log_title', { defaultValue: 'Diario di Bordo' })}</Text>
                            <Text style={styles.goalTitle} numberOfLines={1}>{goal?.title}</Text>
                        </View>
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                            <Text style={styles.closeText}>{t('common.close', { defaultValue: 'Chiudi' })}</Text>
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={logs}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={styles.listContent}
                        renderItem={({ item }) => (
                            <View style={styles.logCard}>
                                <Text style={styles.logDate}>{formatDateTime(item.created_at)}</Text>
                                <Text style={styles.logNote}>{item.note}</Text>
                            </View>
                        )}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>{t('goals.log_empty', { defaultValue: 'Ancora nessuna nota in questo diario.' })}</Text>
                                <Text style={styles.emptySubText}>{t('goals.log_empty_sub', { defaultValue: 'Aggiungi un avanzamento qui sotto!' })}</Text>
                            </View>
                        }
                        inverted={false} // We sort by DESC in SQL, so newest at top
                    />

                    {goal?.status === 'active' && (
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder={t('goals.log_placeholder', { defaultValue: 'Scrivi un aggiornamento...' })}
                                placeholderTextColor="#9CA3AF"
                                value={newLog}
                                onChangeText={setNewLog}
                                multiline
                            />
                            <TouchableOpacity
                                style={[styles.sendBtn, !newLog.trim() && styles.sendBtnDisabled]}
                                onPress={handleAddLog}
                                disabled={!newLog.trim() || loading}
                            >
                                <Text style={styles.sendBtnText}>{t('common.save', { defaultValue: 'Salva' })}</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    modalBox: {
        backgroundColor: '#1F2937',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        height: '80%',
        width: '100%',
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#374151',
    },
    headerInfo: {
        flex: 1,
        marginRight: 16,
    },
    title: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#FCD34D',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    goalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
        marginTop: 4,
    },
    closeBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: '#374151',
        borderRadius: 12,
    },
    closeText: {
        color: 'white',
        fontWeight: 'bold',
    },
    listContent: {
        padding: 24,
        flexGrow: 1,
    },
    logCard: {
        backgroundColor: '#374151',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderLeftWidth: 3,
        borderLeftColor: '#FCD34D',
    },
    logDate: {
        fontSize: 12,
        color: '#9CA3AF',
        marginBottom: 8,
        fontWeight: '600',
    },
    logNote: {
        fontSize: 16,
        color: 'white',
        lineHeight: 22,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        color: '#9CA3AF',
        fontSize: 16,
        textAlign: 'center',
    },
    emptySubText: {
        color: '#6B7280',
        fontSize: 14,
        marginTop: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: '#111827',
        borderTopWidth: 1,
        borderTopColor: '#374151',
        alignItems: 'flex-end',
    },
    input: {
        flex: 1,
        backgroundColor: '#1F2937',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
        color: 'white',
        fontSize: 16,
        maxHeight: 120,
        minHeight: 48,
    },
    sendBtn: {
        backgroundColor: '#FCD34D',
        width: 70,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
    },
    sendBtnDisabled: {
        backgroundColor: '#4B5563',
        opacity: 0.5,
    },
    sendBtnText: {
        color: '#111827',
        fontWeight: 'bold',
        fontSize: 14,
    },
});
