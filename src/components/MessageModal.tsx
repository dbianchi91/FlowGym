import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';

interface MessageModalProps {
    visible: boolean;
    title: string;
    message: string;
    buttonText?: string;
    onClose: () => void;
    type?: 'success' | 'encouragement';
}

export default function MessageModal({
    visible,
    title,
    message,
    buttonText,
    onClose,
    type = 'success',
}: MessageModalProps) {
    const { t } = useTranslation();
    const finalButtonText = buttonText || t('common.continue', { defaultValue: 'Continua' });
    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <TouchableOpacity
                    style={styles.modalBox}
                    activeOpacity={1}
                    onPress={e => e.stopPropagation()}
                >
                    <Text style={[styles.icon, type === 'encouragement' && styles.iconEncouragement]}>
                        {type === 'success' ? '🏆' : '💪'}
                    </Text>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>

                    <TouchableOpacity
                        style={[styles.closeBtn, type === 'encouragement' && styles.closeBtnEncouragement]}
                        onPress={onClose}
                    >
                        <Text style={styles.closeBtnText}>{finalButtonText}</Text>
                    </TouchableOpacity>
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
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 10,
    },
    icon: {
        fontSize: 48,
        marginBottom: 16,
    },
    iconEncouragement: {
        // Option for different styling if needed
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: '#9CA3AF',
        lineHeight: 24,
        marginBottom: 32,
        textAlign: 'center',
    },
    closeBtn: {
        backgroundColor: '#10B981',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
    },
    closeBtnEncouragement: {
        backgroundColor: '#3B82F6',
    },
    closeBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
