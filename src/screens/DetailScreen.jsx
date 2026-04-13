import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';

const { width } = Dimensions.get('window');

const PROJETOS = {
  '1': {
    nome: 'Desert Fox', categoria: 'ANIMAL KINGDOM', nivel: 'Intermediate',
    tempo: '45-60 Mins', tamanho: '20 x 20 cm', folhas: '1 Square',
    avaliacao: 4.8, reviews: '1.2k', icon: 'github', bg: '#1A1A35',
    descricao: "The Red Fox is a classic modular origami challenge. This model utilizes the complex 'Petal Fold' technique to achieve its signature bushy tail and sharp snout. Perfect for intermediate folders seeking precision.",
    materiais: [
      { icon: 'file', nome: 'Washi Paper',  desc: 'Traditional handmade Japanese paper' },
      { icon: 'edit-2', nome: 'Bone Folder',  desc: 'For creating sharp, crisp creases' },
    ],
    tecnicas: ['Petal Fold', 'Inside Reverse Fold', 'Rabbit Ear Fold']
  },
  '2': {
    nome: 'Classic Crane', categoria: 'TRADITIONAL', nivel: 'Beginner',
    tempo: '10-15 Mins', tamanho: '15 x 15 cm', folhas: '1 Square',
    avaliacao: 4.9, reviews: '5.4k', icon: 'twitter', bg: '#2A1A1A',
    descricao: "The most famous of all origami models. The crane is a symbol of peace and healing. It is said that folding 1000 cranes will grant you a wish.",
    materiais: [
      { icon: 'file', nome: 'Kami Paper',  desc: 'Standard origami paper' },
    ],
    tecnicas: ['Valley Fold', 'Mountain Fold', 'Squash Fold']
  },
  '3': {
    nome: 'Elegant Swan', categoria: 'BIRDS', nivel: 'Advanced',
    tempo: '60-90 Mins', tamanho: '25 x 25 cm', folhas: '1 Square',
    avaliacao: 4.7, reviews: '800', icon: 'feather', bg: '#1A2A2A',
    descricao: "A beautiful and complex swan model with detailed wings and a graceful neck. Requires patience and precise folding.",
    materiais: [
      { icon: 'file-text', nome: 'Foil Paper',  desc: 'Holds creases well for complex models' },
      { icon: 'maximize', nome: 'Ruler',  desc: 'For precise measurements' },
    ],
    tecnicas: ['Crimp Fold', 'Outside Reverse Fold', 'Pleat Fold']
  }
};

export default function DetailScreen() {
  const { currentDetail, setCurrentDetail, theme, saveOrigami, savedOrigamis, setCurrentRoute, setFoldingOrigami } = useApp();
  const projeto = PROJETOS[currentDetail] || PROJETOS['1'];
  
  const isSaved = savedOrigamis.some(o => o.id === currentDetail);

  const handleSave = () => {
    saveOrigami({ id: currentDetail, ...projeto });
  };

  const handleStartFolding = () => {
    setFoldingOrigami(currentDetail);
  };

  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header Image Area */}
        <View style={[s.headerImg, { backgroundColor: projeto.bg }]}>
          <View style={s.topNav}>
            <TouchableOpacity style={[s.navBtn, { backgroundColor: 'rgba(0,0,0,0.3)' }]} onPress={() => setCurrentDetail(null)}>
              <Feather name="arrow-left" size={24} color="#FFF" />
            </TouchableOpacity>
            <View style={s.navRight}>
              <TouchableOpacity style={[s.navBtn, { backgroundColor: 'rgba(0,0,0,0.3)', marginRight: 10 }]}>
                <Feather name="share" size={20} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity style={[s.navBtn, { backgroundColor: 'rgba(0,0,0,0.3)' }]} onPress={handleSave}>
                <Feather name="heart" size={20} color={isSaved ? theme.danger : "#FFF"} />
              </TouchableOpacity>
            </View>
          </View>
          <Feather name={projeto.icon} size={120} color="#fff" style={s.headerEmoji} />
        </View>

        {/* Content */}
        <View style={s.content}>
          <View style={s.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[s.categoria, { color: theme.primary }]}>{projeto.categoria}</Text>
              <Text style={[s.title, { color: theme.text }]}>{projeto.nome}</Text>
            </View>
          </View>

          <Text style={[s.desc, { color: theme.textMuted }]}>{projeto.descricao}</Text>

          {/* Info Grid */}
          <View style={s.infoGrid}>
            {[
              { label: 'Difficulty', val: projeto.nivel, icon: 'target' },
              { label: 'Time',       val: projeto.tempo, icon: 'clock' },
              { label: 'Paper Size', val: projeto.tamanho, icon: 'maximize' },
              { label: 'Sheets',     val: projeto.folhas, icon: 'file' },
            ].map((item, i) => (
              <View key={i} style={[s.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Feather name={item.icon} size={24} color={theme.primary} style={s.infoIcon} />
                <Text style={[s.infoLabel, { color: theme.textDim }]}>{item.label}</Text>
                <Text style={[s.infoVal, { color: theme.text }]}>{item.val}</Text>
              </View>
            ))}
          </View>

          {/* Materials */}
          <Text style={[s.sectionTitle, { color: theme.text }]}>Required Materials</Text>
          {projeto.materiais.map((m, i) => (
            <View key={i} style={[s.matRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={[s.matIconWrap, { backgroundColor: theme.bg }]}>
                <Feather name={m.icon} size={24} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.matName, { color: theme.text }]}>{m.nome}</Text>
                <Text style={[s.matDesc, { color: theme.textMuted }]}>{m.desc}</Text>
              </View>
            </View>
          ))}

          {/* Techniques */}
          <Text style={[s.sectionTitle, { color: theme.text, marginTop: 24 }]}>Techniques Used</Text>
          <View style={s.techRow}>
            {projeto.tecnicas.map((t, i) => (
              <View key={i} style={[s.techBadge, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[s.techText, { color: theme.text }]}>{t}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action */}
      <View style={[s.bottomBar, { backgroundColor: theme.bg, borderTopColor: theme.border }]}>
        <TouchableOpacity style={[s.startBtn, { backgroundColor: theme.primary }]} activeOpacity={0.8} onPress={handleStartFolding}>
          <Text style={[s.startBtnText, { color: theme.bg }]}>Start Folding</Text>
          <Feather name="arrow-right" size={20} color={theme.bg} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  
  headerImg: { height: 320, alignItems: 'center', justifyContent: 'center' },
  topNav: { position: 'absolute', top: 50, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', zIndex: 10 },
  navBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' },
  navRight: { flexDirection: 'row' },
  headerEmoji: { textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 10 }, textShadowRadius: 20 },

  content: { padding: 24, marginTop: -30, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  categoria: { fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, gap: 4 },
  ratingText: { fontSize: 14, fontWeight: '800' },
  reviewsText: { fontSize: 12 },

  desc: { fontSize: 15, lineHeight: 24, marginBottom: 24 },

  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 32 },
  infoCard: { width: '48%', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  infoIcon: { marginBottom: 12 },
  infoLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  infoVal: { fontSize: 15, fontWeight: '800' },

  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  matRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  matIconWrap: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  matName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  matDesc: { fontSize: 13 },

  techRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  techBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  techText: { fontSize: 13, fontWeight: '600' },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 34, borderTopWidth: 1 },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 16, gap: 10, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  startBtnText: { fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
});
