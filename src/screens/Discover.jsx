import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Dimensions, Animated, Alert, ActivityIndicator } from 'react-native';
import { Feather, AntDesign } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { haptic } from '../utils/haptics';
import { sound } from '../utils/sounds';
import YoutubePlayer from 'react-native-youtube-iframe';
import { YouTubeService } from '../domain/services/YouTubeService';
import { VideoDiscoveryUseCase } from '../domain/usecases/VideoDiscoveryUseCase';

const { width } = Dimensions.get('window');

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
const CARD_PALETTE = [
  '#1B2A3B', '#2A1B3B', '#1B3B2A', '#3B1B2A', '#2A2A1B',
  '#1B3B3B', '#3B2A1B', '#2A1B1B', '#1B2A2A', '#3B3B1B',
];
const cardColor = (videoId) => {
  if (!videoId) return CARD_PALETTE[0];
  let h = 0;
  for (let i = 0; i < videoId.length; i++) h = (Math.imul(31, h) + videoId.charCodeAt(i)) | 0;
  return CARD_PALETTE[Math.abs(h) % CARD_PALETTE.length];
};

const DOUBLE_TAP_MS = 280;

const RecommendedCard = React.memo(function RecommendedCard({ item, theme, onPlay, cardWidth = '48%' }) {
  const { addImportedProject, removeImportedProject, unsaveOrigami, savedOrigamis, importedProjects, hapticsEnabled, soundsEnabled } = useApp();
  const thumbOpacity = useRef(new Animated.Value(0)).current;
  const heartPop = useRef(new Animated.Value(0)).current;
  const lastTapRef = useRef(0);
  const playTimerRef = useRef(null);
  const bgColor = cardColor(item.youtubeId);

  const savedEntry = (importedProjects || []).find(p => p.videoId === item.youtubeId);
  const savedFav   = (savedOrigamis   || []).find(o => (o.videoId || o.youtubeId) === item.youtubeId);
  const saved = !!(savedEntry || savedFav);

  useEffect(() => () => clearTimeout(playTimerRef.current), []);

  const playHeartPop = () => {
    sound.play('pop', soundsEnabled);
    heartPop.setValue(0);
    Animated.sequence([
      Animated.spring(heartPop, { toValue: 1, useNativeDriver: true, speed: 24, bounciness: 14 }),
      Animated.timing(heartPop, { toValue: 0, duration: 250, delay: 400, useNativeDriver: true }),
    ]).start();
  };

  const addToLibrary = async () => {
    const result = await addImportedProject({
      id: Date.now().toString(),
      title: item.title,
      url: `https://youtube.com/watch?v=${item.youtubeId}`,
      videoId: item.youtubeId,
      type: 'youtube',
      progress: '0%',
      date: 'Agora',
    });
    // Só anima se salvou de fato (limite freemium pode bloquear e abrir a tela Pro)
    if (result === false) return;
    playHeartPop();
  };

  // Botão de coração: alterna salvar/remover
  const handleToggleLibrary = () => {
    haptic.light(hapticsEnabled);
    if (saved) {
      if (savedEntry) removeImportedProject(savedEntry.id);
      if (savedFav)   unsaveOrigami(savedFav.id || savedFav.videoId);
    } else {
      addToLibrary();
    }
  };

  // Um toque abre o vídeo; dois toques rápidos favoritam (estilo Instagram).
  // Duplo toque nunca REMOVE — se já está salvo, só mostra o coração de confirmação.
  const handleCardPress = () => {
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      lastTapRef.current = 0;
      clearTimeout(playTimerRef.current);
      haptic.light(hapticsEnabled);
      if (saved) playHeartPop();
      else addToLibrary();
    } else {
      lastTapRef.current = now;
      clearTimeout(playTimerRef.current);
      playTimerRef.current = setTimeout(() => onPlay(item), DOUBLE_TAP_MS);
    }
  };

  return (
    <View style={[s.recCard, { backgroundColor: theme.surface, borderColor: theme.border, width: cardWidth, marginBottom: 16 }]}>
      <TouchableOpacity style={[s.recImage, { backgroundColor: bgColor, height: 120 }]} onPress={handleCardPress} activeOpacity={0.8}>
        <Animated.Image
           source={{ uri: item.thumbnailUrl || `https://img.youtube.com/vi/${item.youtubeId}/hqdefault.jpg` }}
           style={[StyleSheet.absoluteFillObject, { opacity: thumbOpacity }]}
           resizeMode="cover"
           onLoad={() => Animated.timing(thumbOpacity, { toValue: 0.9, duration: 350, useNativeDriver: true }).start()}
        />
        <View style={[s.diffBadge, { left: 12, borderColor: item.difficultyColor }]}>
          <Text style={[s.diffText, { color: item.difficultyColor }]}>{item.difficulty}</Text>
        </View>
        <Feather name="play-circle" size={32} color="#fff" style={{ position: 'absolute', opacity: 0.8 }} />
        {/* Coração animado ao favoritar com duplo toque */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            opacity: heartPop,
            transform: [{ scale: heartPop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.6] }) }],
          }}
        >
          <AntDesign name="heart" size={44} color="#ef4444" />
        </Animated.View>
        <TouchableOpacity
          style={s.likeBtn}
          onPress={handleToggleLibrary}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <AntDesign name="heart" size={16} color={saved ? '#ef4444' : '#fff'} />
        </TouchableOpacity>
      </TouchableOpacity>
      <View style={[s.recInfo, { padding: 10 }]}>
        <Text style={[s.recTitle, { color: theme.text, fontSize: 13, height: 36 }]} numberOfLines={2}>{item.title}</Text>
        <View style={[s.recMeta, { marginBottom: 10 }]}>
          <Feather name="clock" size={10} color={theme.textMuted} />
          <Text style={[s.recMetaText, { color: theme.textMuted, fontSize: 10 }]}> {item.time}  </Text>
          <Feather name="eye" size={10} color={theme.textMuted} />
          <Text style={[s.recMetaText, { color: theme.textMuted, fontSize: 10, flexShrink: 1 }]} numberOfLines={1}> {item.views}</Text>
        </View>
        <TouchableOpacity style={[s.startBtn, { backgroundColor: theme.danger, paddingVertical: 8 }]} activeOpacity={0.85} onPress={() => onPlay(item)}>
          <Text style={[s.startBtnText, { color: 'white', fontSize: 10 }]}>Assistir</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

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

  // Colunas responsivas: 2 no celular, 3 em telas médias, 4 em tablets grandes/paisagem
  const numColumns = windowDims.width >= 1000 ? 4 : windowDims.width >= 680 ? 3 : 2;
  const cardWidth = numColumns === 4 ? '23.5%' : numColumns === 3 ? '31.5%' : '48%';

  const PAGE_SIZE = 15;
  const allVideosRef = useRef([]); // lista completa embaralhada, nunca re-renderiza sozinha

  const [videos, setVideos] = useState([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(true);
  const [diffFilter, setDiffFilter] = useState('all'); // chips de dificuldade
  // Derivado: todas as páginas locais já exibidas
  const allLoaded = allVideosRef.current.length > 0 && videos.length >= allVideosRef.current.length;

  // Pega o tema e a função de navegação do contexto global
  const { theme, setCurrentDetail, setIsFullscreenVideo, user, scrollToTopSignal, navigateToPro } = useApp();

  const listRef = useRef(null);

  // Tocar na aba Discover já ativa: rola a lista de volta ao topo
  useEffect(() => {
    if (scrollToTopSignal?.route === 'Discover' && scrollToTopSignal.tick > 0) {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  }, [scrollToTopSignal]);

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

  const mapVideo = (v) => {
    const d = v.difficulty?.toLowerCase() || 'easy';
    let displayTime = v.duration || 'Tutorial';
    if (displayTime.startsWith('PT')) displayTime = VideoDiscoveryUseCase.formatISO8601Duration(displayTime);
    return {
      ...v,
      youtubeId: v.videoId,
      time: displayTime,
      difficulty: d.toUpperCase(),
      difficultyColor: d === 'hard' ? '#F59E0B' : (d === 'medium' || d === 'intermediate') ? '#3B82F6' : '#22C55E',
      views: v.channelTitle || 'YouTube',
      bg: '#000',
    };
  };

  useEffect(() => {
    async function fetchDiscoverFeed() {
      setIsLoadingVideos(true);
      try {
        // Feed ao vivo: RSS dos canais confiáveis + banco curado (só leitura)
        const all = await VideoDiscoveryUseCase.getLiveFeedForUser(user?.id);
        const mapped = all.map(mapVideo);
        allVideosRef.current = mapped;
        setVideos(mapped.slice(0, PAGE_SIZE));
      } catch (err) {
        console.error("Erro ao carregar feed de descoberta:", err);
      } finally {
        setIsLoadingVideos(false);
      }
    }
    fetchDiscoverFeed();
  }, []);
  
  // Paginação local: fatia a lista já em memória — instantâneo, sem rede
  const loadMoreVideos = useCallback(() => {
    if (allLoaded || searchQuery || diffFilter !== 'all') return;
    setVideos(prev => {
      const next = allVideosRef.current.slice(prev.length, prev.length + PAGE_SIZE);
      return next.length > 0 ? [...prev, ...next] : prev;
    });
  }, [allLoaded, searchQuery, diffFilter]);


  // Busca ao vivo no YouTube (disparada só pelo botão — protege a cota da API)
  const [ytResults, setYtResults] = useState(null);
  const [isSearchingYt, setIsSearchingYt] = useState(false);

  useEffect(() => { setYtResults(null); }, [searchQuery]);

  const handleYtSearch = async () => {
    if (!searchQuery.trim() || isSearchingYt) return;
    setIsSearchingYt(true);
    try {
      const res = await VideoDiscoveryUseCase.searchOrigamiLive(searchQuery, 25, { isPro: !!user?.isPro });
      setYtResults(res.map(mapVideo));
    } catch (err) {
      if (err?.code === 'SEARCH_LIMIT') {
        Alert.alert(
          'Limite diário atingido',
          `Você usou suas ${VideoDiscoveryUseCase.FREE_LIVE_SEARCHES_PER_DAY} buscas ao vivo de hoje. Com o Pro, as buscas no YouTube são ilimitadas.`,
          [
            { text: 'Agora não', style: 'cancel' },
            { text: 'Conhecer o Pro', onPress: navigateToPro },
          ]
        );
      } else {
        setYtResults([]);
      }
    } finally {
      setIsSearchingYt(false);
    }
  };

  // Filtro de dificuldade (chips)
  const matchesDiff = (item) => {
    if (diffFilter === 'all') return true;
    const d = (item.difficulty || '').toLowerCase();
    if (diffFilter === 'intermediate') return d === 'intermediate' || d === 'medium';
    return d === diffFilter;
  };

  // Busca filtra diretamente do allVideosRef (já carregado, sem rede).
  // Com filtro de dificuldade ativo, usa a lista completa (não a paginada).
  const baseList = searchQuery
    ? allVideosRef.current.filter(item => item.title?.toLowerCase().includes(searchQuery.toLowerCase()))
    : diffFilter !== 'all' ? allVideosRef.current : videos;
  const localMatches = baseList.filter(matchesDiff);

  // Mescla resultados do YouTube ao vivo (sem duplicar os já exibidos)
  let filteredRecommended = localMatches;
  if (searchQuery && ytResults?.length > 0) {
    const seen = new Set(localMatches.map(v => v.youtubeId));
    filteredRecommended = [...localMatches, ...ytResults.filter(v => matchesDiff(v) && !seen.has(v.youtubeId))];
  }

  // Truque/Easter Egg: Se buscar por "drag" e não achar nada, mostra um dragão secreto
  const displayRecommended = searchQuery.toLowerCase().includes('drag') && filteredRecommended.length === 0
    ? [{ id: 'drag1', title: 'Ancient Dragon (API)', difficulty: 'EXPERT', difficultyColor: '#E11D48', time: '120 min', steps: '145 steps', icon: 'wind', bg: '#881337', youtubeId: 'kUsxMXwCW8A', views: 'API views' }]
    : filteredRecommended;

  const renderCard = useCallback(
    ({ item }) => <RecommendedCard item={item} theme={theme} onPlay={setPlayingVideo} cardWidth={cardWidth} />,
    [theme, cardWidth]
  );
  const keyExtractor = useCallback((item) => item.id?.toString() || item.youtubeId, []);

  const DIFF_CHIPS = [
    { key: 'all',          label: 'Todos',   color: theme.primary },
    { key: 'easy',         label: 'Fácil',   color: '#22C55E' },
    { key: 'intermediate', label: 'Médio',   color: '#3B82F6' },
    { key: 'hard',         label: 'Difícil', color: '#F59E0B' },
  ];

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
                 Para salvar seu progresso e continuar depois, adicione este vídeo à sua Biblioteca.
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
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x-circle" size={18} color={theme.textDim} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={displayRecommended}
        renderItem={renderCard}
        keyExtractor={keyExtractor}
        numColumns={numColumns}
        key={`cols-${numColumns}`}
        columnWrapperStyle={s.columnWrapper}
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onEndReached={loadMoreVideos}
        onEndReachedThreshold={0.6}
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={7}
        ListHeaderComponent={
          <>
            <HeroBanner theme={theme} onPlayRandom={handlePlayRandom} />
            <View style={s.listSectionHeader}>
              <Text style={[s.sectionTitle, { color: theme.text }]}>
                {searchQuery ? 'Resultados da Busca' : 'Descobrir Modelos'}
              </Text>
              <View style={s.filterRow}>
                {DIFF_CHIPS.map(chip => {
                  const active = diffFilter === chip.key;
                  return (
                    <TouchableOpacity
                      key={chip.key}
                      onPress={() => { haptic.light(); setDiffFilter(chip.key); }}
                      style={[s.filterChip, {
                        backgroundColor: active ? chip.color + '22' : theme.surface,
                        borderColor: active ? chip.color : theme.border,
                      }]}
                      activeOpacity={0.7}
                    >
                      <Text style={{ color: active ? chip.color : theme.textDim, fontSize: 12, fontWeight: '700' }}>
                        {chip.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          isLoadingVideos ? (
            <View style={{ paddingVertical: 30, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={{ color: theme.textMuted, textAlign: 'center', marginTop: 12 }}>Carregando vídeos...</Text>
            </View>
          ) : (
            <Text style={{ color: theme.textMuted, textAlign: 'center', paddingVertical: 20, paddingHorizontal: 16 }}>
              {searchQuery
                ? `Nenhum modelo encontrado para "${searchQuery}"`
                : "Nenhum modelo para descobrir. Por favor, fique online para acessar novos modelos."}
            </Text>
          )
        }
        ListFooterComponent={
          searchQuery.trim() ? (
            <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
              {isSearchingYt ? (
                <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                  <ActivityIndicator color={theme.primary} />
                  <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 8 }}>Buscando no YouTube...</Text>
                </View>
              ) : ytResults === null ? (
                <TouchableOpacity
                  style={[s.ytSearchBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={handleYtSearch}
                  activeOpacity={0.8}
                >
                  <Feather name="youtube" size={16} color={theme.danger} />
                  <Text style={[s.ytSearchBtnText, { color: theme.text }]}>Buscar "{searchQuery.trim()}" no YouTube</Text>
                </TouchableOpacity>
              ) : ytResults.length === 0 ? (
                <Text style={{ color: theme.textMuted, fontSize: 12, textAlign: 'center', paddingVertical: 8 }}>
                  Nenhum tutorial de origami a mais encontrado no YouTube.
                </Text>
              ) : null}
            </View>
          ) : null
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 80 },
  columnWrapper: { justifyContent: 'space-between', paddingHorizontal: 16 },
  listSectionHeader: { paddingHorizontal: 16, marginTop: 24, marginBottom: 16 },
  filterRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  filterChip: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  ytSearchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16,
  },
  ytSearchBtnText: { fontSize: 13, fontWeight: '700', flexShrink: 1 },

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
