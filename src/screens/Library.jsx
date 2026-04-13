import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useApp } from '../context/AppContext';

const { width } = Dimensions.get('window');

const PROJECTS = [
  { id: '1', title: 'Origami Crane', progress: 100, date: 'Oct 24', icon: 'twitter', bg: '#BE123C' },
  { id: '2', title: 'Modular Box',   progress: 60,  date: 'Oct 28', icon: 'box', bg: '#0E7490' },
];

const SAVED = [
  { id: '1', title: 'Desert Fox',    difficulty: 'INTERMEDIATE', difficultyColor: '#3B82F6', icon: 'github', bg: '#C2410C' },
  { id: '2', title: 'Elegant Swan',  difficulty: 'ADVANCED',     difficultyColor: '#F59E0B', icon: 'feather', bg: '#0E7490' },
  { id: '3', title: 'Jumping Frog',  difficulty: 'BEGINNER',     difficultyColor: '#22C55E', icon: 'smile', bg: '#15803D' },
  { id: '4', title: 'Paper Plane',   difficulty: 'BEGINNER',     difficultyColor: '#22C55E', icon: 'send', bg: '#4338CA' },
];

const INITIAL_FILES = [
  { id: '1', title: 'Origami_Basics.pdf', size: '2.4 MB' },
  { id: '2', title: 'Advanced_Dragons.pdf', size: '5.1 MB' },
];

export default function Library({ openDrawer }) {
  const [tab, setTab] = useState('Projects'); // 'Projects' | 'Saved' | 'Files'
  const [files, setFiles] = useState(INITIAL_FILES);
  const { theme, setCurrentDetail } = useApp();

  const handleImportPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const newFile = {
          id: Date.now().toString(),
          title: file.name,
          size: file.size ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : 'Unknown size'
        };
        setFiles([newFile, ...files]);
      }
    } catch (error) {
      console.error("Erro ao importar PDF:", error);
    }
  };

  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      {/* Top bar */}
      <View style={[s.topBar, { backgroundColor: theme.bg }]}>
        <TouchableOpacity onPress={openDrawer}>
          <Feather name="menu" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={[s.logo, { color: theme.text }]}><Text style={{ color: theme.primary }}>Origami</Text>App</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={s.header}>
        <Text style={[s.title, { color: theme.text }]}>My Library</Text>
      </View>

      {/* Tabs */}
      <View style={[s.tabContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {['Projects', 'Saved', 'Files'].map((t) => (
          <TouchableOpacity
            key={t}
            style={[s.tabBtn, tab === t && { backgroundColor: theme.primary }]}
            onPress={() => setTab(t)}
          >
            <Text style={[s.tabText, { color: tab === t ? theme.bg : theme.textMuted }]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {tab === 'Projects' && (
          <View style={s.projectList}>
            {PROJECTS.map(p => (
              <View key={p.id} style={[s.projectCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={[s.projectIcon, { backgroundColor: p.bg }]}>
                  <Feather name={p.icon} size={24} color="#fff" />
                </View>
                <View style={s.projectInfo}>
                  <Text style={[s.projectTitle, { color: theme.text }]}>{p.title}</Text>
                  <Text style={[s.projectDate, { color: theme.textDim }]}>Last edited: {p.date}</Text>
                  <View style={[s.progressBg, { backgroundColor: theme.bg }]}>
                    <View style={[s.progressFill, { width: `${p.progress}%`, backgroundColor: p.progress === 100 ? theme.success : theme.primary }]} />
                  </View>
                </View>
                <TouchableOpacity style={[s.projectAction, { borderColor: theme.border }]}>
                  <Feather name="more-vertical" size={20} color={theme.text} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {tab === 'Saved' && (
          <View style={s.savedGrid}>
            {SAVED.map(item => (
              <TouchableOpacity key={item.id} style={[s.savedCard, { backgroundColor: theme.surface, borderColor: theme.border }]} activeOpacity={0.8} onPress={() => setCurrentDetail(item.id)}>
                <View style={[s.savedImage, { backgroundColor: item.bg }]}>
                  <Feather name={item.icon} size={48} color="#fff" style={{ opacity: 0.9 }} />
                  <View style={[s.diffBadge, { borderColor: item.difficultyColor }]}>
                    <Text style={[s.diffText, { color: item.difficultyColor }]}>{item.difficulty}</Text>
                  </View>
                </View>
                <View style={s.savedInfo}>
                  <Text style={[s.savedTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
                  <TouchableOpacity style={s.removeBtn}>
                    <Feather name="heart" size={18} color={theme.danger} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {tab === 'Files' && (
          <View style={s.filesList}>
            <TouchableOpacity style={[s.importBtn, { borderColor: theme.primary, backgroundColor: theme.primaryLight }]} onPress={handleImportPDF}>
              <Feather name="upload-cloud" size={24} color={theme.primary} style={{ marginBottom: 8 }} />
              <Text style={[s.importText, { color: theme.primary }]}>Import PDF</Text>
            </TouchableOpacity>

            {files.map(f => (
              <View key={f.id} style={[s.fileCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={[s.fileIcon, { backgroundColor: theme.bg }]}>
                  <Feather name="file-text" size={20} color={theme.danger} />
                </View>
                <View style={s.fileInfo}>
                  <Text style={[s.fileTitle, { color: theme.text }]}>{f.title}</Text>
                  <Text style={[s.fileSize, { color: theme.textDim }]}>{f.size}</Text>
                </View>
                <TouchableOpacity style={s.fileAction}>
                  <Feather name="more-vertical" size={20} color={theme.text} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 80 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 12,
  },
  logo:      { fontSize: 22, fontWeight: '800' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginTop: 10, marginBottom: 20,
  },
  title: { fontSize: 28, fontWeight: '900' },

  tabContainer: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 20,
    borderRadius: 12, padding: 4, borderWidth: 1,
  },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  tabText: { fontSize: 13, fontWeight: '700' },

  projectList: { gap: 12 },
  projectCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderRadius: 16, borderWidth: 1,
  },
  projectIcon: { width: 50, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  projectInfo: { flex: 1, marginLeft: 16 },
  projectTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  projectDate: { fontSize: 12, marginBottom: 8 },
  progressBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  projectAction: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  savedGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  savedCard: { width: '48%', borderRadius: 16, overflow: 'hidden', borderWidth: 1, marginBottom: 16 },
  savedImage: { height: 140, alignItems: 'center', justifyContent: 'center' },
  savedEmoji: { fontSize: 60 },
  diffBadge: { position: 'absolute', top: 8, right: 8, borderWidth: 1.5, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: 'rgba(0,0,0,0.5)' },
  diffText: { fontSize: 9, fontWeight: '800' },
  savedInfo: { padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  savedTitle: { fontSize: 14, fontWeight: '700', flex: 1 },
  removeBtn: { paddingLeft: 8 },

  filesList: { gap: 12 },
  importBtn: {
    borderWidth: 2, borderStyle: 'dashed', borderRadius: 16,
    padding: 24, alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  importText: { fontSize: 16, fontWeight: '700' },
  fileCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderRadius: 16, borderWidth: 1,
  },
  fileIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  fileInfo: { flex: 1, marginLeft: 16 },
  fileTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  fileSize: { fontSize: 12 },
  fileAction: { padding: 8 },
});
