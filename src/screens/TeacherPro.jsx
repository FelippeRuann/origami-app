import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard';
import { useApp } from '../context/AppContext';

export default function TeacherPro() {
  const { theme, managedStudents, teacherCode, classActivities, publishActivity, removeStudent } = useApp();
  const [isUploading, setIsUploading] = useState(false);
  
  const [newActTitle, setNewActTitle] = useState('');
  const [newActType, setNewActType] = useState('Video'); // 'Video' ou 'PDF/Fold'
  const [newActUrl, setNewActUrl] = useState(''); // Para vídeos

  const handlePublish = async () => {
     if(newActTitle.length < 3) {
        Alert.alert('Erro', 'Dê um título para o projeto.');
        return;
     }

     if (newActType === 'Video') {
       if (!newActUrl.includes('youtube') && !newActUrl.includes('youtu.be')) {
         Alert.alert('Erro', 'Insira um link válido do YouTube.');
         return;
       }
       // Envia o link do YouTube direto
       publishActivity(newActTitle, newActType, newActUrl);
       setNewActTitle('');
       setNewActUrl('');
       Alert.alert('Sucesso!', 'O vídeo foi publicado para seus alunos!');
     } else {
       // Se for arquivo Fold/PDF
       try {
         const result = await DocumentPicker.getDocumentAsync({
           type: ['application/pdf', 'application/json', '*/*'],
           copyToCacheDirectory: true,
         });

         if (result.canceled || !result.assets || result.assets.length === 0) {
           return;
         }

         // Simulando upload
         setIsUploading(true);
         setTimeout(() => {
            setIsUploading(false);
            const file = result.assets[0];
            publishActivity(newActTitle, 'Fold', file.uri); // ou URL remoto no futuro 
            setNewActTitle('');
            Alert.alert('Sucesso!', 'Arquivo ' + file.name + ' enviado para os alunos!');
         }, 1000);
       } catch (err) {
         Alert.alert('Erro', 'Houve um problema ao selecionar o arquivo.');
       }
     }
  };

  const copyCode = async () => {
    await Clipboard.setStringAsync(teacherCode);
    Alert.alert('Código Copiado!', `O código ${teacherCode} foi copiado para sua área de transferência.`);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { backgroundColor: theme.bg }]}>
        <Text style={[styles.logo, { color: theme.text }]}><Text style={{ color: theme.primary }}>Origami</Text>Pro</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Header - Convite da Turma */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Seu Estúdio Virtual</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Seus seguidores usam este código na aba Biblioteca para verem seus VIPs.
          </Text>
          
          <View style={[styles.codeBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
             <Text style={[styles.codeLabel, { color: theme.textDim }]}>CÓDIGO DE CONVITE</Text>
             <View style={styles.codeRow}>
                <Text style={[styles.codeText, { color: theme.primary }]}>{teacherCode}</Text>
                <TouchableOpacity style={[styles.copyBtn, { backgroundColor: theme.primaryLight }]} onPress={copyCode}>
                   <Feather name="copy" size={20} color={theme.primary} />
                </TouchableOpacity>
             </View>
          </View>
        </View>

        {/* Publicar nova atividade */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Novo Tutorial VIP</Text>
          </View>
          <View style={{ backgroundColor: theme.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: theme.border }}>
             <TextInput 
                style={[styles.input, { color: theme.text, borderColor: theme.border, marginBottom: 12 }]}
                placeholder="Ex: Como dobrar a Garça da Aula 2"
                placeholderTextColor={theme.textDim}
                value={newActTitle}
                onChangeText={setNewActTitle}
             />
             
             <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                <TouchableOpacity 
                   style={[styles.typeBtn, newActType === 'Video' ? { backgroundColor: theme.primary, borderColor: theme.primary } : { borderColor: theme.border }]}
                   onPress={() => setNewActType('Video')}
                >
                   <Feather name="youtube" size={16} color={newActType === 'Video' ? theme.bg : theme.text} />
                   <Text style={{ marginLeft: 8, fontWeight: '600', color: newActType === 'Video' ? theme.bg : theme.text }}>Vídeo</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                   style={[styles.typeBtn, newActType === 'PDF' ? { backgroundColor: theme.primary, borderColor: theme.primary } : { borderColor: theme.border }]}
                   onPress={() => setNewActType('PDF')}
                >
                   <Feather name="file-text" size={16} color={newActType === 'PDF' ? theme.bg : theme.text} />
                   <Text style={{ marginLeft: 8, fontWeight: '600', color: newActType === 'PDF' ? theme.bg : theme.text }}>Arquivo (.fold ou .pdf)</Text>
                </TouchableOpacity>
             </View>

             {newActType === 'Video' && (
                <TextInput 
                  style={[styles.input, { color: theme.text, borderColor: theme.border, marginBottom: 16 }]}
                  placeholder="Link do YouTube (ex: https://youtu.be/...)"
                  placeholderTextColor={theme.textDim}
                  value={newActUrl}
                  onChangeText={setNewActUrl}
                />
             )}

             <TouchableOpacity style={[styles.actionBtnPrimary, { backgroundColor: theme.primary, opacity: isUploading ? 0.7 : 1 }]} onPress={handlePublish} disabled={isUploading}>
                {isUploading ? (
                  <Text style={[styles.actionBtnPrimaryText, { color: theme.bg }]}>Enviando...</Text>
                ) : (
                  <>
                    <Feather name="send" size={20} color={theme.bg} style={{ marginRight: 8 }} />
                    <Text style={[styles.actionBtnPrimaryText, { color: theme.bg }]}>
                       {newActType === 'Video' ? 'Publicar para a Turma' : 'Selecionar Arquivo e Publicar'}
                    </Text>
                  </>
                )}
             </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Tutoriais Recentemente Publicados</Text>
            <TouchableOpacity><Text style={[styles.linkText, { color: theme.primary }]}>Ver todos</Text></TouchableOpacity>
          </View>
          
          <View style={[styles.activityCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.activityRow}>
              <View style={[styles.iconBox, { backgroundColor: theme.primaryLight }]}>
                <Feather name="file-text" size={20} color={theme.primary} />
              </View>
              <View style={styles.activityInfo}>
                <Text style={[styles.activityTitle, { color: theme.text }]}>Garça Iniciante (Exemplo)</Text>
                <Text style={[styles.activitySubtitle, { color: theme.textMuted }]}>Enviado p/ Aprendizes VIP</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.sendBtn}>
              <Feather name="send" size={18} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Membros VIP (${managedStudents.length})</Text>
            <View style={[styles.badge, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.badgeText, { color: theme.textDim }]}>{managedStudents.length} aprendizes</Text>
            </View>
          </View>
          
          <View style={[styles.studentsList, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {managedStudents.length === 0 ? (
              <Text style={{ color: theme.textMuted, fontSize: 13, textAlign: 'center', padding: 20 }}>Nenhum membro inscrito ainda.</Text>
            ) : (
              managedStudents.map((student, index) => (
                <View 
                  key={student.id} 
                  style={[
                    styles.studentItem, 
                    index !== managedStudents.length - 1 && [styles.studentBorder, { borderBottomColor: theme.border }]
                  ]}
                >
                  <View style={styles.studentRow}>
                    <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                      <Text style={[styles.avatarText, { color: theme.bg }]}>{student.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View>
                      <Text style={[styles.studentName, { color: theme.text }]}>{student.name}</Text>
                      <Text style={{ color: theme.textDim, fontSize: 12, marginLeft: 12 }}>{student.email}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => {
                    Alert.alert(
                      "Remover Aprendiz",
                      "Tem certeza que deseja remover este membro da sua comunidade?",
                      [
                        { text: "Cancelar", style: "cancel" },
                        { text: "Remover", style: "destructive", onPress: () => removeStudent(student.id) }
                      ]
                    );
                  }}>
                    <Feather name="trash-2" size={20} color={theme.danger || '#ef4444'} />
                  </TouchableOpacity>
                </View>
              ))
            )}
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

  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 15
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  codeBox: {
     marginTop: 24,
     padding: 20,
     borderRadius: 16,
     borderWidth: 1,
     alignItems: 'center'
  },
  codeLabel: {
     fontSize: 11,
     fontWeight: '800',
     letterSpacing: 2,
     marginBottom: 8
  },
  codeRow: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'center'
  },
  codeText: {
     fontSize: 32,
     fontWeight: '900',
     letterSpacing: 4
  },
  copyBtn: {
     marginLeft: 16,
     width: 44,
     height: 44,
     borderRadius: 22,
     alignItems: 'center',
     justifyContent: 'center'
  },

  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 15
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  codeBox: {
     marginTop: 24,
     padding: 20,
     borderRadius: 16,
     borderWidth: 1,
     alignItems: 'center'
  },
  codeLabel: {
     fontSize: 11,
     fontWeight: '800',
     letterSpacing: 2,
     marginBottom: 8
  },
  codeRow: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'center'
  },
  codeText: {
     fontSize: 32,
     fontWeight: '900',
     letterSpacing: 4
  },
  copyBtn: {
     marginLeft: 16,
     width: 44,
     height: 44,
     borderRadius: 22,
     alignItems: 'center',
     justifyContent: 'center'
  },

  actionsRow: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  actionBtnPrimary: { flex: 1, padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
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
