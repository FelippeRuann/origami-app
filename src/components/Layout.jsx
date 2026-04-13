import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated, ScrollView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';

const { width } = Dimensions.get('window');

export default function Layout({ screens, currentRoute, setCurrentRoute }) {
  const { user, theme } = useApp();
  
  const scrollViewRef = useRef(null);
  const [layoutWidth, setLayoutWidth] = useState(Dimensions.get('window').width > 480 ? 480 : Dimensions.get('window').width);
  const isProgrammaticScroll = useRef(false);

  const tabs = [
    { id: 'Discover', label: 'Discover', icon: 'compass' },
    { id: 'Library', label: 'Library', icon: 'book' },
  ];

  if (user?.isPro || user?.isTeacher) {
    tabs.push({ id: 'TeacherPro', label: 'Pro', icon: 'award' });
  }

  tabs.push({ id: 'Profile', label: 'Profile', icon: 'user' });

  useEffect(() => {
    if (isProgrammaticScroll.current) {
      const index = tabs.findIndex(t => t.id === currentRoute);
      if (index !== -1 && scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ x: index * layoutWidth, animated: true });
      }
      const timer = setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [currentRoute, layoutWidth]);

  const handleScroll = (e) => {
    if (isProgrammaticScroll.current) return;
    const contentOffsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / layoutWidth);
    if (tabs[index] && tabs[index].id !== currentRoute) {
      setCurrentRoute(tabs[index].id);
    }
  };

  const handleTabPress = (tabId) => {
    if (tabId !== currentRoute) {
      isProgrammaticScroll.current = true;
      setCurrentRoute(tabId);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Main Content */}
      <View 
        style={styles.content}
        onLayout={(e) => setLayoutWidth(e.nativeEvent.layout.width)}
      >
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          bounces={false}
          snapToInterval={layoutWidth}
          disableIntervalMomentum={true}
          decelerationRate="fast"
          keyboardShouldPersistTaps="handled"
        >
          {tabs.map((tab) => (
            <View 
              style={{ width: layoutWidth, flex: 1 }} 
              key={tab.id}
            >
              {screens[tab.id] ? React.cloneElement(screens[tab.id]) : null}
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Bottom Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {tabs.map((tab) => {
          const isActive = currentRoute === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabItem}
              onPress={() => handleTabPress(tab.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconWrap, isActive && { backgroundColor: theme.primaryLight }]}>
                <Feather name={tab.icon} size={22} color={isActive ? theme.primary : theme.textDim} />
              </View>
              <Text style={[
                styles.tabLabel, 
                { color: isActive ? theme.primary : theme.textDim, fontWeight: isActive ? '800' : '600' }
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
    alignItems: 'center'
  },
  tabItem: { alignItems: 'center', justifyContent: 'center', width: 70 },
  iconWrap: {
    width: 40, height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4
  },
  tabLabel: { fontSize: 10, letterSpacing: 0.5 }
});
