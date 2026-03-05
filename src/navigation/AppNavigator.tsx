import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import GoalHistoryScreen from '../screens/GoalHistoryScreen';
import ActivitiesScreen from '../screens/ActivitiesScreen';
import CheckInScreen from '../screens/CheckInScreen';
import SkillScreen from '../screens/SkillScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import { useTranslation } from 'react-i18next';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
    const { t } = useTranslation();

    return (
        <Tab.Navigator
            id="mainTabs"
            screenOptions={({ route }) => ({
                headerShown: true,
                headerStyle: { backgroundColor: '#1F2937', shadowColor: 'transparent', elevation: 0 },
                headerTintColor: '#E5E7EB',
                headerTitleStyle: { fontWeight: 'bold' },
                tabBarStyle: { backgroundColor: '#1F2937', borderTopColor: '#374151' },
                tabBarActiveTintColor: '#3B82F6',
                tabBarInactiveTintColor: '#9CA3AF',
                tabBarIcon: ({ color, size }) => {
                    let iconName: any = 'home';
                    if (route.name === 'Home') iconName = 'home';
                    else if (route.name === 'Activities') iconName = 'fitness';
                    else if (route.name === 'GoalHistory') iconName = 'flag';
                    else if (route.name === 'History') iconName = 'calendar';
                    return <Ionicons name={iconName} size={size} color={color} />;
                }
            })}
        >
            <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: t('tabs.home'), headerTitle: t('headers.home') }} />
            <Tab.Screen name="Activities" component={ActivitiesScreen} options={{ tabBarLabel: t('tabs.activities'), headerTitle: t('headers.activities') }} />
            <Tab.Screen name="GoalHistory" component={GoalHistoryScreen} options={{ tabBarLabel: t('tabs.goals'), headerTitle: t('headers.goals') }} />
            <Tab.Screen name="History" component={HistoryScreen} options={{ tabBarLabel: t('tabs.history'), headerTitle: t('headers.history') }} />
        </Tab.Navigator >
    );
}

export default function AppNavigator() {
    const [initialRoute, setInitialRoute] = useState<string | null>(null);

    useEffect(() => {
        const checkOnboarding = async () => {
            try {
                const hasCompleted = await AsyncStorage.getItem('hasCompletedOnboarding');
                setInitialRoute(hasCompleted === 'true' ? 'MainTabs' : 'Onboarding');
            } catch (e) {
                setInitialRoute('Onboarding');
            }
        };
        checkOnboarding();
    }, []);

    if (!initialRoute) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' }}>
                <ActivityIndicator size="large" color="#3B82F6" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator id="rootStack" initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                <Stack.Screen name="MainTabs" component={MainTabs} />
                <Stack.Screen name="CheckInFlow" component={CheckInScreen} options={{ presentation: 'modal' }} />
                <Stack.Screen name="SkillScreen" component={SkillScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
