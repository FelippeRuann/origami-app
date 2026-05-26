import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Dimensions, Image, Alert } from 'react-native';
import { Feather, AntDesign } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import YoutubePlayer from 'react-native-youtube-iframe';
import { YouTubeService } from '../domain/services/YouTubeService';
import { VideoDiscoveryUseCase } from '../domain/usecases/VideoDiscoveryUseCase';
import * as ScreenOrientation from 'expo-screen-orientation';

const { width } = Dimensions.get('window');

// Dados estáticos (mock) para as categorias de origami
const CATEGORIES = [
  { id: '1', icon: 'github', label: 'Animals',     count: '124 Projects' },
  { id: '2', icon: 'sun', label: 'Flowers',     count: '88 Projects'  },
  { id: '3', icon: 'star', label: 'Decorative',  count: '92 Projects'  },
  { id: '4', icon: 'zap', label: 'Quick Folds', count: '210 Projects' },
];

// Deixamos vazio pois agora vem do Firestore
const RECOMMENDED_IDS = [];

/**
 * Componente HeroBanner: Aquele banner grande em destaque no topo da tela.
 */
function HeroBanner({ theme, onPlayRandom }) {
  return (
    <View style={[s.hero, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[s.heroBlob1, { backgroundColor: theme.primary, opacity: 0.2 }]} />
      <View style={[s.heroBlob2, { backgroundColor: theme.secondary, opacity: 0.5 }]} />
      <View style={s.heroContent}>
        <Text style={[s.heroTag, { color: theme.primary }]}>✦ BANCO DE VÍDEOS IA-POWERED</Text>
        <Text style={[s.heroTitle, { color: theme.text }]}>Curadoria{'\n'}Especializada{'\n'}via Gemini</Text>
        <Text style={[s.heroSub, { color: theme.textMuted }]}>
          Nossa IA analisa visualmente milhares de vídeos para trazer apenas tutoriais reais e de alta qualidade para você.
        </Text>
        <TouchableOpacity style={[s.heroBtn, { backgroundColor: theme.primary }]} onPress={onPlayRandom} activeOpacity={0.85}>
          <Text style={[s.heroBtnText, { color: theme.bg }]}>Assistir Agora →</Text>
        </TouchableOpacity>
      </View>
      <View style={s.heroShapes}>
        <View style={[s.shape, s.shapeTeal, { backgroundColor: '#FF0000' }]}>
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
  const { addImportedProject, savedOrigamis, importedProjects } = useApp();
  const [saved, setSaved] = useState(() => {
    const inSaved = (savedOrigamis || []).some(o => (o.videoId || o.youtubeId) === item.youtubeId);
    const inImported = (importedProjects || []).some(p => p.videoId === item.youtubeId);
    return inSaved || inImported;
  });

  const handleSaveToLibrary = () => {
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
    setSaved(true);
    Alert.alert('Salvo', 'Vídeo do YouTube adicionado à sua Biblioteca!');
  };

  return (
    <View style={[s.recCard, { backgroundColor: theme.surface, borderColor: theme.border, width: '48%', marginBottom: 16 }]}>
      <TouchableOpacity style={[s.recImage, { backgroundColor: item.bg, height: 120 }]} onPress={() => onPlay(item)} activeOpacity={0.8}>
        <Image
           source={{ uri: item.thumbnailUrl || `https://img.youtube.com/vi/${item.youtubeId}/hqdefault.jpg` }}
           style={[StyleSheet.absoluteFillObject, { opacity: 0.9 }]}
           resizeMode="cover"
        />
        <View style={[s.diffBadge, { left: 12, borderColor: item.difficultyColor }]}>
          <Text style={[s.diffText, { color: item.difficultyColor }]}>{item.difficulty}</Text>
        </View>
        <TouchableOpacity style={s.likeBtn} onPress={handleSaveToLibrary}>
          <AntDesign name="heart" size={16} color={saved ? '#ef4444' : '#fff'} />
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
        <TouchableOpacity style={[s.startBtn, { backgroundColor: theme.danger, paddingVertical: 8 }]} activeOpacity={0.85} onPress={() => onPlay(item)}>
          <Text style={[s.startBtnText, { color: 'white', fontSize: 10 }]}>Assistir</Text>
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
  
  // YouTube Player State
  const [playingVideo, setPlayingVideo] = useState(null);
  const [windowDims, setWindowDims] = useState(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setWindowDims(window);
    });
    return () => subscription?.remove();
  }, []);

  const isLandscape = windowDims.width > windowDims.height;
  
  // Lista dinamica do banco de dados (paginada)
  const [videos, setVideos] = useState([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastVisibleDoc, setLastVisibleDoc] = useState(null);
  const [allLoaded, setAllLoaded] = useState(false);

  // Cache completo carregado uma vez ao iniciar busca
  const [allVideosCache, setAllVideosCache] = useState(null);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);

  // Pega o tema e a função de navegação do contexto global
  const { theme, setCurrentDetail, setIsFullscreenVideo, user } = useApp();

  useEffect(() => {
    setIsFullscreenVideo(!!playingVideo);
  }, [playingVideo]);

  const handlePlayRandom = async () => {
    try {
      const video = await VideoDiscoveryUseCase.getRandomVideoByDifficulty(user?.rank || 'Iniciante');
      if (!video) {
        Alert.alert('Ops', 'Nenhum vídeo disponível para o seu nível ainda.');
        return;
      }
      const d = video.difficulty?.toLowerCase() || 'easy';
      let displayTime = video.duration || 'Tutorial';
      if (displayTime.startsWith('PT')) displayTime = VideoDiscoveryUseCase.formatISO8601Duration(displayTime);
      setPlayingVideo({
        ...video,
        youtubeId: video.videoId,
        time: displayTime,
        difficulty: d.toUpperCase(),
        difficultyColor: d === 'hard' ? '#F59E0B' : (d === 'intermediate') ? '#3B82F6' : '#22C55E',
        views: 'IA Verified',
        bg: '#000'
      });
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar o vídeo.');
    }
  };

  useEffect(() => {
    async function fetchCommunityVideos() {
      setIsLoadingVideos(true);
      try {
        const { videos: fetchedVideos, lastVisible } = await VideoDiscoveryUseCase.getCommunityVideos(10);
        
        const mappedResults = fetchedVideos.map(v => {
          const d = v.difficulty?.toLowerCase() || 'easy';
          let displayTime = v.duration || 'Tutorial';
          if (displayTime.startsWith('PT')) {
            displayTime = VideoDiscoveryUseCase.formatISO8601Duration(displayTime);
          }
          return {
            ...v,
            youtubeId: v.videoId,
            time: displayTime,
            difficulty: d.toUpperCase(),
            difficultyColor: d === 'hard' ? '#F59E0B' : (d === 'medium' || d === 'intermediate') ? '#3B82F6' : '#22C55E',
            views: 'IA Verified',
            bg: '#000'
          };
        });
        
        setVideos(mappedResults);
        setLastVisibleDoc(lastVisible);
        if (fetchedVideos.length < 10) setAllLoaded(true);
        
      } catch (err) {
        console.error("Erro ao carregar vídeos da comunidade:", err);
      } finally {
        setIsLoadingVideos(false);
      }
    }
    fetchCommunityVideos();
  }, []);
  
  const loadMoreVideos = async () => {
    if (isLoadingMore || allLoaded || !lastVisibleDoc || searchQuery) return;
    
    setIsLoadingMore(true);
    try {
      const { videos: fetchedVideos, lastVisible } = await VideoDiscoveryUseCase.getCommunityVideos(10, lastVisibleDoc);
      
      if (fetchedVideos.length === 0) {
        setAllLoaded(true);
      } else {
        const mappedResults = fetchedVideos.map(v => {
          const d = v.difficulty?.toLowerCase() || 'easy';
          let displayTime = v.duration || 'Tutorial';
          if (displayTime.startsWith('PT')) {
            displayTime = VideoDiscoveryUseCase.formatISO8601Duration(displayTime);
          }
          return {
            ...v,
            youtubeId: v.videoId,
            time: displayTime,
            difficulty: d.toUpperCase(),
            difficultyColor: d === 'hard' ? '#F59E0B' : (d === 'medium' || d === 'intermediate') ? '#3B82F6' : '#22C55E',
            views: 'IA Verified',
            bg: '#000'
          };
        });
        
        setVideos(prev => [...prev, ...mappedResults]);
        setLastVisibleDoc(lastVisible);
        if (fetchedVideos.length < 10) setAllLoaded(true);
      }
    } catch (err) {
      console.error("Erro ao carregar mais vídeos:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (playingVideo) {
      ScreenOrientation.unlockAsync();
    } else {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    }
  }, [playingVideo]);

  // Carrega todos os vídeos uma vez quando o usuário começa a buscar
  useEffect(() => {
    if (!searchQuery || allVideosCache !== null) return;
    setIsLoadingSearch(true);
    VideoDiscoveryUseCase.getAllVideos().then(rawVideos => {
      const mapped = rawVideos.map(v => {
        const d = v.difficulty?.toLowerCase() || 'easy';
        let displayTime = v.duration || 'Tutorial';
        if (displayTime.startsWith('PT')) displayTime = VideoDiscoveryUseCase.formatISO8601Duration(displayTime);
        return {
          ...v,
          youtubeId: v.videoId,
          time: displayTime,
          difficulty: d.toUpperCase(),
          difficultyColor: d === 'hard' ? '#F59E0B' : (d === 'medium' || d === 'intermediate') ? '#3B82F6' : '#22C55E',
          views: 'IA Verified',
          bg: '#000'
        };
      });
      setAllVideosCache(mapped);
    }).catch(() => {
      setAllVideosCache(videos); // fallback para o que já está em memória
    }).finally(() => setIsLoadingSearch(false));
  }, [searchQuery]);

  // Filtra a lista de recomendados com base no que o usuário digitou na busca
  const sourceForSearch = allVideosCache || videos;
  const filteredRecommended = searchQuery
    ? sourceForSearch.filter(item => item.title?.toLowerCase().includes(searchQuery.toLowerCase()))
    : videos;

  // Truque/Easter Egg: Se buscar por "drag" e não achar nada, mostra um dragão secreto
  const displayRecommended = searchQuery.toLowerCase().includes('drag') && filteredRecommended.length === 0
    ? [{ id: 'drag1', title: 'Ancient Dragon (API)', difficulty: 'EXPERT', difficultyColor: '#E11D48', time: '120 min', steps: '145 steps', icon: 'wind', bg: '#881337', youtubeId: 'kUsxMXwCW8A', views: 'API views' }]
    : filteredRecommended;

  if (playingVideo) {
    return (
      <View style={[s.root, { backgroundColor: theme.bg, paddingTop: isLandscape ? 0 : 40 }]}>
         {!isLandscape && (
           <TouchableOpacity 
             style={{flexDirection: 'row', alignItems: 'center', padding: 20}}
             onPress={() => { setIsFullscreenVideo(false); setPlayingVideo(null); }}
           >
              <Feather name="arrow-left" size={24} color={theme.text} />
              <Text style={{color: theme.text, fontSize: 18, marginLeft: 10, fontWeight: 'bold'}}>Voltar ao Início</Text>
           </TouchableOpacity>
         )}
         <View style={{ width: isLandscape ? '100%' : windowDims.width, height: isLandscape ? '100%' : 250, backgroundColor: 'black' }}>
            <YoutubePlayer
              height={isLandscape ? windowDims.height : 250}
              width={windowDims.width}
              play={true}
              videoId={playingVideo.youtubeId}
              webViewProps={{
                originWhitelist: ['*'],
                allowsInlineMediaPlayback: true,
              }}
            />
            {isLandscape && (
              <TouchableOpacity
                style={{ position: 'absolute', top: 20, left: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 20 }}
                onPress={() => { setIsFullscreenVideo(false); setPlayingVideo(null); }}
              >
                <Feather name="arrow-left" size={24} color="white" />
              </TouchableOpacity>
            )}
         </View>
         {!isLandscape && (
           <View style={{padding: 20}}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                <Text style={{color: theme.text, fontSize: 22, fontWeight: 'bold', flex: 1}}>{playingVideo.title}</Text>
                <View style={[s.diffBadge, { position: 'relative', top: 0, right: 0, borderColor: playingVideo.difficultyColor }]}>
                   <Text style={[s.diffText, { color: playingVideo.difficultyColor }]}>{playingVideo.difficulty}</Text>
                </View>
              </View>
              
              <View style={[s.recMeta, { marginTop: 15, flexWrap: 'wrap' }]}>
                <Feather name="clock" size={14} color={theme.textMuted} />
                <Text style={[s.recMetaText, { color: theme.textMuted, fontSize: 14 }]}> {playingVideo.time}  </Text>
                <Feather name="eye" size={14} color={theme.textMuted} />
                <Text style={[s.recMetaText, { color: theme.textMuted, fontSize: 14 }]}> {playingVideo.views}</Text>
                <Text style={[s.recMetaText, { color: theme.primary, fontSize: 14, marginLeft: 10, flexShrink: 1 }]} numberOfLines={1}> • {playingVideo.channel}</Text>
              </View>
              
              <Text style={{color: theme.textDim, fontSize: 14, marginTop: 15, lineHeight: 22}}>
                 Você está assistindo diretamente pelo App usando "react-native-youtube-iframe"!
                 Informações puxadas direto da API do YouTube. Para salvar seu progresso e continuar depois, adicione este vídeo à sua Biblioteca.
              </Text>
           </View>
         )}
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

      <ScrollView 
        style={s.scroll} 
        contentContainerStyle={s.scrollContent} 
        showsVerticalScrollIndicator={false}
        onScroll={({ nativeEvent }) => {
          const isCloseToBottom = nativeEvent.layoutMeasurement.height + nativeEvent.contentOffset.y >= nativeEvent.contentSize.height - 50;
          if (isCloseToBottom) {
            loadMoreVideos();
          }
        }}
        scrollEventThrottle={400}
      >
        <HeroBanner theme={theme} onPlayRandom={handlePlayRandom} />

        {/* Categories section hidden as requested */}
        {/*
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
        */}

        {/* Recommended */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: theme.text }]}>
              {searchQuery ? 'Resultados da Busca' : 'Descobrir Modelos'}
            </Text>
            {!searchQuery && (
              <View style={s.arrowRow}>
              </View>
            )}
          </View>
          {isLoadingVideos || isLoadingSearch ? (
            <Text style={{ color: theme.textMuted, textAlign: 'center', paddingVertical: 20 }}>
              {isLoadingSearch ? 'Buscando em todos os vídeos...' : 'Buscando do YouTube (Clean Arch)...'}
            </Text>
          ) : displayRecommended.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {displayRecommended.map((item) => <RecommendedCard key={item.id} item={item} theme={theme} onPlay={setPlayingVideo} />)}
            </View>
          ) : (
            <Text style={{ color: theme.textMuted, textAlign: 'center', paddingVertical: 20 }}>
              {searchQuery 
                ? `Nenhum modelo encontrado para "${searchQuery}"` 
                : "Nenhum modelo para descobrir. Por favor, fique online para acessar novos modelos."}
            </Text>
          )}
          {isLoadingMore && (
            <Text style={{ color: theme.textMuted, textAlign: 'center', paddingVertical: 10 }}>Carregando mais vídeos...</Text>
          )}
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
  heroBtnText: { fontWeight: '800', fontSize: 14, flexShrink: 1, textAlign: 'center' },
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
  diffBadge:    { position: 'absolute', top: 12, borderWidth: 1.5, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: 'rgba(0,0,0,0.5)' },
  diffText:     { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  likeBtn:      { position: 'absolute', top: 12, right: 12 },
  recInfo:      { padding: 16 },
  recTitle:     { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  recMeta:      { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  recMetaText:  { fontSize: 13 },
  startBtn:     { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  startBtnText: { fontWeight: '800', fontSize: 14, flexShrink: 1, textAlign: 'center' },

  newsletter: { margin: 16, marginTop: 24, borderRadius: 20, padding: 22, borderWidth: 1 },
  nlTitle:    { fontSize: 20, fontWeight: '900', marginBottom: 10 },
  nlSub:      { fontSize: 13, lineHeight: 19, marginBottom: 18 },
  nlRow:      { flexDirection: 'row', gap: 10 },
  nlInput:    { flex: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, borderWidth: 1 },
  nlBtn:      { borderRadius: 10, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  nlBtnText:  { fontWeight: '900', fontSize: 12, textAlign: 'center' },
});
