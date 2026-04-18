import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Dimensions, Image, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { WebView } from 'react-native-webview';

const { width } = Dimensions.get('window');

// Dados estáticos (mock) para as categorias de origami
const CATEGORIES = [
  { id: '1', icon: 'github', label: 'Animals',     count: '124 Projects' },
  { id: '2', icon: 'sun', label: 'Flowers',     count: '88 Projects'  },
  { id: '3', icon: 'star', label: 'Decorative',  count: '92 Projects'  },
  { id: '4', icon: 'zap', label: 'Quick Folds', count: '210 Projects' },
];

// IDs REAIS do YouTube de origami (ex: Jo Nakashima) para carregar as miniaturas de verdade
const RECOMMENDED = [
  { id: 'yt1', title: 'Como fazer Tsuru Tradicional', difficulty: 'INICIANTE', difficultyColor: '#22C55E', time: '5 min', views: '1.2M views', icon: 'youtube', bg: '#BE123C', youtubeId: 'KfnyopcfNWQ' },
  { id: 'yt2', title: 'Rosa de Papel Realista',  difficulty: 'INTERMEDIÁRIO', difficultyColor: '#3B82F6', time: '18 min', views: '450K views', icon: 'youtube', bg: '#0E7490', youtubeId: 'wZEwAioa8s4' },
  { id: 'yt3', title: 'Dragão Mítico (Passo a Passo)', difficulty: 'AVANÇADO', difficultyColor: '#F59E0B', time: '40 min', views: '2.1M views', icon: 'youtube', bg: '#C2410C', youtubeId: '0O7e_Q-gLss' },
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
        <Text style={[s.heroTag, { color: theme.primary }]}>✦ NOVIDADE: INTEGRAÇÃO C/ YOUTUBE</Text>
        <Text style={[s.heroTitle, { color: theme.text }]}>Explore{'\n'}Canais{'\n'}de Origami</Text>
        <Text style={[s.heroSub, { color: theme.textMuted }]}>
          Aprenda o passo a passo com os maiores canais de origami do mundo, integrados diretamente ao seu feed.
        </Text>
        <TouchableOpacity style={[s.heroBtn, { backgroundColor: theme.primary }]} activeOpacity={0.85}>
          <Text style={[s.heroBtnText, { color: theme.bg }]}>Assistir Agora →</Text>
        </TouchableOpacity>
      </View>
      <View style={s.heroShapes}>
        <View style={[s.shape, s.shapeTeal, { backgroundColor: '#FF0000' }]}   >
           <Feather name="play-circle" size={40} color="#fff" style={{margin: 10}}/>
        </View>
      </View>
    </View>
  );
}

/**
 * Componente RecommendedCard: Renderiza cada um dos cards de origamis recomendados (YouTube).
 */
