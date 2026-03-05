import React, { useEffect, useState, memo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    withSequence,
    Easing,
    runOnJS
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');
const CONFETTI_COUNT = 40;
const COLORS = ['#FCD34D', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899'];

interface ConfettiPieceProps {
    index: number;
    onComplete: () => void;
}

const ConfettiPiece = memo(({ index, onComplete }: ConfettiPieceProps) => {
    const x = Math.random() * width;
    const size = Math.random() * 8 + 6;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const rotate = Math.random() * 360;

    // Animations
    const translateY = useSharedValue(-20);
    const opacity = useSharedValue(1);
    const rotation = useSharedValue(rotate);

    useEffect(() => {
        const duration = 2500 + Math.random() * 1500;
        const delay = Math.random() * 500;

        translateY.value = withDelay(
            delay,
            withTiming(height + 20, {
                duration,
                easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            }, (finished) => {
                if (finished && index === CONFETTI_COUNT - 1) {
                    runOnJS(onComplete)();
                }
            })
        );

        rotation.value = withDelay(
            delay,
            withTiming(rotate + 720, {
                duration,
                easing: Easing.linear,
            })
        );

        opacity.value = withDelay(
            delay + duration * 0.7,
            withTiming(0, { duration: duration * 0.3 })
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateY: translateY.value },
            { translateX: x },
            { rotate: `${rotation.value}deg` }
        ] as any,
        opacity: opacity.value,
        backgroundColor: color,
        width: size,
        height: size,
        borderRadius: Math.random() > 0.5 ? size / 2 : 2,
    }));

    return <Animated.View style={[styles.confetti, animatedStyle]} />;
});

interface ConfettiCelebrationProps {
    visible: boolean;
    onComplete: () => void;
}

export default function ConfettiCelebration({ visible, onComplete }: ConfettiCelebrationProps) {
    const [isRendered, setIsRendered] = useState(false);

    useEffect(() => {
        if (visible) {
            setIsRendered(true);
        }
    }, [visible]);

    const handleComplete = () => {
        setIsRendered(false);
        onComplete();
    };

    if (!isRendered) return null;

    return (
        <View style={styles.container} pointerEvents="none">
            {[...Array(CONFETTI_COUNT)].map((_, i) => (
                <ConfettiPiece key={i} index={i} onComplete={handleComplete} />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 9999,
        elevation: 10,
    },
    confetti: {
        position: 'absolute',
        top: 0,
    },
});
