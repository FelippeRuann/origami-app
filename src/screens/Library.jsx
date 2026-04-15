import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useApp } from '../context/AppContext';

const { width } = Dimensions.get('window');

export default function Library() {
  const { theme } = useApp();
  const [isConverting, setIsConverting] = useState(false);
  const [convertedFiles, setConvertedFiles] = useState([
    { id: '1', title: 'Origami_Basics.fold', size: '1.2 MB', date: 'Hoje' },
  ]);

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

      // Preparar o arquivo para envio (FormData)
      const formData = new FormData();
      formData.append('pdf', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/pdf',
      });

      // Enviar para o nosso Backend (Express na porta 3000)
      const response = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Sucesso!', 'PDF convertido para .fold com sucesso!');
        // Adiciona o novo arquivo .fold na lista
        const newFile = {
          id: Date.now().toString(),
          title: file.name.replace('.pdf', '.fold'),
          size: 'Calculando...',
          date: 'Agora'
        };
        setConvertedFiles([newFile, ...convertedFiles]);
      } else {
        Alert.alert('Erro', data.error || 'Falha ao converter o PDF');
      }
    } catch (error) {
      console.error('Erro na conversão:', error);
      Alert.alert('Erro', 'Ocorreu um problema ao tentar converter o arquivo.');
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      {/* Top bar */}
      <View style={[s.topBar, { backgroundColor: theme.bg }]}>
        <Text style={[s.logo, { color: theme.text }]}><Text style={{ color: theme.primary }}>Origami</Text>App</Text>
      </View>

      <View style={s.header}>
        <Text style={[s.title, { color: theme.text }]}>Converter</Text>
        <Text style={[s.subtitle, { color: theme.textMuted }]}>Transforme PDFs em tutoriais .fold</Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Área de Upload / Conversão */}
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
            O arquivo será processado no servidor e devolvido como .fold
          </Text>
        </TouchableOpacity>

        {/* Lista de Arquivos Convertidos */}
        <View style={s.sectionHeader}>
          <Text style={[s.sectionTitle, { color: theme.text }]}>Meus Tutoriais (.fold)</Text>
        </View>

        <View style={s.filesList}>
          {convertedFiles.map(f => (
            <View key={f.id} style={[s.fileCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
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
          
          {convertedFiles.length === 0 && (
            <Text style={{ color: theme.textMuted, textAlign: 'center', marginTop: 20 }}>
              Nenhum tutorial convertido ainda.
            </Text>
          )}
        </View>

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

  importBtn: {
    borderWidth: 2, borderStyle: 'dashed', borderRadius: 16,
    padding: 32, alignItems: 'center', justifyContent: 'center',
    marginBottom: 32,
  },
  importText: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  importSubtext: { fontSize: 12, textAlign: 'center', fontWeight: '600' },

  sectionHeader: { marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },

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
});
