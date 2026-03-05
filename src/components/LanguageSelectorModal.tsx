import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { setupDailyNotification } from '../services/notificationService';

interface LanguageSelectorModalProps {
    visible: boolean;
    onClose: () => void;
}

const LANGUAGES = [
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
];

export default function LanguageSelectorModal({ visible, onClose }: LanguageSelectorModalProps) {
    const { t, i18n } = useTranslation();

    const currentLang = i18n.language || 'it';

    const handleSelectLanguage = async (code: string) => {
        await i18n.changeLanguage(code);
        await AsyncStorage.setItem('user_language', code);
        // Re-schedule notifications with the new language
        await setupDailyNotification();
        onClose();
    };

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
                    <View style={styles.header}>
                        <Text style={styles.title}>{t('settings.language_title', { defaultValue: 'Seleziona Lingua' })}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#9CA3AF" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.optionsContainer}>
                        {LANGUAGES.map((lang) => {
                            const isSelected = currentLang === lang.code;
                            return (
                                <TouchableOpacity
                                    key={lang.code}
                                    style={[styles.optionBtn, isSelected && styles.optionBtnSelected]}
                                    onPress={() => handleSelectLanguage(lang.code)}
                                >
                                    <Text style={styles.flag}>{lang.flag}</Text>
                                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                                        {lang.name}
                                    </Text>
                                    {isSelected && (
                                        <Ionicons name="checkmark" size={20} color="#FCD34D" style={styles.checkIcon} />
                                    )}
                                </TouchableOpacity>
                            );
                        })}
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
    },
    optionsContainer: {
        gap: 12,
    },
    optionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#374151',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 16,
    },
    optionBtnSelected: {
        backgroundColor: 'rgba(252, 211, 77, 0.1)',
        borderColor: '#FCD34D',
        borderWidth: 1,
    },
    flag: {
        fontSize: 24,
        marginRight: 12,
    },
    optionText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        flex: 1,
    },
    optionTextSelected: {
        color: '#FCD34D',
    },
    checkIcon: {
        marginLeft: 'auto',
    },
});
