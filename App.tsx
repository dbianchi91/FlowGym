import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';
import { initDatabase } from './src/data/database';
import { setupDailyNotification } from './src/services/notificationService';
import { ToastProvider } from './src/components/ToastProvider';
import './src/i18n'; // Initialize i18n

export default function App() {
    const [dbInitialized, setDbInitialized] = useState<boolean>(false);

    useEffect(() => {
        const setup = async () => {
            try {
                await initDatabase();
                await setupDailyNotification();
                setDbInitialized(true);
            } catch (e) {
                console.error("Failed to initialize database", e);
            }
        };
        setup();
    }, []);

    if (!dbInitialized) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' }}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={{ color: 'white', marginTop: 16 }}>Inizializzazione offline in corso...</Text>
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <ToastProvider>
                <AppNavigator />
            </ToastProvider>
        </GestureHandlerRootView>
    );
}
