import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateUserProfile } from '../data/database';
import { useTranslation } from 'react-i18next';

export default function OnboardingScreen({ navigation }: any) {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [birthYear, setBirthYear] = useState('');

    const completeOnboarding = async () => {
        if (name.trim() && birthYear.trim()) {
            const year = parseInt(birthYear, 10);
            if (!isNaN(year)) {
                await updateUserProfile(name.trim(), year);
            }
        }
        await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
        navigation.replace('MainTabs');
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <Text style={styles.title}>{t('onboarding.title', { defaultValue: 'Benvenuto in FlowGym' })}</Text>

                <View style={styles.featureBox}>
                    <Text style={styles.featureTitle}>🔒 {t('onboarding.feature_privacy_title', { defaultValue: '100% Privacy e Offline' })}</Text>
                    <Text style={styles.featureDesc}>{t('onboarding.feature_privacy_desc', { defaultValue: 'Tutti i tuoi dati restano sul dispositivo.' })}</Text>
                </View>

                <View style={styles.featureBox}>
                    <Text style={styles.featureTitle}>🧠 {t('onboarding.feature_ai_title', { defaultValue: 'AI On-Device' })}</Text>
                    <Text style={styles.featureDesc}>{t('onboarding.feature_ai_desc', { defaultValue: 'Consigli generati localmente, per guidarti nel tuo stato attuale.' })}</Text>
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>{t('onboarding.label_name', { defaultValue: 'Come ti chiami?' })}</Text>
                    <TextInput
                        style={styles.input}
                        placeholder={t('onboarding.placeholder_name', { defaultValue: 'Il tuo nome' })}
                        placeholderTextColor="#6B7280"
                        value={name}
                        onChangeText={setName}
                    />

                    <Text style={styles.inputLabel}>{t('onboarding.label_year', { defaultValue: 'In che anno sei nato?' })}</Text>
                    <TextInput
                        style={styles.input}
                        placeholder={t('onboarding.placeholder_year', { defaultValue: 'Es: 1990' })}
                        placeholderTextColor="#6B7280"
                        keyboardType="numeric"
                        maxLength={4}
                        value={birthYear}
                        onChangeText={setBirthYear}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.startBtn, (!name.trim() || birthYear.length < 4) ? styles.startBtnDisabled : null]}
                    onPress={completeOnboarding}
                    disabled={!name.trim() || birthYear.length < 4}
                >
                    <Text style={styles.startBtnText}>{t('onboarding.btn_start', { defaultValue: 'Inizia il tuo percorso' })}</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111827' },
    scrollContent: { padding: 24, paddingBottom: 60, justifyContent: 'center', flexGrow: 1 },
    title: { fontSize: 36, fontWeight: 'bold', color: '#60A5FA', marginBottom: 24, textAlign: 'center' },
    featureBox: { backgroundColor: '#1F2937', padding: 16, borderRadius: 12, marginBottom: 12 },
    featureTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    featureDesc: { color: '#9CA3AF', fontSize: 14, lineHeight: 20 },
    inputContainer: { marginTop: 24, marginBottom: 12 },
    inputLabel: { color: '#E5E7EB', fontSize: 16, fontWeight: '600', marginBottom: 8 },
    input: { backgroundColor: '#1F2937', color: 'white', padding: 16, borderRadius: 12, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: '#374151' },
    startBtn: { backgroundColor: '#10B981', paddingVertical: 16, borderRadius: 99, alignItems: 'center', marginTop: 16 },
    startBtnDisabled: { backgroundColor: '#374151', opacity: 0.5 },
    startBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});
