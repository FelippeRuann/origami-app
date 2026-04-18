import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Alert, ActivityIndicator, Platform, TextInput, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useApp } from '../context/AppContext';
import { WebView } from 'react-native-webview';

const { width } = Dimensions.get('window');

// DICA: Se estiver usando o celular físico (Expo Go), troque 'localhost' pelo IP do seu computador na rede Wi-Fi.
const API_URL = Platform.OS === 'web' ? '/api/upload-pdf' : 'http://localhost:3000/api/upload-pdf';

export default function Library() {
  const { theme, setFoldingOrigami, importedProjects, addImportedProject, removeImportedProject, updateVideoProgress } = useApp();
  const [isConverting, setIsConverting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // States do Flow do YouTube (Cadastro Principal Atividade 4)
  const [showYoutubeForm, setShowYoutubeForm] = useState(false);
  const [ytUrl, setYtUrl] = useState('');
  const [ytTitle, setYtTitle] = useState('');

  // Youtube Player Modal
  const [playingVideo, setPlayingVideo] = useState(null); // holds the project object currently playing

  // Arquivos convertidos na sessão
  const [convertedFiles, setConvertedFiles] = useState([]);

  // Filtragem local
  const filteredProjects = importedProjects.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveYoutube = () => {
    if (!ytUrl || !ytTitle) {
      Alert.alert('Campos vazios', 'Preencha o título e o link do YouTube.');
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

  const handleImportFold = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/octet-stream', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const file = result.assets[0];
      
      // Lê o conteúdo do arquivo
      const response = await fetch(file.uri);
      const fileText = await response.text();
      let foldData;
      
      try {
        foldData = JSON.parse(fileText);
      } catch (e) {
        Alert.alert('Formato inválido', 'O arquivo selecionado não é um arquivo .fold válido.');
        return;
      }

      if (!foldData || !foldData.steps || !Array.isArray(foldData.steps)) {
        Alert.alert('Arquivo inválido', 'O arquivo não contém a estrutura de um origami.');
        return;
      }

      const newProject = {
        id: Date.now().toString(),
        title: foldData.title || file.name.replace(/\.fold$/, ''),
        progress: '0%',
        date: 'Agora',
        data: foldData
      };

      // Adiciona o novo projeto no estado global e salva no AsyncStorage da memória do aparelho
      addImportedProject(newProject);
      Alert.alert('Sucesso!', 'Origami importado e salvo no seu celular! Clique nela para abrir.');

    } catch (error) {
      console.error('Erro ao importar:', error);
      Alert.alert('Erro', 'Não foi possível importar o arquivo.');
    }
  };

  const handleConvertPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setIsConverting(true);
      const file = result.assets[0];

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

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Sucesso!', 'PDF convertido para .fold com sucesso!');
        const newFile = {
          id: Date.now().toString(),
          title: file.name.replace('.pdf', '.fold'),
          size: 'Pronto',
          date: 'Agora'
        };
        setConvertedFiles([newFile, ...convertedFiles]);
      } else {
        Alert.alert('Erro', data.error || 'Falha ao converter o PDF');
      }
    } catch (error) {
      console.error('Erro na conversão:', error);
      Alert.alert('Erro de Conexão', 'Não foi possível conectar ao servidor. Verifique se o IP está correto e se o servidor está rodando.');
    } finally {
      setIsConverting(false);
    }
  };

  if (playingVideo) {
    return (
      <View style={[s.root, { backgroundColor: theme.bg, paddingTop: 40 }]}>
         <TouchableOpacity 
           style={{flexDirection: 'row', alignItems: 'center', padding: 20}}
           onPress={() => setPlayingVideo(null)}
         >
            <Feather name="arrow-left" size={24} color={theme.text} />
            <Text style={{color: theme.text, fontSize: 18, marginLeft: 10, fontWeight: 'bold'}}>Voltar à Biblioteca</Text>
         </TouchableOpacity>
         <View style={{ width: '100%', height: 300 }}>
            <WebView
               style={{ flex: 1 }}
               javaScriptEnabled={true}
               domStorageEnabled={true}
               allowsFullscreenVideo={true}
               source={{ uri: `https://www.youtube.com/embed/${playingVideo.videoId}?playsinline=1&origin=https://www.youtube.com` }}
            />
         </View>
         <View style={{padding: 20}}>
            <Text style={{color: theme.text, fontSize: 22, fontWeight: 'bold'}}>{playingVideo.title}</Text>
            <Text style={{color: theme.textDim, fontSize: 14, marginTop: 10}}>
               O progresso é salvo no banco quando você assiste!
            </Text>
         </View>
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

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* BLOCO 1: YOUTUBE E IMPORTAÇÃO */}
        <View style={s.sectionHeader}>
          <Text style={[s.sectionTitle, { color: theme.text }]}>Meus Projetos</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity onPress={() => setShowYoutubeForm(!showYoutubeForm)}>
              <Text style={[s.sectionSubtitle, { color: theme.danger, fontWeight: 'bold' }]}>
                + YouTube
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleImportFold}>
              <Text style={[s.sectionSubtitle, { color: theme.primary, fontWeight: 'bold' }]}>
                + .fold
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
                  onPress={() => {
                    if(p.type === 'youtube') {
                        setPlayingVideo(p);
                    }
                    else if (p.data) setFoldingOrigami(p.data);
                    else setFoldingOrigami(p.id);
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
                    <Text style={[s.fileTitle, { color: theme.text }]} numberOfLines={1}>{p.title}</Text>
                    <Text style={[s.fileSize, { color: theme.textDim }]}>{p.type === 'youtube' ? (p.watchedSeconds ? `Parou em: ${p.watchedSeconds}s` : 'Salvo') : 'Progresso: ' + p.progress} • {p.date}</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity 
                   style={s.fileAction} 
                   onPress={() => {
                     Alert.alert('Excluir', 'Deseja remover este projeto?', [
                       { text: 'Cancelar', style: 'cancel' },
                       { text: 'Remover', style: 'destructive', onPress: () => removeImportedProject(p.id) }
                     ])
                   }}>
                  <Feather name="trash-2" size={20} color={theme.danger} />
                </TouchableOpacity>
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

        {/* BLOCO 2: FERRAMENTAS DO CRIADOR (CONVERSÃO) */}
        <View style={[s.sectionHeader, { flexDirection: 'column', alignItems: 'flex-start' }]}>
          <Text style={[s.sectionTitle, { color: theme.text }]}>Ferramentas do Criador</Text>
          <Text style={[s.sectionSubtitle, { color: theme.textMuted }]}>Transforme PDFs em tutoriais interativos</Text>
        </View>

        <TouchableOpacity 
          style={[s.importBtn, { borderColor: theme.primary, backgroundColor: theme.primaryLight, opacity: isConverting ? 0.7 : 1 }]} 
          onPress={handleConvertPDF}
          disabled={isConverting}
        >
          {isConverting ? (
            <ActivityIndicator size="large" color={theme.primary} style={{ marginBottom: 12 }} />
          ) : (
            <Feather name="upload-cloud" size={32} color={theme.primary} style={{ marginBottom: 12 }} />
          )}
          <Text style={[s.importText, { color: theme.primary }]}>
            {isConverting ? 'Convertendo com YOLO + Gemini...' : 'Selecionar PDF para Converter'}
          </Text>
          <Text style={[s.importSubtext, { color: theme.primary, opacity: 0.8 }]}>
            Gera um arquivo .fold automaticamente
          </Text>
        </TouchableOpacity>

        {/* Lista de Arquivos Convertidos Recentemente */}
        {convertedFiles.length > 0 && (
          <View style={s.filesList}>
            <Text style={[s.sectionSubtitle, { color: theme.text, marginBottom: 8, fontWeight: 'bold' }]}>Convertidos Recentemente:</Text>
            {convertedFiles.map(f => (
              <View key={f.id} style={[s.fileCard, { backgroundColor: theme.surface, borderColor: theme.primary }]}>
                <View style={[s.fileIcon, { backgroundColor: theme.primaryLight }]}>
                  <Feather name="package" size={20} color={theme.primary} />
                </View>
                <View style={s.fileInfo}>
                  <Text style={[s.fileTitle, { color: theme.text }]}>{f.title}</Text>
                  <Text style={[s.fileSize, { color: theme.textDim }]}>{f.size} • {f.date}</Text>
                </View>
                <TouchableOpacity style={s.fileAction}>
                  <Feather name="download" size={20} color={theme.text} />
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
    paddingHorizontal: 20, marginTop: 10, marginBottom: 24,
  },
  title: { fontSize: 28, fontWeight: '900' },
  subtitle: { fontSize: 14, marginTop: 4 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '800' },
  sectionSubtitle: { fontSize: 13, marginTop: 2 },

  divider: { height: 1, backgroundColor: '#e5e5e5', marginVertical: 32, opacity: 0.5 },

  importBtn: {
    borderWidth: 2, borderStyle: 'dashed', borderRadius: 16,
    padding: 32, alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  importText: { fontSize: 16, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  importSubtext: { fontSize: 12, textAlign: 'center', fontWeight: '600' },

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
  }
});
