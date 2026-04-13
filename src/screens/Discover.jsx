import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';

const { width } = Dimensions.get('window');

// Dados estáticos (mock) para as categorias de origami
const CATEGORIES = [
  { id: '1', icon: 'github', label: 'Animals',     count: '124 Projects' },
  { id: '2', icon: 'sun', label: 'Flowers',     count: '88 Projects'  },
  { id: '3', icon: 'star', label: 'Decorative',  count: '92 Projects'  },
  { id: '4', icon: 'zap', label: 'Quick Folds', count: '210 Projects' },
];

// Dados estáticos (mock) para os origamis recomendados
const RECOMMENDED = [
  { id: '1', title: 'Desert Fox',    difficulty: 'INTERMEDIATE', difficultyColor: '#3B82F6', time: '15 min', steps: '25 steps', icon: 'github', bg: '#0E7490' },
  { id: '2', title: 'Classic Crane', difficulty: 'BEGINNER',     difficultyColor: '#22C55E', time: '8 min',  steps: '12 steps', icon: 'twitter', bg: '#BE123C' },
  { id: '3', title: 'Elegant Swan',  difficulty: 'ADVANCED',     difficultyColor: '#F59E0B', time: '35 min', steps: '42 steps', icon: 'feather', bg: '#C2410C' },
];

/**
 * Componente HeroBanner: Aquele banner grande em destaque no topo da tela.
 */
