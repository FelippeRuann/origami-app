import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, TextInput, Share } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { useApp } from '../context/AppContext';

export default function Pro() {
  const { theme, user, managedStudents, teacherCode, classActivities, publishActivity, removeStudent, addStudent, scrollToTopSignal } = useApp();
  const [isUploading, setIsUploading] = useState(false);
  const mainScrollRef = useRef(null);

  // Tocar na aba Pro já ativa: rola de volta ao topo
  useEffect(() => {
    if (scrollToTopSignal?.route === 'Pro' && scrollToTopSignal.tick > 0) {
      mainScrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [scrollToTopSignal]);
  const [studentEmailInput, setStudentEmailInput] = useState('');
  const [newActTitle, setNewActTitle] = useState('');
  const [newActType, setNewActType] = useState('Video');
  const [newActUrl, setNewActUrl] = useState('');

  const handleAddStudent = async () => {
    if (!studentEmailInput.includes('@')) {
      Alert.alert('Erro', 'Insira um e-mail válido.');
      return;
    }
    try {
      const result = await addStudent(studentEmailInput);
      if (result?.success) {
        Alert.alert(result.isPending ? 'E-mail não encontrado' : 'Sucesso', result.message);
        setStudentEmailInput('');
      } else {
        Alert.alert('Erro', result?.error || 'Não foi possível adicionar o aluno.');
      }
    } catch {
      Alert.alert('Erro', 'Houve um erro de rede.');
    }
  };

  const handlePublish = async () => {
    if (newActTitle.length < 3) {
      Alert.alert('Erro', 'Dê um título com ao menos 3 caracteres.');
      return;
    }

    if (newActType === 'Video') {
      if (!newActUrl.includes('youtube') && !newActUrl.includes('youtu.be')) {
        Alert.alert('Erro', 'Insira um link válido do YouTube.');
        return;
      }
      await publishActivity(newActTitle, 'Video', newActUrl);
      setNewActTitle('');
      setNewActUrl('');
      Alert.alert('Publicado!', 'O vídeo está disponível para seus alunos.');
      return;
    }

    // Arquivo (PDF / Fold)
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/json', '*/*'],
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets?.length) return;

      setIsUploading(true);
      const file = picked.assets[0];
      let downloadUrl = file.uri;

      try {
        const response = await fetch(file.uri);
        const blob = await response.blob();
        const storageRef = ref(storage, `teachers/${user.id}/activities/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, blob);
        downloadUrl = await getDownloadURL(storageRef);
      } catch (uploadErr) {
        console.warn('Upload falhou, usando URI local:', uploadErr);
      }

      await publishActivity(newActTitle, 'Fold', downloadUrl);
      setNewActTitle('');
      Alert.alert('Publicado!', `"${file.name}" enviado para os alunos.`);
    } catch {
      Alert.alert('Erro', 'Problema ao selecionar o arquivo.');
    } finally {
      setIsUploading(false);
    }
  };

  const copyCode = async () => {
    await Clipboard.setStringAsync(teacherCode);
    Alert.alert('Copiado!', `Código ${teacherCode} copiado.`);
  };

  const shareCode = async () => {
    try {
      await Share.share({
        message: `Venha dobrar comigo no OrigamiApp! 🦢\n\nSiga meu estúdio com o código ${teacherCode} na aba Biblioteca e receba meus tutoriais exclusivos.`,
      });
    } catch {}
  };

  // Estatísticas do estúdio
  const myActivities = classActivities.filter(act => act.teacherId === user?.id);
  const totalWatchedByStudents = managedStudents.reduce((sum, st) => sum + (st.progress || 0), 0);

  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      <View style={[s.topBar, { backgroundColor: theme.bg }]}>
        <Text style={[s.logo, { color: theme.text }]}>
          <Text style={{ color: theme.primary }}>Origami</Text>Pro
        </Text>
      </View>

      <ScrollView ref={mainScrollRef} style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Código de convite */}
        <View style={s.header}>
          <Text style={[s.title, { color: theme.text }]}>Estúdio do Origamista</Text>
          <Text style={[s.subtitle, { color: theme.textMuted }]}>
            Seus seguidores usam este código na aba Biblioteca para receber seus tutoriais exclusivos.
          </Text>

          {/* Painel do estúdio */}
          <View style={s.statsRow}>
            <View style={[s.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Feather name="users" size={18} color={theme.primary} />
              <Text style={[s.statNum, { color: theme.text }]}>{managedStudents.length}</Text>
              <Text style={[s.statLabel, { color: theme.textDim }]}>Aprendizes</Text>
            </View>
            <View style={[s.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Feather name="film" size={18} color={theme.primary} />
              <Text style={[s.statNum, { color: theme.text }]}>{myActivities.length}</Text>
              <Text style={[s.statLabel, { color: theme.textDim }]}>Tutoriais</Text>
            </View>
            <View style={[s.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Feather name="trending-up" size={18} color={theme.primary} />
              <Text style={[s.statNum, { color: theme.text }]}>{totalWatchedByStudents}</Text>
              <Text style={[s.statLabel, { color: theme.textDim }]}>Vídeos vistos</Text>
            </View>
          </View>

          <View style={[s.codeBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[s.codeLabel, { color: theme.textDim }]}>CÓDIGO DE CONVITE</Text>
            <View style={s.codeRow}>
              <Text style={[s.codeText, { color: theme.primary }]}>{teacherCode}</Text>
              <TouchableOpacity style={[s.copyBtn, { backgroundColor: theme.primaryLight }]} onPress={copyCode}>
                <Feather name="copy" size={20} color={theme.primary} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[s.shareBtn, { backgroundColor: theme.primary }]} onPress={shareCode} activeOpacity={0.85}>
              <Feather name="share-2" size={16} color={theme.bg} />
              <Text style={[s.shareBtnText, { color: theme.bg }]}>Convidar seguidores</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Publicar novo tutorial */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: theme.text, marginBottom: 16 }]}>Publicar Tutorial Exclusivo</Text>
          <View style={{ backgroundColor: theme.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: theme.border }}>
            <TextInput
              style={[s.input, { color: theme.text, borderColor: theme.border, marginBottom: 12 }]}
              placeholder="Ex: Como dobrar a Garça da Aula 2"
              placeholderTextColor={theme.textDim}
              value={newActTitle}
              onChangeText={setNewActTitle}
            />

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              <TouchableOpacity
                style={[s.typeBtn, newActType === 'Video'
                  ? { backgroundColor: theme.primary, borderColor: theme.primary }
                  : { borderColor: theme.border }]}
                onPress={() => setNewActType('Video')}
              >
                <Feather name="youtube" size={16} color={newActType === 'Video' ? theme.bg : theme.text} />
                <Text style={{ marginLeft: 6, fontWeight: '600', color: newActType === 'Video' ? theme.bg : theme.text }}>Vídeo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.typeBtn, newActType === 'PDF'
                  ? { backgroundColor: theme.primary, borderColor: theme.primary }
                  : { borderColor: theme.border }]}
                onPress={() => setNewActType('PDF')}
              >
                <Feather name="file-text" size={16} color={newActType === 'PDF' ? theme.bg : theme.text} />
                <Text style={{ marginLeft: 6, fontWeight: '600', color: newActType === 'PDF' ? theme.bg : theme.text }}>Arquivo</Text>
              </TouchableOpacity>
            </View>

            {newActType === 'Video' && (
              <TextInput
                style={[s.input, { color: theme.text, borderColor: theme.border, marginBottom: 16 }]}
                placeholder="https://youtu.be/..."
                placeholderTextColor={theme.textDim}
                value={newActUrl}
                onChangeText={setNewActUrl}
                autoCapitalize="none"
              />
            )}

            <TouchableOpacity
              style={[s.publishBtn, { backgroundColor: theme.primary, opacity: isUploading ? 0.6 : 1 }]}
              onPress={handlePublish}
              disabled={isUploading}
            >
              <Feather name="send" size={18} color={theme.bg} />
              <Text style={[s.publishBtnText, { color: theme.bg }]}>
                {isUploading ? 'Enviando...' : newActType === 'Video' ? 'Publicar Vídeo' : 'Selecionar e Publicar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tutoriais publicados */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: theme.text, marginBottom: 16 }]}>
            Publicados ({myActivities.length})
          </Text>

          {myActivities.length === 0 ? (
            <View style={[s.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={{ color: theme.textMuted, fontSize: 13 }}>Nenhum tutorial publicado ainda.</Text>
            </View>
          ) : (
            myActivities.map(act => (
              <View key={act.id} style={[s.activityCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={[s.iconBox, { backgroundColor: theme.primaryLight }]}>
                  <Feather name={act.type === 'Video' ? 'youtube' : 'file-text'} size={20} color={theme.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ color: theme.text, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>{act.title}</Text>
                  <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }}>
                    {act.type} · {new Date(act.createdAt).toLocaleDateString('pt-BR')}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Membros VIP */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: theme.text, marginBottom: 16 }]}>
            Aprendizes ({managedStudents.length})
          </Text>

          {/* Adicionar aluno */}
          <View style={{ backgroundColor: theme.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: theme.border, marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text, marginBottom: 8 }}>Vincular por E-mail</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                style={[s.input, { flex: 1, color: theme.text, borderColor: theme.border, height: 44, paddingHorizontal: 12 }]}
                placeholder="aluno@email.com"
                placeholderTextColor={theme.textDim}
                value={studentEmailInput}
                onChangeText={setStudentEmailInput}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TouchableOpacity
                style={{ backgroundColor: theme.primary, borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' }}
                onPress={handleAddStudent}
              >
                <Text style={{ color: theme.bg, fontWeight: '800', fontSize: 13 }}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Lista de alunos */}
          <View style={[s.studentsList, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {managedStudents.length === 0 ? (
              <Text style={{ color: theme.textMuted, fontSize: 13, textAlign: 'center', padding: 20 }}>
                Nenhum membro inscrito ainda.
              </Text>
            ) : (
              managedStudents.map((student, index) => (
                <View
                  key={student.id}
                  style={[
                    s.studentItem,
                    index !== managedStudents.length - 1 && [s.studentBorder, { borderBottomColor: theme.border }]
                  ]}
                >
                  <View style={[s.studentRow, { flex: 1 }]}>
                    <View style={[s.avatar, { backgroundColor: theme.primary }]}>
                      <Text style={[s.avatarText, { color: theme.bg }]}>
                        {(student.name || '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={{ color: theme.text, fontWeight: '600', fontSize: 14 }} numberOfLines={1}>
                        {student.name}
                      </Text>
                      <Text style={{ color: theme.textDim, fontSize: 12 }} numberOfLines={1}>{student.email}</Text>
                      {student.status === 'Pendente' && (
                        <Text style={{ color: '#f59e0b', fontSize: 11, fontWeight: '600' }}>● Aguardando cadastro</Text>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity
                    style={{ paddingLeft: 12 }}
                    onPress={() =>
                      Alert.alert(
                        'Remover Aprendiz',
                        `Remover ${student.name} da sua comunidade?`,
                        [
                          { text: 'Cancelar', style: 'cancel' },
                          { text: 'Remover', style: 'destructive', onPress: () => removeStudent(student.id) },
                        ]
                      )
                    }
                  >
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

const s = StyleSheet.create({
  root:     { flex: 1 },
  scroll:   { flex: 1 },
  content:  { padding: 16, paddingBottom: 40 },
  topBar:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 52, paddingBottom: 12 },
  logo:     { fontSize: 22, fontWeight: '800' },
  header:   { marginBottom: 24, marginTop: 10 },
  title:    { fontSize: 24, fontWeight: '900' },
  subtitle: { fontSize: 14, marginTop: 4 },

  statsRow:  { flexDirection: 'row', gap: 10, marginTop: 20 },
  statCard:  { flex: 1, borderRadius: 14, borderWidth: 1, paddingVertical: 14, alignItems: 'center', gap: 4 },
  statNum:   { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 11, fontWeight: '600' },
  shareBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 20, marginTop: 16, alignSelf: 'stretch' },
  shareBtnText: { fontWeight: '800', fontSize: 13 },

  codeBox:   { marginTop: 16, padding: 20, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
  codeLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 8 },
  codeRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  codeText:  { fontSize: 32, fontWeight: '900', letterSpacing: 4 },
  copyBtn:   { marginLeft: 16, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },

  input:   { borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, height: 48, fontSize: 15 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderWidth: 1, borderRadius: 8 },

  publishBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, gap: 8 },
  publishBtnText: { fontWeight: '800', fontSize: 15 },

  section:       { marginBottom: 32 },
  sectionTitle:  { fontSize: 18, fontWeight: '800' },
  emptyCard:     { padding: 20, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
  activityCard:  { padding: 14, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  iconBox:       { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  studentsList:  { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  studentItem:   { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  studentBorder: { borderBottomWidth: 1 },
  studentRow:    { flexDirection: 'row', alignItems: 'center' },
  avatar:        { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText:    { fontWeight: '800', fontSize: 14 },
});
