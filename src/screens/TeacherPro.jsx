import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';

export default function TeacherPro({ openDrawer }) {
  const { theme } = useApp();

  const [students] = useState([
    { id: 1, name: 'Ana Clara', folds: 5 },
    { id: 2, name: 'Pedro Santos', folds: 12 },
    { id: 3, name: 'Lucas Lima', folds: 3 },
  ]);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { backgroundColor: theme.bg }]}>
        <TouchableOpacity onPress={openDrawer}>
          <Feather name="menu" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={[styles.logo, { color: theme.text }]}><Text style={{ color: theme.primary }}>Origami</Text>App</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Teacher Panel</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>Manage your students and activities</Text>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionBtnPrimary, { backgroundColor: theme.primary }]}>
            <Feather name="plus" size={24} color={theme.bg} style={{ marginBottom: 8 }} />
            <Text style={[styles.actionBtnPrimaryText, { color: theme.bg }]}>New Activity</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtnSecondary, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Feather name="users" size={24} color={theme.text} style={{ marginBottom: 8 }} />
            <Text style={[styles.actionBtnSecondaryText, { color: theme.text }]}>Add Student</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Activities</Text>
            <TouchableOpacity><Text style={[styles.linkText, { color: theme.primary }]}>View all</Text></TouchableOpacity>
          </View>
          
          <View style={[styles.activityCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.activityRow}>
              <View style={[styles.iconBox, { backgroundColor: theme.primaryLight }]}>
                <Feather name="file-text" size={20} color={theme.primary} />
              </View>
              <View style={styles.activityInfo}>
                <Text style={[styles.activityTitle, { color: theme.text }]}>Crane for Beginners</Text>
                <Text style={[styles.activitySubtitle, { color: theme.textMuted }]}>Sent to Class A</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.sendBtn}>
              <Feather name="send" size={18} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>My Students</Text>
            <View style={[styles.badge, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.badgeText, { color: theme.textDim }]}>{students.length} students</Text>
            </View>
          </View>
          
          <View style={[styles.studentsList, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {students.map((student, index) => (
              <View 
                key={student.id} 
                style={[
                  styles.studentItem, 
                  index !== students.length - 1 && [styles.studentBorder, { borderBottomColor: theme.border }]
                ]}
              >
                <View style={styles.studentRow}>
                  <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                    <Text style={[styles.avatarText, { color: theme.bg }]}>{student.name.charAt(0)}</Text>
                  </View>
                  <Text style={[styles.studentName, { color: theme.text }]}>{student.name}</Text>
                </View>
                <Text style={[styles.studentFolds, { color: theme.textMuted }]}>{student.folds} folds</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 12,
  },
  logo:      { fontSize: 22, fontWeight: '800' },

  header: { marginBottom: 24, marginTop: 10 },
  title: { fontSize: 24, fontWeight: '900' },
  subtitle: { fontSize: 14, marginTop: 4 },

  actionsRow: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  actionBtnPrimary: { flex: 1, padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  actionBtnPrimaryText: { fontWeight: '800', fontSize: 14 },
  actionBtnSecondary: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  actionBtnSecondaryText: { fontWeight: '800', fontSize: 14 },

  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  linkText: { fontSize: 13, fontWeight: '600' },

  activityCard: { padding: 16, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  activityRow: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  activityInfo: { marginLeft: 12 },
  activityTitle: { fontSize: 15, fontWeight: '700' },
  activitySubtitle: { fontSize: 12, marginTop: 2 },
  sendBtn: { padding: 8 },

  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  badgeText: { fontSize: 12, fontWeight: '600' },

  studentsList: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  studentItem: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  studentBorder: { borderBottomWidth: 1 },
  studentRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '800', fontSize: 14 },
  studentName: { fontSize: 15, fontWeight: '600', marginLeft: 12 },
  studentFolds: { fontSize: 13 }
});