function RecommendedCard({ item, theme, onPlay }) {
  const [liked, setLiked] = useState(false);
  const { addImportedProject } = useApp();

  const handleSaveToLibrary = () => {
    // Adiciona à biblioteca com as infos do Youtube
    const newYoutubeItem = {
      id: Date.now().toString(),
      title: item.title,
      url: `https://youtube.com/watch?v=${item.youtubeId}`,
      videoId: item.youtubeId,
      type: 'youtube',
      progress: '0%',
      date: 'Agora'
    };
    addImportedProject(newYoutubeItem);
    Alert.alert('Salvo', 'Vídeo do YouTube adicionado à sua Biblioteca!');
  };

  return (
    <View style={[s.recCard, { backgroundColor: theme.surface, borderColor: theme.border, width: '48%', marginBottom: 16 }]}>
      <TouchableOpacity style={[s.recImage, { backgroundColor: item.bg, height: 120 }]} onPress={() => onPlay(item)} activeOpacity={0.8}>
        <Image 
           source={{ uri: `https://img.youtube.com/vi/${item.youtubeId}/hqdefault.jpg` }}
           style={[StyleSheet.absoluteFillObject, { opacity: 0.9 }]}
           resizeMode="cover"
        />
        <View style={[s.diffBadge, { borderColor: item.difficultyColor }]}>
          <Text style={[s.diffText, { color: item.difficultyColor }]}>{item.difficulty}</Text>
        </View>
        <TouchableOpacity style={s.likeBtn} onPress={() => setLiked(!liked)}>
          <Feather name="heart" size={16} color={liked ? theme.danger : "#fff"} />
        </TouchableOpacity>
        <Feather name="play-circle" size={32} color="#fff" style={{ position: 'absolute', opacity: 0.8 }} />
      </TouchableOpacity>
      <View style={[s.recInfo, { padding: 10 }]}>
        <Text style={[s.recTitle, { color: theme.text, fontSize: 13, height: 36 }]} numberOfLines={2}>{item.title}</Text>
        <View style={[s.recMeta, { marginBottom: 10 }]}>
          <Feather name="clock" size={10} color={theme.textMuted} />
          <Text style={[s.recMetaText, { color: theme.textMuted, fontSize: 10 }]}> {item.time}  </Text>
          <Feather name="eye" size={10} color={theme.textMuted} />
          <Text style={[s.recMetaText, { color: theme.textMuted, fontSize: 10 }]}> {item.views}</Text>
        </View>
        <View style={{flexDirection: 'row', gap: 6}}>
           <TouchableOpacity style={[s.startBtn, { backgroundColor: theme.danger, flex: 1, paddingVertical: 8 }]} activeOpacity={0.85} onPress={() => onPlay(item)}>
             <Text style={[s.startBtnText, { color: 'white', fontSize: 10 }]}>Assistir</Text>
           </TouchableOpacity>
           <TouchableOpacity style={[s.startBtn, { backgroundColor: theme.bg, borderColor: theme.border, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 }]} activeOpacity={0.85} onPress={handleSaveToLibrary}>
             <Feather name="plus" size={12} color={theme.text}/>
           </TouchableOpacity>
        </View>
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
  
  // YouTube Player State
  const [playingVideo, setPlayingVideo] = useState(null);

  // Pega o tema e a função de navegação do contexto global
  const { theme, setCurrentDetail } = useApp();

  // Filtra a lista de recomendados com base no que o usuário digitou na busca
  const filteredRecommended = RECOMMENDED.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Truque/Easter Egg: Se buscar por "drag" e não achar nada, mostra um dragão secreto
  const displayRecommended = searchQuery.toLowerCase().includes('drag') && filteredRecommended.length === 0
    ? [{ id: 'drag1', title: 'Ancient Dragon', difficulty: 'EXPERT', difficultyColor: '#E11D48', time: '120 min', steps: '145 steps', icon: 'wind', bg: '#881337', youtubeId: '0O7e_Q-gLss' }]
    : filteredRecommended;

  if (playingVideo) {
    return (
      <View style={[s.root, { backgroundColor: theme.bg, paddingTop: 40 }]}>
         <TouchableOpacity 
           style={{flexDirection: 'row', alignItems: 'center', padding: 20}}
           onPress={() => setPlayingVideo(null)}
         >
            <Feather name="arrow-left" size={24} color={theme.text} />
            <Text style={{color: theme.text, fontSize: 18, marginLeft: 10, fontWeight: 'bold'}}>Voltar ao Início</Text>
         </TouchableOpacity>
         <View style={{ width: '100%', height: 300 }}>
            <WebView
              style={{ flex: 1 }}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              allowsFullscreenVideo={true}
              source={{ uri: `https://www.youtube.com/embed/${playingVideo.youtubeId}?playsinline=1&origin=https://www.youtube.com` }}
            />
         </View>
         <View style={{padding: 20}}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'}}>
              <Text style={{color: theme.text, fontSize: 22, fontWeight: 'bold', flex: 1}}>{playingVideo.title}</Text>
              <View style={[s.diffBadge, { position: 'relative', top: 0, right: 0, borderColor: playingVideo.difficultyColor }]}>
                 <Text style={[s.diffText, { color: playingVideo.difficultyColor }]}>{playingVideo.difficulty}</Text>
              </View>
            </View>
            
            <View style={[s.recMeta, { marginTop: 15 }]}>
              <Feather name="clock" size={14} color={theme.textMuted} />
              <Text style={[s.recMetaText, { color: theme.textMuted, fontSize: 14 }]}> {playingVideo.time}  </Text>
              <Feather name="eye" size={14} color={theme.textMuted} />
              <Text style={[s.recMetaText, { color: theme.textMuted, fontSize: 14 }]}> {playingVideo.views}</Text>
            </View>
            
            <Text style={{color: theme.textDim, fontSize: 14, marginTop: 15, lineHeight: 22}}>
               Você está assistindo diretamente pelo App! Para salvar seu progresso e continuar depois, adicione este vídeo à sua Biblioteca.
            </Text>
         </View>
      </View>
    );
  }

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
              {searchQuery ? 'Resultados da Busca' : 'Recomendados para você'}
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
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {displayRecommended.map((item) => <RecommendedCard key={item.id} item={item} theme={theme} onPlay={setPlayingVideo} />)}
            </View>
          ) : (
            <Text style={{ color: theme.textMuted, textAlign: 'center', paddingVertical: 20 }}>Nenhum modelo encontrado para "{searchQuery}"</Text>
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
