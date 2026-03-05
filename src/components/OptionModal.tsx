import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';

interface Option {
    label: string;
    onPress: () => void;
    isDestructive?: boolean;
}

interface OptionModalProps {
    visible: boolean;
    title: string;
    options: Option[];
    onCancel: () => void;
}

export default function OptionModal({ visible, title, options, onCancel }: OptionModalProps) {
    const { t } = useTranslation();
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

                    <View style={styles.optionsContainer}>
                        {options.map((option, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[styles.optionBtn]}
                                onPress={() => {
                                    option.onPress();
                                    onCancel();
                                }}
                            >
                                <Text style={[styles.optionText, option.isDestructive && styles.optionTextDestructive]}>
                                    {option.label}
                                </Text>
                            </TouchableOpacity>
                        ))}

                        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                            <Text style={styles.cancelText}>{t('common.cancel', { defaultValue: 'Annulla' })}</Text>
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
        marginBottom: 20,
        textAlign: 'center',
    },
    optionsContainer: {
        gap: 12,
    },
    optionBtn: {
        backgroundColor: '#374151',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    optionText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    optionTextDestructive: {
        color: '#EF4444',
    },
    cancelBtn: {
        paddingVertical: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    cancelText: {
        color: '#9CA3AF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
