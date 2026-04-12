import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated, ScrollView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(width * 0.75, 300);

export default function Layout({ screens, currentRoute, setCurrentRoute }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { user, isDarkMode, toggleTheme, logout, theme } = useApp();
  
  const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);
  const [layoutWidth, setLayoutWidth] = useState(Dimensions.get('window').width > 480 ? 480 : Dimensions.get('window').width);
  const isProgrammaticScroll = useRef(false);

  useEffect(() => {
    if (isDrawerOpen) {
      Animated.parallel([
        Animated.timing(drawerAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(drawerAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [isDrawerOpen]);

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

  const handleLogout = () => {
    logout();
    setIsDrawerOpen(false);
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
              {screens[tab.id] ? React.cloneElement(screens[tab.id], { openDrawer: () => setIsDrawerOpen(true) }) : null}
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

      {/* Drawer Overlay */}
      <Animated.View 
        style={[
          styles.overlay, 
          { 
            opacity: overlayAnim,
            pointerEvents: isDrawerOpen ? 'auto' : 'none'
          }
        ]}
      >
        <TouchableOpacity 
          style={{ flex: 1 }} 
          activeOpacity={1} 
          onPress={() => setIsDrawerOpen(false)} 
        />
      </Animated.View>

      {/* Drawer */}
      <Animated.View 
        style={[
          styles.drawer, 
          { 
            backgroundColor: theme.surface, 
            borderColor: theme.border,
            transform: [{ translateX: drawerAnim }]
          }
        ]}
      >
        <View style={[styles.drawerHeader, { borderBottomColor: theme.border }]}>
          <Text style={[styles.drawerTitle, { color: theme.text }]}>Menu</Text>
          <TouchableOpacity onPress={() => setIsDrawerOpen(false)} style={styles.closeBtn}>
            <Feather name="x" size={24} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.drawerItem} onPress={toggleTheme}>
          <Feather name={isDarkMode ? 'sun' : 'moon'} size={20} color={theme.text} />
          <Text style={[styles.drawerItemText, { color: theme.text }]}>
            {isDarkMode ? 'Light Mode' : 'Dark Mode'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.drawerItem, { marginTop: 'auto', marginBottom: 20 }]} onPress={handleLogout}>
          <Feather name="log-out" size={20} color={theme.danger} />
          <Text style={[styles.drawerItemText, { color: theme.danger }]}>Logout</Text>
        </TouchableOpacity>
      </Animated.View>
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
  tabLabel: { fontSize: 10, letterSpacing: 0.5 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 10 },
  drawer: { 
    position: 'absolute', top: 0, bottom: 0, left: 0, 
    width: DRAWER_WIDTH, zIndex: 20, padding: 20,
    borderRightWidth: 1,
  },
  drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottomWidth: 1, marginBottom: 20 },
  drawerTitle: { fontSize: 20, fontWeight: '900' },
  closeBtn: { padding: 4 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  drawerItemText: { fontSize: 16, marginLeft: 16, fontWeight: '700' }
});
