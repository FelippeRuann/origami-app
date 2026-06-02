import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { haptic } from '../utils/haptics';

const DURATION = 3500;

export default function AchievementToast() {
  const { newAchievement, setNewAchievement, theme, hapticsEnabled } = useApp();
  const translateY = useRef(new Animated.Value(-200)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(1)).current;
  const timer = useRef(null);

  useEffect(() => {
    if (!newAchievement) return;

    haptic.success(hapticsEnabled);
    translateY.setValue(-200);
    opacity.setValue(0);
    progress.setValue(1);

    Animated.parallel([
      Animated.spring(translateY, { toValue: 60, useNativeDriver: true, tension: 80, friction: 12 }),
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();

    Animated.timing(progress, { toValue: 0, duration: DURATION, useNativeDriver: false }).start();

    timer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -200, duration: 350, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => setNewAchievement(null));
    }, DURATION);

    return () => clearTimeout(timer.current);
  }, [newAchievement]);

  if (!newAchievement) return null;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { backgroundColor: theme.card, borderColor: theme.primary, transform: [{ translateY }], opacity },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${theme.primary}28` }]}>
        <Feather name={newAchievement.icon} size={22} color={theme.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.label, { color: theme.primary }]}>Conquista desbloqueada!</Text>
        <Text style={[styles.title, { color: theme.text }]}>{newAchievement.title}</Text>
        <Text style={[styles.desc, { color: theme.textMuted }]} numberOfLines={1}>{newAchievement.desc}</Text>
      </View>
      <Feather name="award" size={20} color={theme.primary} style={{ opacity: 0.5 }} />
      <Animated.View
        style={[
          styles.progressFill,
          {
            backgroundColor: theme.primary,
            width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 0,
    zIndex: 9999,
    elevation: 20,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    overflow: 'hidden',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { fontSize: 15, fontWeight: '800' },
  desc: { fontSize: 12, marginTop: 1 },
  progressFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 3,
    borderRadius: 2,
  },
});
