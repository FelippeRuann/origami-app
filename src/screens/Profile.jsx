import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Modal, Animated, Image, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../context/AppContext';

const { width } = Dimensions.get('window');

const ACHIEVEMENTS = [
  { id: '1', icon: 'zap', title: '7 Day Streak', desc: 'Folded every day for a week', unlocked: true },
  { id: '2', icon: 'award', title: 'Master Folder', desc: 'Complete 50 advanced models', unlocked: false },
  { id: '3', icon: 'star', title: 'First Creation', desc: 'Upload your first custom PDF', unlocked: true },
];

export default function Profile() {
  const { user, theme, logout, updateAvatar, removeAvatar, isDarkMode, toggleTheme, upgradeToPro, downgradeFromPro } = useApp();
  const [showSettings, setShowSettings] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const handleOpenSettings = () => {
    setShowSettings(true);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true })
    ]).start();
  };

  const handleCloseSettings = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 400, duration: 250, useNativeDriver: true })
    ]).start(() => {
      setShowSettings(false);
      setShowEditProfile(false); // Reseta o menu ao fechar
    });
  };

  const handlePickImage = async () => {
    // Pedir permissão para acessar a galeria
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      alert("Precisamos da sua permissão para acessar a galeria!");
      return;
    }

    // Abrir a galeria
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // Cortar em quadrado
      quality: 0.5, // Comprimir a imagem para não ficar muito pesada
    });

    if (!result.canceled) {
      setUploadingAvatar(true);
      const response = await updateAvatar(result.assets[0].uri);
      setUploadingAvatar(false);
      
      if (!response.success) {
        alert("Erro ao atualizar foto: " + response.error);
      }
    }
  };

  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      {/* Top bar */}
      <View style={[s.topBar, { backgroundColor: theme.bg }]}>
        <Text style={[s.logo, { color: theme.text }]}><Text style={{ color: theme.primary }}>Origami</Text>App</Text>
        <View style={s.topBarActions}>
          <TouchableOpacity style={[s.settingsBtn, { backgroundColor: theme.surface, borderColor: theme.border, marginRight: 10 }]} onPress={toggleTheme}>
            <Feather name={isDarkMode ? 'sun' : 'moon'} size={20} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity style={[s.settingsBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={handleOpenSettings}>
            <Feather name="settings" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={s.header}>
          <TouchableOpacity 
            style={[s.avatarWrap, { borderColor: theme.primary, backgroundColor: theme.secondary }]}
            onPress={handlePickImage}
            disabled={uploadingAvatar}
          >
            {uploadingAvatar ? (
              <ActivityIndicator color={theme.primary} size="large" />
            ) : user?.photo?.startsWith('http') ? (
              <Image source={{ uri: user.photo }} style={s.avatarImage} />
            ) : (
              <Feather name={user?.photo || 'user'} size={40} color={theme.primary} />
            )}
            
            <View style={[s.editBadge, { backgroundColor: theme.primary, borderColor: theme.bg }]}>
              <Feather name="camera" size={12} color={theme.bg} />
            </View>

            {user?.isPro && (
              <View style={[s.proBadge, { backgroundColor: theme.primary }]}>
                <Text style={[s.proText, { color: theme.bg }]}>PRO</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={[s.name, { color: theme.text }]}>{user?.name || 'Origami Master'}</Text>
          <Text style={[s.email, { color: theme.textMuted }]}>{user?.email || 'master@origamiapp.com'}</Text>
          
          <View style={s.statsContainer}>
            <View style={[s.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[s.statNum, { color: theme.primary }]}>42</Text>
              <Text style={[s.statLabel, { color: theme.textDim }]}>Folded</Text>
            </View>
            <View style={[s.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[s.statNum, { color: theme.primary }]}>12</Text>
              <Text style={[s.statLabel, { color: theme.textDim }]}>Saved</Text>
            </View>
            <View style={[s.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[s.statNum, { color: theme.primary }]}>14</Text>
              <Text style={[s.statLabel, { color: theme.textDim }]}>Streak</Text>
            </View>
          </View>
        </View>

        {/* Achievements */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: theme.text }]}>Achievements</Text>
          <View style={s.achieveList}>
            {ACHIEVEMENTS.map(a => (
              <View key={a.id} style={[s.achieveCard, { backgroundColor: theme.surface, borderColor: theme.border, opacity: a.unlocked ? 1 : 0.5 }]}>
                <View style={[s.achieveIcon, { backgroundColor: a.unlocked ? theme.primaryLight : theme.bg }]}>
                  <Feather name={a.unlocked ? a.icon : 'lock'} size={24} color={a.unlocked ? theme.primary : theme.textMuted} />
                </View>
                <View style={s.achieveInfo}>
                  <Text style={[s.achieveTitle, { color: theme.text }]}>{a.title}</Text>
                  <Text style={[s.achieveDesc, { color: theme.textMuted }]}>{a.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Settings Modal */}
      <Modal visible={showSettings} transparent={true} animationType="none" onRequestClose={handleCloseSettings}>
        <Animated.View style={[s.modalOverlay, { opacity: fadeAnim }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleCloseSettings} />
          <Animated.View style={[s.modalContent, { backgroundColor: theme.bg, borderColor: theme.border, transform: [{ translateY: slideAnim }] }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: theme.text }]}>
                {showEditProfile ? 'Editar Perfil' : 'Configurações'}
              </Text>
              <TouchableOpacity onPress={handleCloseSettings} style={s.closeBtn}>
                <Feather name="x" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {showEditProfile ? (
              <View style={[s.linksCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <TouchableOpacity style={s.linkRow} onPress={handlePickImage}>
                  <Text style={[s.linkText, { color: theme.primary }]}>Escolher nova foto da galeria</Text>
                  <Feather name="image" size={20} color={theme.primary} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[s.linkRow, { borderTopWidth: 1, borderTopColor: theme.border }]} 
                  onPress={async () => {
                    setUploadingAvatar(true);
                    await removeAvatar();
                    setUploadingAvatar(false);
                    setShowEditProfile(false);
                  }}
                >
                  <Text style={[s.linkText, { color: theme.danger }]}>Remover foto atual</Text>
                  <Feather name="trash-2" size={20} color={theme.danger} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[s.linkRow, { borderTopWidth: 1, borderTopColor: theme.border }]} 
                  onPress={() => setShowEditProfile(false)}
                >
                  <Text style={[s.linkText, { color: theme.textDim }]}>Voltar</Text>
                  <Feather name="arrow-left" size={20} color={theme.textDim} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[s.linksCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <TouchableOpacity style={s.linkRow} onPress={() => setShowEditProfile(true)}>
                  <Text style={[s.linkText, { color: theme.text }]}>Editar Perfil (Foto)</Text>
                  <Feather name="edit-2" size={20} color={theme.textDim} />
                </TouchableOpacity>
                
                {/* Botão temporário para simular conta Pro/Professor */}
                {!user?.isPro ? (
                  <TouchableOpacity 
                    style={[s.linkRow, { borderTopWidth: 1, borderTopColor: theme.border }]}
                    onPress={() => {
                      upgradeToPro(true); // true = vira professor também
                      handleCloseSettings();
                      alert("Conta atualizada para Pro/Professor!");
                    }}
                  >
                    <Text style={[s.linkText, { color: theme.primary }]}>Simular Conta Pro/Professor</Text>
                    <Feather name="star" size={20} color={theme.primary} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={[s.linkRow, { borderTopWidth: 1, borderTopColor: theme.border }]}
                    onPress={() => {
                      downgradeFromPro();
                      handleCloseSettings();
                      alert("Conta revertida para o plano Gratuito!");
                    }}
                  >
                    <Text style={[s.linkText, { color: theme.danger }]}>Remover Conta Pro/Professor</Text>
                    <Feather name="star" size={20} color={theme.danger} />
                  </TouchableOpacity>
                )}

                {['Notificações', 'Assinatura Pro', 'Ajuda e Suporte'].map((link, i) => (
                  <TouchableOpacity key={link} style={[s.linkRow, { borderTopWidth: 1, borderTopColor: theme.border }]}>
                    <Text style={[s.linkText, { color: theme.text }]}>{link}</Text>
                    <Feather name="chevron-right" size={20} color={theme.textDim} />
                  </TouchableOpacity>
                ))}
                <TouchableOpacity 
                  style={[s.linkRow, { borderTopWidth: 1, borderTopColor: theme.border }]}
                  onPress={() => {
                    handleCloseSettings();
                    logout();
                  }}
                >
                  <Text style={[s.linkText, { color: theme.danger }]}>Sair da Conta</Text>
                  <Feather name="log-out" size={20} color={theme.danger} />
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </Animated.View>
      </Modal>
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
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo:      { fontSize: 22, fontWeight: '800' },
  settingsBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },

  header: { alignItems: 'center', paddingVertical: 30 },
  avatarWrap: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  avatarImage: { width: '100%', height: '100%', borderRadius: 50 },
  editBadge: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  proBadge: { position: 'absolute', bottom: -8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  proText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  name: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  email: { fontSize: 14, marginBottom: 24 },
  
  statsContainer: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, width: '100%' },
  statBox: { flex: 1, paddingVertical: 16, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '900', marginBottom: 4 },
  statLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  section: { paddingHorizontal: 20, marginBottom: 30 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  
  achieveList: { gap: 12 },
  achieveCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1 },
  achieveIcon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  achieveInfo: { flex: 1, marginLeft: 16 },
  achieveTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  achieveDesc: { fontSize: 13 },

  linksCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  linkText: { fontSize: 15, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, borderWidth: 1, borderBottomWidth: 0 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  closeBtn: { padding: 4 },
});
