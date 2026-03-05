import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';

interface ConfirmModalProps {
    visible: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDestructive?: boolean;
}

export default function ConfirmModal({
    visible,
    title,
    message,
    confirmText,
    cancelText,
    onConfirm,
    onCancel,
    isDestructive = false,
}: ConfirmModalProps) {
    const { t } = useTranslation();
    const finalConfirmText = confirmText || t('common.confirm', { defaultValue: 'Conferma' });
    const finalCancelText = cancelText || t('common.cancel', { defaultValue: 'Annulla' });
    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onCancel}
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={onCancel}
            >
                <TouchableOpacity
                    style={styles.modalBox}
                    activeOpacity={1}
                    onPress={e => e.stopPropagation()}
                >
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>

                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                            <Text style={styles.cancelText}>{finalCancelText}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.confirmBtn, isDestructive && styles.confirmBtnDestructive]}
                            onPress={onConfirm}
                        >
                            <Text style={styles.confirmText}>{finalConfirmText}</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalBox: {
        backgroundColor: '#1F2937',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        borderWidth: 1,
        borderColor: '#374151',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 12,
    },
    message: {
        fontSize: 16,
        color: '#9CA3AF',
        lineHeight: 24,
        marginBottom: 32,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    cancelBtn: {
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    cancelText: {
        color: '#9CA3AF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    confirmBtn: {
        backgroundColor: '#10B981',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        minWidth: 100,
        alignItems: 'center',
    },
    confirmBtnDestructive: {
        backgroundColor: '#EF4444',
    },
    confirmText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