function HeroBanner({ theme }) {
  return (
    <View style={[s.hero, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[s.heroBlob1, { backgroundColor: theme.primary, opacity: 0.2 }]} />
      <View style={[s.heroBlob2, { backgroundColor: theme.secondary, opacity: 0.5 }]} />
      <View style={s.heroContent}>
        <Text style={[s.heroTag, { color: theme.primary }]}>✦ FEATURED CURRICULUM</Text>
        <Text style={[s.heroTitle, { color: theme.text }]}>The Zen of{'\n'}Folding:{'\n'}Advanced{'\n'}Techniques</Text>
        <Text style={[s.heroSub, { color: theme.textMuted }]}>
          Discover the meditative art of precision folding with our latest curriculum
          designed by world-renowned masters.
        </Text>
        <TouchableOpacity style={[s.heroBtn, { backgroundColor: theme.primary }]} activeOpacity={0.85}>
          <Text style={[s.heroBtnText, { color: theme.bg }]}>Start Folding →</Text>
        </TouchableOpacity>
      </View>
      <View style={s.heroShapes}>
        <View style={[s.shape, s.shapeTeal]}   />
        <View style={[s.shape, s.shapeGold]}   />
        <View style={[s.shape, s.shapePurple]} />
      </View>
    </View>
  );
}

/**
 * Componente RecommendedCard: Renderiza cada um dos cards de origamis recomendados.
 * Recebe o item (dados do origami), o tema atual e a função para abrir os detalhes.
 */
function RecommendedCard({ item, theme, setCurrentDetail }) {
  const [liked, setLiked] = useState(false); // Estado local para o botão de curtir (coração)
  return (
    <View style={[s.recCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[s.recImage, { backgroundColor: item.bg }]}>
        <Feather name={item.icon} size={60} color="#fff" style={{ opacity: 0.8 }} />
        <View style={[s.diffBadge, { borderColor: item.difficultyColor }]}>
          <Text style={[s.diffText, { color: item.difficultyColor }]}>{item.difficulty}</Text>
        </View>
        <TouchableOpacity style={s.likeBtn} onPress={() => setLiked(!liked)}>
          <Feather name="heart" size={20} color={liked ? theme.danger : "#fff"} />
        </TouchableOpacity>
      </View>
      <View style={s.recInfo}>
        <Text style={[s.recTitle, { color: theme.text }]}>{item.title}</Text>
        <View style={s.recMeta}>
          <Feather name="clock" size={14} color={theme.textMuted} />
          <Text style={[s.recMetaText, { color: theme.textMuted }]}> {item.time}  </Text>
          <Feather name="list" size={14} color={theme.textMuted} />
          <Text style={[s.recMetaText, { color: theme.textMuted }]}> {item.steps}</Text>
        </View>
        <TouchableOpacity style={[s.startBtn, { backgroundColor: theme.primary }]} activeOpacity={0.85} onPress={() => setCurrentDetail(item.id)}>
          <Text style={[s.startBtnText, { color: theme.bg }]}>Start Folding</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * Discover: A tela principal do aplicativo (o "Feed").
 * Mostra a barra de busca, o banner, as categorias e as recomendações.
 */
export default function Discover() {
  const [email, setEmail] = useState(''); // Estado para o campo de newsletter
  const [searchQuery, setSearchQuery] = useState(''); // Estado da barra de busca
  const [isSearchFocused, setIsSearchFocused] = useState(false); // Efeito visual da barra de busca
  
  // Pega o tema e a função de navegação do contexto global
  const { theme, setCurrentDetail } = useApp();

  // Filtra a lista de recomendados com base no que o usuário digitou na busca
  const filteredRecommended = RECOMMENDED.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Truque/Easter Egg: Se buscar por "drag" e não achar nada, mostra um dragão secreto
  const displayRecommended = searchQuery.toLowerCase().includes('drag') && filteredRecommended.length === 0
    ? [{ id: 'drag1', title: 'Ancient Dragon', difficulty: 'EXPERT', difficultyColor: '#E11D48', time: '120 min', steps: '145 steps', icon: 'wind', bg: '#881337' }]
    : filteredRecommended;

  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      {/* Top bar (Cabeçalho com a Logo) */}
      <View style={[s.topBar, { backgroundColor: theme.bg }]}>
        <Text style={[s.logo, { color: theme.text }]}><Text style={{ color: theme.primary }}>Origami</Text>App</Text>
      </View>

      {/* Barra de Busca */}
      <View style={s.searchContainer}>
        <View style={[
          s.searchBar, 
          { backgroundColor: theme.surface, borderColor: isSearchFocused ? 'transparent' : theme.border }
        ]}>
          <Feather name="search" size={20} color={theme.textDim} />
          <TextInput 
            style={[s.searchInput, { color: theme.text, outlineStyle: 'none' }]} 
            placeholder="Search origami models..." 
            placeholderTextColor={theme.textDim}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <HeroBanner theme={theme} />

        {/* Categories */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: theme.text }]}>Categories</Text>
            <TouchableOpacity><Text style={[s.viewAll, { color: theme.primary }]}>View All</Text></TouchableOpacity>
          </View>
          <View style={s.catGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity key={cat.id} style={[s.catCard, { backgroundColor: theme.surface, borderColor: theme.border }]} activeOpacity={0.75}>
                <Feather name={cat.icon} size={24} color={theme.primary} style={{ marginBottom: 8 }} />
                <Text style={[s.catLabel, { color: theme.text }]}>{cat.label}</Text>
                <Text style={[s.catCount, { color: theme.textMuted }]}>{cat.count}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recommended */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: theme.text }]}>
              {searchQuery ? 'Search Results' : 'Recommended for you'}
            </Text>
            {!searchQuery && (
              <View style={s.arrowRow}>
                <TouchableOpacity style={[s.arrowBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Feather name="chevron-left" size={20} color={theme.text} />
                </TouchableOpacity>
                <TouchableOpacity style={[s.arrowBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Feather name="chevron-right" size={20} color={theme.text} />
                </TouchableOpacity>
              </View>
            )}
          </View>
          {displayRecommended.length > 0 ? (
            displayRecommended.map((item) => <RecommendedCard key={item.id} item={item} theme={theme} setCurrentDetail={setCurrentDetail} />)
          ) : (
            <Text style={{ color: theme.textMuted, textAlign: 'center', paddingVertical: 20 }}>No models found for "{searchQuery}"</Text>
          )}
        </View>

        {/* Newsletter */}
        <View style={[s.newsletter, { backgroundColor: theme.secondary, borderColor: theme.border }]}>
          <Text style={[s.nlTitle, { color: theme.text }]}>Join our community{'\n'}of folders</Text>
          <Text style={[s.nlSub, { color: theme.textMuted }]}>
            Receive weekly inspiration, exclusive paper textures, and community challenges directly in your inbox.
          </Text>
          <View style={s.nlRow}>
            <TextInput
              style={[s.nlInput, { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border }]}
              placeholder="Your email address"
              placeholderTextColor={theme.textDim}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            <TouchableOpacity style={[s.nlBtn, { backgroundColor: theme.primary }]} activeOpacity={0.85}>
              <Text style={[s.nlBtnText, { color: theme.bg }]}>Join{'\n'}Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 80 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 12,
  },
  logo:      { fontSize: 22, fontWeight: '800' },
  
  searchContainer: { paddingHorizontal: 16, paddingBottom: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, borderWidth: 1, gap: 12 },
  searchInput: { flex: 1, fontSize: 15 },

  hero: {
    margin: 16, borderRadius: 20,
    overflow: 'hidden', minHeight: 260, borderWidth: 1,
  },
  heroBlob1:   { position: 'absolute', width: 160, height: 160, borderRadius: 80, top: -40, right: -40 },
  heroBlob2:   { position: 'absolute', width: 100, height: 100, borderRadius: 50, bottom: 20, left: -20 },
  heroContent: { padding: 22, zIndex: 2 },
  heroTag:     { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 10 },
  heroTitle:   { fontSize: 26, fontWeight: '900', lineHeight: 32, marginBottom: 10 },
  heroSub:     { fontSize: 13, lineHeight: 20, marginBottom: 18 },
  heroBtn:     { paddingVertical: 12, paddingHorizontal: 22, borderRadius: 10, alignSelf: 'flex-start' },
  heroBtnText: { fontWeight: '800', fontSize: 14 },
  heroShapes:  { position: 'absolute', right: 16, top: 16, gap: 8 },
  shape:       { width: 60, height: 60, borderRadius: 6, opacity: 0.85 },
  shapeTeal:   { backgroundColor: '#0D9488', transform: [{ rotate: '15deg' }] },
  shapeGold:   { backgroundColor: '#D97706', transform: [{ rotate: '-10deg' }], marginTop: -20, marginLeft: 20 },
  shapePurple: { backgroundColor: '#7C3AED', transform: [{ rotate: '30deg' }], marginTop: -25 },

  section:       { paddingHorizontal: 16, marginTop: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle:  { fontSize: 18, fontWeight: '800' },
  viewAll:       { fontSize: 13, fontWeight: '600' },

  catGrid:  { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  catCard:  { width: '48%', borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 16 },
  catLabel: { fontSize: 15, fontWeight: '700' },
  catCount: { fontSize: 12, marginTop: 3 },

  arrowRow:  { flexDirection: 'row', gap: 8 },
  arrowBtn:  { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  recCard:      { borderRadius: 16, overflow: 'hidden', marginBottom: 16, borderWidth: 1 },
  recImage:     { height: 180, alignItems: 'center', justifyContent: 'center' },
  diffBadge:    { position: 'absolute', top: 12, right: 12, borderWidth: 1.5, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: 'rgba(0,0,0,0.5)' },
  diffText:     { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  likeBtn:      { position: 'absolute', top: 12, left: 12 },
  recInfo:      { padding: 16 },
  recTitle:     { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  recMeta:      { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  recMetaText:  { fontSize: 13 },
  startBtn:     { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  startBtnText: { fontWeight: '800', fontSize: 14 },

  newsletter: { margin: 16, marginTop: 24, borderRadius: 20, padding: 22, borderWidth: 1 },
  nlTitle:    { fontSize: 20, fontWeight: '900', marginBottom: 10 },
  nlSub:      { fontSize: 13, lineHeight: 19, marginBottom: 18 },
  nlRow:      { flexDirection: 'row', gap: 10 },
  nlInput:    { flex: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, borderWidth: 1 },
  nlBtn:      { borderRadius: 10, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  nlBtnText:  { fontWeight: '900', fontSize: 12, textAlign: 'center' },
});
