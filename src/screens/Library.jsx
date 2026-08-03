import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Alert, ActivityIndicator, Platform, TextInput, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useApp } from '../context/AppContext';
import YoutubePlayer from 'react-native-youtube-iframe';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const { width } = Dimensions.get('window');

// DICA: Usando o IP da nuvem ou do Expo local para o celular físico encontrar o servidor.
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://uploadpdf-ulb2s3fzra-uc.a.run.app';

export default function Library() {
  const { theme, user, setFoldingOrigami, importedProjects, addImportedProject, removeImportedProject, updateVideoProgress, classActivities, joinClass, studentSubscriptions, setIsFullscreenVideo, savedOrigamis, unsaveOrigami, isInitialLoading, updateYoutubeVideoTitle, navigateToPro, scrollToTopSignal } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [convertedFiles, setConvertedFiles] = useState([]);
  
  // Renaming state
  const [editingProject, setEditingProject] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  const playerRef = useRef(null);
  const completionTrackedRef = useRef(false);
  const mainScrollRef = useRef(null);

  // Tocar na aba Library já ativa: rola de volta ao topo
  useEffect(() => {
    if (scrollToTopSignal?.route === 'Library' && scrollToTopSignal.tick > 0) {
      mainScrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [scrollToTopSignal]);
  
  // Mescla projetos importados com origamis salvos da comunidade em uma única lista
  const allProjects = React.useMemo(() => {
    // Se ainda estiver carregando, não processa
    if (isInitialLoading) return [];
    
    // Normaliza os dados (Community / YouTube Favs)
    const communityNorm = (savedOrigamis || []).map(o => {
      let dateStr = 'Salvo';
      if (o.addedAt) {
        if (o.addedAt.seconds) dateStr = new Date(o.addedAt.seconds * 1000).toLocaleDateString();
        else dateStr = new Date(o.addedAt).toLocaleDateString();
      } else if (o.savedAt) {
        dateStr = new Date(o.savedAt).toLocaleDateString();
      }

      return {
        ...o,
        id: o.id?.toString() || o.videoId || Math.random().toString(),
        title: o.title || 'Vídeo sem título',
        type: 'youtube',
        videoId: o.videoId || o.youtubeId,
        date: dateStr,
        progress: o.progress || '0%'
      };
    });

    const combined = [...importedProjects];
    communityNorm.forEach(fav => {
      const exists = combined.find(p => (p.videoId && p.videoId === fav.videoId) || p.id === fav.id);
      if (!exists) combined.push(fav);
    });

    return combined;
  }, [importedProjects, savedOrigamis, isInitialLoading]);

  const [inviteCode, setInviteCode] = useState('');

  const formatInviteCode = (text) => {
    const clean = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    return clean.length > 4 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean;
  };

  // States do Flow do YouTube (Cadastro Principal Atividade 4)
  const [showYoutubeForm, setShowYoutubeForm] = useState(false);
  const [ytUrl, setYtUrl] = useState('');
  const [ytTitle, setYtTitle] = useState('');

  // States do Management Premium
  const [newStudentEmail, setNewStudentEmail] = useState('');

  // Youtube Player Modal
  const [playingVideo, setPlayingVideo] = useState(null);
  const [windowDims, setWindowDims] = useState(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setWindowDims(window);
    });
    return () => subscription?.remove();
  }, []);

  const isLandscape = windowDims.width > windowDims.height;

  // Filtragem local
  const filteredProjects = allProjects.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Acompanha a posição do vídeo (para retomar depois) e detecta o minuto final
  const currentTimeRef = useRef(0);
  useEffect(() => {
    if (!playingVideo) return;
    completionTrackedRef.current = false;
    currentTimeRef.current = playingVideo.watchedSeconds || 0;

    const interval = setInterval(async () => {
      if (!playerRef.current) return;
      try {
        const [currentTime, duration] = await Promise.all([
          playerRef.current.getCurrentTime(),
          playerRef.current.getDuration(),
        ]);
        if (currentTime > 0) currentTimeRef.current = currentTime;
        if (!completionTrackedRef.current && duration > 0 && currentTime >= duration - 60) {
          completionTrackedRef.current = true;
          // Concluído: zera a posição para recomeçar do início na próxima vez
          updateVideoProgress(playingVideo.id, 0, true);
        }
      } catch {}
    }, 5000);

    return () => clearInterval(interval);
  }, [playingVideo]);

  // Salva a posição atual e fecha o player — é isso que permite "retomar de onde parou"
  const closePlayer = () => {
    const isSavedProject = playingVideo && importedProjects.some(p => p.id === playingVideo.id);
    if (isSavedProject && !completionTrackedRef.current && currentTimeRef.current > 5) {
      updateVideoProgress(playingVideo.id, Math.floor(currentTimeRef.current));
    }
    setIsFullscreenVideo(false);
    setPlayingVideo(null);
  };

  if (isInitialLoading) {
    return (
      <View style={[s.root, { backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ color: theme.textMuted, marginTop: 12 }}>Carregando seus Origamis...</Text>
      </View>
    );
  }

  const handleSaveYoutube = () => {
    if (!ytUrl || !ytTitle) {
      Alert.alert('Campos vazios', 'Preencha o título e o link do YouTube.');
      return;
    }
    const ytCount = allProjects.filter(p => p.type === 'youtube').length;
    if (!user?.isPro && ytCount >= 10) {
      Alert.alert(
        'Limite atingido',
        'O plano gratuito permite até 10 vídeos na biblioteca. Faça upgrade para o Pro para salvar mais.',
        [{ text: 'Cancelar', style: 'cancel' }, { text: 'Ver Plano Pro', onPress: navigateToPro }]
      );
      return;
    }
    const extractVideoId = (url) => {
      const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/|v\/))([^&?]*)/);
      return match ? match[1] : null;
    };
    
    const newProject = {
      id: Date.now().toString(),
      title: ytTitle,
      url: ytUrl,
      videoId: extractVideoId(ytUrl) || 'dQw4w9WgXcQ', // Fallback Rickroll 
      type: 'youtube', // Indica diferenciar de '.fold'
      progress: '0%',
      date: 'Agora'
    };

    addImportedProject(newProject);
    setYtUrl('');
    setYtTitle('');
    setShowYoutubeForm(false);
    Alert.alert('Salvo!', 'Vídeo adicionado à sua biblioteca local.');
  };

  const handleConvertPDF = async () => {
    const foldCount = allProjects.filter(p => p.type === 'fold').length;
    if (!user?.isPro && foldCount >= 3) {
      Alert.alert(
        'Limite de PDFs atingido',
        'O plano gratuito permite até 3 arquivos .fold na biblioteca. Faça upgrade para o Pro para adicionar mais.',
        [{ text: 'Cancelar', style: 'cancel' }, { text: 'Ver Plano Pro', onPress: navigateToPro }]
      );
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const file = result.assets[0];

      if (!user?.isPro && file.size > 10 * 1024 * 1024) {
        Alert.alert(
          'Arquivo muito grande',
          'O plano gratuito aceita PDFs de até 10 MB. Faça upgrade para o Pro para enviar arquivos maiores.',
          [{ text: 'Cancelar', style: 'cancel' }, { text: 'Ver Plano Pro', onPress: navigateToPro }]
        );
        return;
      }

      setIsConverting(true);

      const formData = new FormData();
      formData.append('pdf', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/pdf',
      });

      console.log("Enviando para:", API_URL);

      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      const responseText = await response.text();
      console.log("Raw response from server:", responseText.slice(0, 500));

      if (!response.ok) {
        let errData;
        try {
          errData = JSON.parse(responseText);
        } catch {
          errData = { error: 'Unknown server error: ' + (responseText ? responseText.slice(0, 100) : 'vazio') };
        }
        Alert.alert('Erro', errData.error || 'Falha ao converter o PDF');
        return;
      }

      // Recebemos o JSON do servidor
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Erro de parse JSON no corpo da resposta:", parseError);
        Alert.alert('Erro de Resposta', 'O servidor retornou uma resposta inválida (não-JSON):\n\n' + responseText.slice(0, 200));
        return;
      }
      const foldData = data.foldData;
      const finalFileName = data.filename || file.name.replace('.pdf', '.fold');
      
      let storageUrl = null;

      try {
        // Se temos o base64 do .fold e usuário logado, vamos salvar no Storage da nuvem sob users/<userId>/origamis/
        if (user && user.uid && data.foldFileBase64) {
          console.log("Uploading .fold to Firebase Storage...");
          const storageRef = ref(storage, `users/${user.uid}/origamis/${finalFileName}`);
          
          // Função auxiliar para decodificar base64 puro em Uint8Array compatível com uploadBytes
          const base64ToUint8Array = (b64) => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
            const lookup = new Uint8Array(256);
            for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;
            let bufferLength = b64.length * 0.75, len = b64.length, i, p = 0;
            if (b64[len - 1] === "=") { bufferLength--; if (b64[len - 2] === "=") bufferLength--; }
            const bytes = new Uint8Array(bufferLength);
            for (i = 0; i < len; i += 4) {
              const encoded1 = lookup[b64.charCodeAt(i)];
              const encoded2 = lookup[b64.charCodeAt(i + 1)];
              const encoded3 = lookup[b64.charCodeAt(i + 2)];
              const encoded4 = lookup[b64.charCodeAt(i + 3)];
              bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
              if (p < bufferLength) bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
              if (p < bufferLength) bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
            }
            return bytes;
          };

          const binaryBytes = base64ToUint8Array(data.foldFileBase64);
          await uploadBytes(storageRef, binaryBytes);
          storageUrl = await getDownloadURL(storageRef);
          console.log("Uploaded successfully to Firebase Storage. URL:", storageUrl);
        }
      } catch (uploadError) {
        console.warn("Could not save to Firebase Storage (maybe not logged in):", uploadError);
      }

      // Adicionar à biblioteca local
      try {
        const fileSizeBytes = data.foldFileBase64 ? (data.foldFileBase64.length * 0.75) : 0;
        const newFile = {
            id: Date.now().toString(),
            title: finalFileName,
            size: (fileSizeBytes / 1024).toFixed(2) + ' KB',
            date: 'Agora',
            data: foldData,
            storageUrl: storageUrl, // Se salvou na nuvem, mantém o link
            type: 'fold'
        };

        addImportedProject(newFile);
        setConvertedFiles([newFile, ...convertedFiles]);
        Alert.alert('Sucesso!', 'PDF convertido com sucesso e salvo na sua biblioteca/nuvem!');
      } catch (jsonError) {
        Alert.alert('Erro ao interpretar', 'O servidor não devolveu um arquivo .fold válido.');
      }

    } catch (error) {
      console.error('Erro na conversão:', error);
      // Mostra a URL: quase sempre a falha é EXPO_PUBLIC_API_URL apontando para um
      // endereço local (ex.: 10.0.2.2, só válido no emulador) em vez da function.
      Alert.alert(
        'Erro de Conexão',
        `Não foi possível conectar ao servidor.\n\nURL usada:\n${API_URL}\n\nDetalhe: ${error.message}`
      );
    } finally {
      setIsConverting(false);
    }
  };

  const extractYtId = (url) => {
    if (!url) return null;
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/|v\/))([^&?]*)/);
    return m ? m[1] : null;
  };

  if (selectedTeacher) {
    const teacherActivities = classActivities.filter(a => a.teacherId === selectedTeacher.teacherId);
    return (
      <View style={[s.root, { backgroundColor: theme.bg }]}>
        <View style={[s.topBar, { backgroundColor: theme.bg }]}>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => setSelectedTeacher(null)}>
            <Feather name="arrow-left" size={24} color={theme.text} />
            <Text style={{ color: theme.text, fontSize: 16, marginLeft: 10, fontWeight: '700' }}>Voltar</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20 }}>
          <View style={[s.teacherAvatarLg, { backgroundColor: theme.primary }]}>
            {selectedTeacher.teacherPhoto?.startsWith('http') ? (
              <Image source={{ uri: selectedTeacher.teacherPhoto }} style={{ width: 60, height: 60, borderRadius: 30 }} />
            ) : (
              <Text style={{ color: theme.bg, fontWeight: '900', fontSize: 24 }}>
                {(selectedTeacher.teacherName || '?').charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <View style={{ marginLeft: 16, flex: 1 }}>
            <Text style={{ color: theme.text, fontSize: 22, fontWeight: '900' }}>{selectedTeacher.teacherName}</Text>
            <Text style={{ color: theme.textDim, fontSize: 13 }}>
              {teacherActivities.length} {teacherActivities.length === 1 ? 'aula publicada' : 'aulas publicadas'}
            </Text>
          </View>
        </View>

        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          {teacherActivities.length === 0 ? (
            <View style={{ padding: 40, alignItems: 'center', opacity: 0.6 }}>
              <Feather name="inbox" size={36} color={theme.textMuted} style={{ marginBottom: 12 }} />
              <Text style={{ color: theme.textMuted, textAlign: 'center' }}>Este origamista ainda não publicou nenhuma aula.</Text>
            </View>
          ) : (
            <View style={s.filesList}>
              {teacherActivities.map(act => {
                const videoId = act.type === 'Video' ? extractYtId(act.url) : null;
                return (
                  <TouchableOpacity
                    key={act.id}
                    style={[s.fileCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                    onPress={async () => {
                      if (act.type === 'Video' && videoId) {
                        setIsFullscreenVideo(true);
                        setPlayingVideo({ id: act.id, title: act.title, videoId });
                      } else if (act.url) {
                        try {
                          const res = await fetch(act.url);
                          const data = await res.json();
                          setFoldingOrigami(data);
                        } catch {
                          Alert.alert('Erro', 'Não foi possível abrir este arquivo.');
                        }
                      }
                    }}
                  >
                    <View style={[s.fileIcon, { backgroundColor: act.type === 'Video' ? theme.danger : theme.primaryLight, overflow: 'hidden' }]}>
                      {act.type === 'Video' && videoId ? (
                        <>
                          <Image source={{ uri: `https://img.youtube.com/vi/${videoId}/default.jpg` }} style={[StyleSheet.absoluteFillObject, { opacity: 0.8 }]} resizeMode="cover" />
                          <Feather name="play" size={16} color="white" style={{ position: 'absolute' }} />
                        </>
                      ) : (
                        <Feather name="file-text" size={20} color={theme.primary} />
                      )}
                    </View>
                    <View style={s.fileInfo}>
                      <Text style={[s.fileTitle, { color: theme.text }]} numberOfLines={1}>{act.title}</Text>
                      <Text style={[s.fileSize, { color: theme.textDim }]}>{new Date(act.createdAt).toLocaleDateString('pt-BR')}</Text>
                    </View>
                    <Feather name="chevron-right" size={20} color={theme.textDim} style={{ marginLeft: 8 }} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  if (playingVideo) {
    return (
      <View style={[s.root, { backgroundColor: theme.bg, paddingTop: isLandscape ? 0 : 40 }]}>
         {!isLandscape && (
           <TouchableOpacity
             style={{flexDirection: 'row', alignItems: 'center', padding: 20}}
             onPress={closePlayer}
           >
              <Feather name="arrow-left" size={24} color={theme.text} />
              <Text style={{color: theme.text, fontSize: 18, marginLeft: 10, fontWeight: 'bold'}}>Voltar à Biblioteca</Text>
           </TouchableOpacity>
         )}
         <View style={{ width: isLandscape ? '100%' : windowDims.width, height: isLandscape ? '100%' : 300, backgroundColor: 'black' }}>
            <YoutubePlayer
              ref={playerRef}
              height={isLandscape ? windowDims.height : 300}
              width={windowDims.width}
              play={true}
              videoId={playingVideo.videoId}
              initialPlayerParams={{ start: Math.floor(playingVideo.watchedSeconds || 0) }}
              webViewProps={{
                originWhitelist: ['*'],
                allowsInlineMediaPlayback: true,
              }}
              onChangeState={(state) => {
                if (state === 'ended' && !completionTrackedRef.current) {
                  completionTrackedRef.current = true;
                  // Concluído: zera a posição para recomeçar do início na próxima vez
                  updateVideoProgress(playingVideo.id, 0, true);
                } else if (state === 'paused') {
                  // Pausou: salva a posição imediatamente
                  const isSavedProject = importedProjects.some(p => p.id === playingVideo.id);
                  if (isSavedProject && currentTimeRef.current > 5) {
                    updateVideoProgress(playingVideo.id, Math.floor(currentTimeRef.current));
                  }
                }
              }}
            />
            {isLandscape && (
              <TouchableOpacity
                style={{ position: 'absolute', top: 20, left: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 20 }}
                onPress={closePlayer}
              >
                <Feather name="arrow-left" size={24} color="white" />
              </TouchableOpacity>
            )}
         </View>
         {!isLandscape && (
           <View style={{padding: 20}}>
              <Text style={{color: theme.text, fontSize: 22, fontWeight: 'bold'}}>{playingVideo.title}</Text>
              <Text style={{color: theme.textDim, fontSize: 14, marginTop: 12}}>
                 O progresso é salvo automaticamente — retome de onde parou a qualquer momento.
              </Text>
           </View>
         )}
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      {/* Top bar */}
      <View style={[s.topBar, { backgroundColor: theme.bg }]}>
        <Text style={[s.logo, { color: theme.text }]}><Text style={{ color: theme.primary }}>Origami</Text>App</Text>
      </View>

      <View style={s.header}>
        <Text style={[s.title, { color: theme.text }]}>Sua Biblioteca</Text>
        <Text style={[s.subtitle, { color: theme.textMuted }]}>Seus projetos do YouTube e Origamis locais</Text>
      </View>

      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <View style={s.searchBar}>
          <Feather name="search" size={18} color={theme.textDim} />
          <TextInput
            style={[s.searchInput, { color: theme.text }]}
            placeholder="Buscar meus projetos salvos..."
            placeholderTextColor={theme.textDim}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
               <Feather name="x-circle" size={18} color={theme.textDim} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        ref={mainScrollRef}
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* BLOCO 1: YOUTUBE E IMPORTAÇÃO */}
        <View style={s.sectionHeader}>
          <Text style={[s.sectionTitle, { color: theme.text }]}>Meus Projetos</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity onPress={() => setShowYoutubeForm(!showYoutubeForm)}>
              <Text style={[s.sectionSubtitle, { color: theme.danger, fontWeight: 'bold' }]}>
                + YouTube
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {showYoutubeForm && (
           <View style={[s.formCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
             <Text style={{ fontSize: 13, color: theme.text, marginBottom: 10, fontWeight: '600'}}>Adicionar Vídeo do YouTube</Text>
             <TextInput 
               style={[s.inputObj, { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border }]}
               placeholder="Título (ex: Rosa de Papel Fácil)"
               placeholderTextColor={theme.textDim}
               value={ytTitle}
               onChangeText={setYtTitle}
             />
             <TextInput 
               style={[s.inputObj, { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border }]}
               placeholder="Link do YouTube (https://youtu.be/...)"
               placeholderTextColor={theme.textDim}
               value={ytUrl}
               onChangeText={setYtUrl}
             />
             <TouchableOpacity style={[s.saveBtn, { backgroundColor: theme.danger }]} onPress={handleSaveYoutube}>
               <Text style={{ color: theme.bg, fontWeight: 'bold' }}>Salvar na Biblioteca</Text>
             </TouchableOpacity>
           </View>
        )}

        <View style={s.filesList}>
          {filteredProjects.length > 0 ? (
            filteredProjects.map(p => (
              <View key={p.id} style={[s.fileCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <TouchableOpacity 
                  style={{flexDirection: 'row', flex: 1, alignItems: 'center'}}
                  onPress={async () => {
                    if(p.type === 'youtube') {
                        setIsFullscreenVideo(true);
                        setPlayingVideo(p);
                    } else if (p.url && !p.data) {
                        try {
                           const res = await fetch(p.url);
                           const remoteData = await res.json();
                           setFoldingOrigami(remoteData);
                        } catch(e) {
                           alert('Falha ao baixar dados do origami.');
                        }
                    } else if (p.data) {
                        setFoldingOrigami(p.data);
                    } else {
                        setFoldingOrigami(p.id);
                    }
                  }}
                >
                  <View style={[s.fileIcon, { backgroundColor: p.type === 'youtube'? theme.danger : theme.bg, overflow: 'hidden' }]}>
                    {p.type === 'youtube' && p.videoId ? (
                      <>
                        <Image source={{ uri: `https://img.youtube.com/vi/${p.videoId}/default.jpg` }} style={[StyleSheet.absoluteFillObject, { opacity: 0.8 }]} resizeMode="cover" />
                        <Feather name="play" size={16} color="white" style={{ position: 'absolute' }} />
                      </>
                    ) : (
                      <Feather name="folder" size={20} color={theme.text} />
                    )}
                  </View>
                  <View style={s.fileInfo}>
                    <Text style={[s.fileTitle, { color: theme.text }]} numberOfLines={1}>{p.title?.replace(/\.fold$/, '')}</Text>
                    <Text style={[s.fileSize, { color: theme.textDim }]}>{p.type === 'youtube' ? (p.watchedSeconds ? `Parou em ${Math.floor(p.watchedSeconds / 60)}:${String(Math.floor(p.watchedSeconds % 60)).padStart(2, '0')}` : 'Salvo') : 'Progresso: ' + p.progress} • {p.date}</Text>
                  </View>
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {(p.type === 'youtube' || p.type === 'fold') && (
                    <TouchableOpacity 
                       style={s.fileAction} 
                       onPress={() => {
                         setEditingProject(p);
                         setEditTitle(p.title);
                       }}
                    >
                      <Feather name="edit-2" size={18} color={theme.textDim} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity 
                     style={s.fileAction} 
                     onPress={() => {
                       Alert.alert('Excluir', 'Deseja remover este projeto?', [
                         { text: 'Cancelar', style: 'cancel' },
                         { 
                           text: 'Remover', 
                           style: 'destructive', 
                           onPress: () => {
                             const isCommunity = savedOrigamis.some(o => o.id === p.id || o.videoId === p.videoId);
                             if (isCommunity) {
                               unsaveOrigami(p.id);
                             } else {
                               removeImportedProject(p.id);
                             }
                           }
                         }
                       ])
                     }}>
                    <Feather name="trash-2" size={20} color={theme.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View style={{ padding: 20, alignItems: 'center', opacity: 0.6 }}>
              <Feather name="inbox" size={32} color={theme.textMuted} style={{ marginBottom: 8 }} />
              <Text style={{ color: theme.textMuted }}>{searchQuery !== '' ? 'Nenhum resultado.' : 'Nenhum projeto salvo.'}</Text>
            </View>
          )}
        </View>

        <View style={s.divider} />

        {/* BLOCO 2: AULAS DO ORIGAMISTA */}
        <View style={[s.sectionHeader, { flexDirection: 'column', alignItems: 'flex-start', marginBottom: 8 }]}>
          <Text style={[s.sectionTitle, { color: theme.text }]}>Origamistas que sigo</Text>
          <Text style={[s.sectionSubtitle, { color: theme.textMuted }]}>Toque num origamista para ver as aulas exclusivas</Text>
        </View>

        {studentSubscriptions.length === 0 ? (
          <View style={{ padding: 20, alignItems: 'center', opacity: 0.6, marginBottom: 8 }}>
            <Feather name="users" size={32} color={theme.textMuted} style={{ marginBottom: 8 }} />
            <Text style={{ color: theme.textMuted, textAlign: 'center' }}>Você ainda não segue nenhum origamista.</Text>
          </View>
        ) : (
          <View style={[s.filesList, { marginBottom: 8 }]}>
            {studentSubscriptions.map(sub => {
              const actCount = classActivities.filter(a => a.teacherId === sub.teacherId).length;
              return (
                <TouchableOpacity
                  key={sub.teacherId}
                  style={[s.fileCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={() => setSelectedTeacher(sub)}
                >
                  <View style={[s.teacherAvatar, { backgroundColor: theme.primary }]}>
                    {sub.teacherPhoto?.startsWith('http') ? (
                      <Image source={{ uri: sub.teacherPhoto }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                    ) : (
                      <Text style={{ color: theme.bg, fontWeight: '900', fontSize: 18 }}>
                        {(sub.teacherName || '?').charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={s.fileInfo}>
                    <Text style={[s.fileTitle, { color: theme.text }]}>{sub.teacherName}</Text>
                    <Text style={[s.fileSize, { color: theme.textDim }]}>
                      {actCount} {actCount === 1 ? 'aula' : 'aulas'} · Seguindo
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={theme.textDim} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={[s.formCard, { backgroundColor: theme.surface, borderColor: theme.border, marginBottom: 24 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Feather name="user-plus" size={16} color={theme.primary} />
            <Text style={{ fontSize: 14, color: theme.text, fontWeight: '700' }}>Seguir um novo origamista</Text>
          </View>
          <Text style={{ fontSize: 12, color: theme.textDim, marginBottom: 12 }}>
            Peça o código de convite a quem você quer seguir e receba os tutoriais exclusivos dele.
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              style={[s.inputObj, { flex: 1, backgroundColor: theme.bg, color: theme.text, borderColor: theme.border, marginBottom: 0 }]}
              placeholder="Ex: A3F2-B19C"
              placeholderTextColor={theme.textDim}
              value={inviteCode}
              autoCapitalize="characters"
              maxLength={9}
              onChangeText={(t) => setInviteCode(formatInviteCode(t))}
            />
            <TouchableOpacity
              style={{ backgroundColor: theme.primary, paddingHorizontal: 18, borderRadius: 12, justifyContent: 'center', opacity: inviteCode.length >= 9 ? 1 : 0.5 }}
              disabled={inviteCode.length < 9}
              onPress={async () => {
                const res = await joinClass(inviteCode.toUpperCase());
                if (res.success) {
                  Alert.alert('Seguindo!', res.message);
                  setInviteCode('');
                } else {
                  Alert.alert('Erro', res.error);
                }
              }}
            >
              <Text style={{ color: theme.bg, fontWeight: 'bold' }}>Seguir</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.divider} />

        <View style={[s.sectionHeader, { flexDirection: 'column', alignItems: 'flex-start' }]}>
          <Text style={[s.sectionTitle, { color: theme.text }]}>Ferramentas do Criador</Text>
          <Text style={[s.sectionSubtitle, { color: theme.textMuted }]}>Transforme PDFs em tutoriais interativos</Text>
        </View>

        <TouchableOpacity 
          style={[s.importBtn, { borderColor: theme.primary, backgroundColor: theme.primary + '1A', opacity: isConverting ? 0.7 : 1 }]} 
          onPress={handleConvertPDF}
          disabled={isConverting}
        >
          {isConverting ? (
            <ActivityIndicator size="large" color={theme.primary} style={{ marginBottom: 12 }} />
          ) : (
            <Feather name="upload-cloud" size={32} color={theme.primary} style={{ marginBottom: 12 }} />
          )}
          <Text style={[s.importText, { color: theme.primary }]}>
            {isConverting ? 'Convertendo PDF com IA...' : 'Selecionar PDF para Converter'}
          </Text>
          <Text style={[s.importSubtext, { color: theme.primary, opacity: 0.8 }]}>
            Gera um arquivo .fold e salva no Storage da Nuvem
          </Text>
        </TouchableOpacity>

        {convertedFiles.length > 0 && (
          <View style={s.filesList}>
            <Text style={[s.sectionSubtitle, { color: theme.text, marginBottom: 8, fontWeight: 'bold' }]}>Convertidos Recentemente:</Text>
            {convertedFiles.map(f => (
              <View key={f.id} style={[s.fileCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={[s.fileIcon, { backgroundColor: theme.bg }]}>
                  <Feather name="package" size={20} color={theme.primary} />
                </View>
                <View style={s.fileInfo}>
                  <Text style={[s.fileTitle, { color: theme.text }]} numberOfLines={1}>{f.title}</Text>
                  <Text style={[s.fileSize, { color: theme.textDim }]}>{f.size} • {f.date}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

      </ScrollView>

      {/* RENAME POPUP/DIALOG MODAL */}
      {editingProject && (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 999 }]}>
          <View style={{ backgroundColor: theme.surface, width: '90%', maxWidth: 400, padding: 22, borderRadius: 16, borderWidth: 1, borderColor: theme.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 10 }}>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: 'bold', marginBottom: 6 }}>Renomear Vídeo</Text>
            <Text style={{ color: theme.textDim, fontSize: 13, marginBottom: 16 }}>Mude o título deste vídeo para organizar sua biblioteca.</Text>
            
            <TextInput
              style={[s.inputObj, { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border, height: 48, borderRadius: 8, paddingHorizontal: 12, borderWidth: 1, marginBottom: 20 }]}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Digite o novo título..."
              placeholderTextColor={theme.textDim}
              autoFocus
            />
            
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity 
                style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: theme.border }}
                onPress={() => setEditingProject(null)}
              >
                <Text style={{ color: theme.text, fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, backgroundColor: theme.primary }}
                onPress={async () => {
                  if (editTitle.trim().length === 0) {
                    Alert.alert("Erro", "O título não pode estar em branco.");
                    return;
                  }
                  try {
                    await updateYoutubeVideoTitle(editingProject.id, editTitle.trim());
                    setEditingProject(null);
                    Alert.alert("Sucesso", "Vídeo renomeado para você!");
                  } catch (e) {
                    Alert.alert("Erro", "Ocorreu um erro ao renomear.");
                  }
                }}
              >
                <Text style={{ color: theme.bg, fontWeight: 'bold' }}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
    paddingHorizontal: 20, marginTop: 10, marginBottom: 24,
  },
  title: { fontSize: 28, fontWeight: '900' },
  subtitle: { fontSize: 14, marginTop: 4 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '800' },
  sectionSubtitle: { fontSize: 13, marginTop: 2 },

  divider: { height: 1, backgroundColor: '#e5e5e5', marginVertical: 32, opacity: 0.5 },
  filesList: { gap: 12 },
  fileCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderRadius: 16, borderWidth: 1,
  },
  fileIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  fileInfo: { flex: 1, marginLeft: 16 },
  fileTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  fileSize: { fontSize: 12 },
  fileAction: { padding: 8 },
  teacherAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  teacherAvatarLg: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 10,
    fontSize: 14,
  },
  formCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  inputObj: {
    height: 42,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
    fontSize: 13,
  },
  saveBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  importBtn: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  importText: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  importSubtext: { fontSize: 13, textAlign: 'center' },
});
