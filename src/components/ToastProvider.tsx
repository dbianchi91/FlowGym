import React, { createContext, useState, useContext, ReactNode, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';

interface ToastContextType {
    showToast: (points: number, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { t } = useTranslation();
    const [toastMessage, setToastMessage] = useState<{ points: number, text: string } | null>(null);
    const translateY = useRef(new Animated.Value(-100)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    const showToast = (points: number, message: string = t('common.xp_earned', { defaultValue: 'XP Guadagnati!' })) => {
        setToastMessage({ points, text: message });

        // Reset
        translateY.setValue(-100);
        opacity.setValue(0);

        // Animate In
        Animated.parallel([
            Animated.spring(translateY, {
                toValue: 50,
                useNativeDriver: true,
                friction: 5,
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            })
        ]).start(() => {
            // Wait 2 seconds, then Animate Out
            setTimeout(() => {
                Animated.parallel([
                    Animated.timing(translateY, {
                        toValue: -100,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacity, {
                        toValue: 0,
                        duration: 300,
                        useNativeDriver: true,
                    })
                ]).start(() => setToastMessage(null));
            }, 2000);
        });
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {toastMessage && (
                <Animated.View style={[styles.toastContainer, { transform: [{ translateY }], opacity }]}>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>+{toastMessage.points} XP</Text>
                    </View>
                    <Text style={styles.messageText}>{toastMessage.text}</Text>
                </Animated.View>
            )}
        </ToastContext.Provider>
    );
};

const styles = StyleSheet.create({
    toastContainer: {
        position: 'absolute',
        top: 0,
        alignSelf: 'center',
        backgroundColor: '#1F2937',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 99,
        shadowColor: '#FCD34D',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#FCD34D',
        zIndex: 9999
    },
    badge: {
        backgroundColor: '#FCD34D',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: 10
    },
    badgeText: {
        color: '#78350F',
        fontWeight: '900',
        fontSize: 16
    },
    messageText: {
        color: '#F3F4F6',
        fontWeight: 'bold',
        fontSize: 14
    }
});
