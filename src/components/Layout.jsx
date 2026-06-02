import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Animated, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';

export default function Layout({ screens, currentRoute, setCurrentRoute }) {
  const { user, theme, isFullscreenVideo } = useApp();

  const scrollViewRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const isTabPress = useRef(false);
  const lastScreenWidth = useRef(null);
  const [windowDims, setWindowDims] = useState(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setWindowDims(window);
    });
    return () => subscription?.remove();
  }, []);

  const screenWidth = windowDims.width;

  const tabs = [
    { id: 'Discover', label: 'Discover', icon: 'compass' },
    { id: 'Library', label: 'Library', icon: 'book' },
  ];

  if (user?.isPro) {
    tabs.push({ id: 'TeacherPro', label: 'Pro', icon: 'award' });
  }

  tabs.push({ id: 'Profile', label: 'Profile', icon: 'user' });

  useEffect(() => {
    const index = tabs.findIndex(t => t.id === currentRoute);
    if (index === -1 || !scrollViewRef.current || screenWidth <= 0) return;

    if (isTabPress.current) {
      // Tab button was pressed: animate scroll to the new screen
      scrollViewRef.current.scrollTo({ x: index * screenWidth, animated: true });
      const timer = setTimeout(() => { isTabPress.current = false; }, 400);
      return () => clearTimeout(timer);
    }

    // Screen rotated: re-snap to current screen without animation
    if (lastScreenWidth.current !== null && lastScreenWidth.current !== screenWidth) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: index * screenWidth, animated: false });
      }, 50);
    }
    lastScreenWidth.current = screenWidth;
  }, [currentRoute, screenWidth]);

  const handleMomentumScrollEnd = (e) => {
    isTabPress.current = false;
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth);
    if (tabs[index] && tabs[index].id !== currentRoute) {
      setCurrentRoute(tabs[index].id);
    }
  };

  const handleTabPress = (tabId) => {
    if (tabId !== currentRoute) {
      isTabPress.current = true;
      setCurrentRoute(tabId);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.content}>
        <Animated.ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          scrollEnabled={!isFullscreenVideo}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          bounces={false}
          snapToInterval={screenWidth}
          disableIntervalMomentum={true}
          decelerationRate="fast"
          keyboardShouldPersistTaps="handled"
        >
          {tabs.map((tab) => (
            <View style={{ width: screenWidth, flex: 1 }} key={tab.id}>
              {screens[tab.id] ? React.cloneElement(screens[tab.id]) : null}
            </View>
          ))}
        </Animated.ScrollView>
      </View>

      {!isFullscreenVideo && (
        <View style={[styles.tabBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {tabs.map((tab, index) => {
            const isActive = currentRoute === tab.id;

            // Animate the icon background pill in real time as user swipes
            const inputRange = tabs.map((_, i) => i * screenWidth);
            const bgOpacity = scrollX.interpolate({
              inputRange,
              outputRange: tabs.map((_, i) => (i === index ? 1 : 0)),
              extrapolate: 'clamp',
            });

            const inactiveOpacity = scrollX.interpolate({
              inputRange,
              outputRange: tabs.map((_, i) => (i === index ? 0 : 1)),
              extrapolate: 'clamp',
            });

            return (
              <TouchableOpacity
                key={tab.id}
                style={styles.tabItem}
                onPress={() => handleTabPress(tab.id)}
                activeOpacity={0.8}
              >
                <View style={styles.iconWrapOuter}>
                  {/* Oval de fundo — anima com scrollX */}
                  <Animated.View
                    style={[
                      StyleSheet.absoluteFill,
                      styles.iconWrapBg,
                      { backgroundColor: theme.primaryLight, opacity: bgOpacity },
                    ]}
                  />
                  {/* Ícone inativo — desaparece junto com o oval */}
                  <Animated.View style={[StyleSheet.absoluteFill, styles.iconCenter, { opacity: inactiveOpacity }]}>
                    <Feather name={tab.icon} size={22} color={theme.textDim} />
                  </Animated.View>
                  {/* Ícone ativo — aparece junto com o oval */}
                  <Animated.View style={[StyleSheet.absoluteFill, styles.iconCenter, { opacity: bgOpacity }]}>
                    <Feather name={tab.icon} size={22} color={theme.primary} />
                  </Animated.View>
                </View>
                <View style={styles.labelWrap}>
                  <Animated.Text style={[styles.tabLabel, { color: theme.textDim, fontWeight: '600', opacity: inactiveOpacity }]}>
                    {tab.label}
                  </Animated.Text>
                  <Animated.Text style={[styles.tabLabel, { color: theme.primary, fontWeight: '800', opacity: bgOpacity, position: 'absolute' }]}>
                    {tab.label}
                  </Animated.Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  tabBar: {
    height: 65,
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingBottom: 5,
    paddingTop: 5,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabItem: { alignItems: 'center', justifyContent: 'center', width: 70 },
  iconWrapOuter: {
    width: 40,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    overflow: 'hidden',
  },
  iconWrapBg: {
    borderRadius: 16,
  },
  iconCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: { fontSize: 10, letterSpacing: 0.5, textAlign: 'center' },
  labelWrap: { height: 13, alignItems: 'center', justifyContent: 'center' },
});
