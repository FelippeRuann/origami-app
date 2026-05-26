import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Modal, Animated, Image, ActivityIndicator, Alert, Switch, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { useApp } from '../context/AppContext';

const { width } = Dimensions.get('window');

export default function Profile() {
  const { user, theme, logout, updateAvatar, removeAvatar, isDarkMode, toggleTheme, upgradeToPro, downgradeFromPro, importedProjects, setCurrentRoute, ACHIEVEMENT_DEFS, updateRank, notifPrefs, updateNotifPrefs } = useApp();
  const [showSettings, setShowSettings] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showRankSelector, setShowRankSelector] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProPage, setShowProPage] = useState(false);
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
      setShowEditProfile(false);
      setShowRankSelector(false);
      setShowNotifications(false);
      setShowProPage(false);
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
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setUploadingAvatar(true);
      // Envia o arquivo direto conforme solicitado (assets[0].file no Web)
      const imageFile = result.assets[0].file || result.assets[0].uri;
      const response = await updateAvatar(imageFile);
      setUploadingAvatar(false);

      if (!response.success) {
        alert("Erro ao atualizar foto: " + response.error);
      }
    }
  };

  const handleSaveNotifPrefs = async (newPrefs) => {
    try {
      if (newPrefs.dailyReminder || newPrefs.streakAlert) {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permissão negada', 'Ative as notificações nas configurações do dispositivo para receber lembretes.');
          return;
        }
      }
      await Notifications.cancelAllScheduledNotificationsAsync();
      if (newPrefs.dailyReminder) {
        const [h, m] = (newPrefs.reminderTime || '20:00').split(':').map(Number);
        await Notifications.scheduleNotificationAsync({
          content: { title: 'Hora de dobrar!', body: 'Seu lembrete diário de origami está esperando.', sound: true },
          trigger: { hour: h, minute: m, repeats: true },
        });
      }
      if (newPrefs.streakAlert) {
        await Notifications.scheduleNotificationAsync({
          content: { title: 'Não quebre seu streak!', body: 'Pratique origami hoje para manter sua sequência.', sound: true },
          trigger: { hour: 20, minute: 0, repeats: true },
        });
      }
      await updateNotifPrefs(newPrefs);
    } catch (e) {
      console.warn('Erro ao configurar notificações:', e);
    }
  };

  const handleSupportEmail = () => {
    Linking.openURL('mailto:suporte@exemplo.com?subject=Ajuda%20-%20OrigamiApp');
  };

  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      {/* Top bar */}
      <View style={[s.topBar, { backgroundColor: theme.bg }]}>
        <Text style={[s.logo, { color: theme.text }]}><Text style={{ color: theme.primary }}>Origami</Text>App</Text>
        <View style={s.topBarActions}>
          {(user?.email === 'admin@exemplo.com' || user?.email === 'admin@exemplo.com') && (
            <TouchableOpacity 
              style={[s.settingsBtn, { backgroundColor: theme.surface, borderColor: theme.border, marginRight: 10 }]} 
              onPress={() => setCurrentRoute('AdminDiscovery')}
            >
              <Feather name="database" size={20} color={theme.primary} />
            </TouchableOpacity>
          )}
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
              <Text style={[s.statNum, { color: theme.primary }]}>{user?.watchedVideos || 0}</Text>
              <Text style={[s.statLabel, { color: theme.textDim }]}>Assistidos</Text>
            </View>
            <View style={[s.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[s.statNum, { color: theme.primary }]}>{user?.achievements?.length || 0}</Text>
              <Text style={[s.statLabel, { color: theme.textDim }]}>Conquistas</Text>
            </View>
            <View style={[s.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[s.statNum, { color: theme.primary }]}>{user?.streak || 0}</Text>
              <Text style={[s.statLabel, { color: theme.textDim }]}>Streak 🔥</Text>
            </View>
          </View>

          {/* Streak context */}
          {(user?.streak || 0) > 0 && (
            <Text style={{ color: theme.textMuted, fontSize: 12, textAlign: 'center', marginTop: 12 }}>
              Último acesso: {user?.lastStreakDate ? new Date(user.lastStreakDate).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' }) : '—'}
            </Text>
          )}
        </View>

        {/* Conquistas */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: theme.text }]}>Conquistas</Text>
          <Text style={{ color: theme.textMuted, fontSize: 13, marginBottom: 16 }}>
            {user?.achievements?.length || 0} de {(ACHIEVEMENT_DEFS || []).length} desbloqueadas
          </Text>
          <View style={s.achieveList}>
            {(ACHIEVEMENT_DEFS || []).map(def => {
              const unlocked = user?.achievements?.includes(def.id) ?? false;
              return (
                <View key={def.id} style={[s.achieveCard, { backgroundColor: theme.surface, borderColor: unlocked ? theme.primary + '60' : theme.border, opacity: unlocked ? 1 : 0.45 }]}>
                  <View style={[s.achieveIcon, { backgroundColor: unlocked ? theme.primaryLight : theme.bg }]}>
                    <Feather name={unlocked ? def.icon : 'lock'} size={24} color={unlocked ? theme.primary : theme.textMuted} />
                  </View>
                  <View style={s.achieveInfo}>
                    <Text style={[s.achieveTitle, { color: theme.text }]}>{def.title}</Text>
                    <Text style={[s.achieveDesc, { color: theme.textMuted }]}>{def.desc}</Text>
                  </View>
                  {unlocked && (
                    <Feather name="check-circle" size={18} color={theme.primary} style={{ marginLeft: 8 }} />
                  )}
                </View>
              );
            })}
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
                {showRankSelector ? 'Nível de Dobragem' : showEditProfile ? 'Editar Perfil' : showNotifications ? 'Notificações' : showProPage ? 'Plano Pro' : 'Configurações'}
              </Text>
              <TouchableOpacity onPress={handleCloseSettings} style={s.closeBtn}>
                <Feather name="x" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {showRankSelector ? (
              <View style={[s.linksCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                {['Iniciante', 'Intermediário', 'Avançado'].map((rank, i) => {
                  const rankColors = { 'Iniciante': '#22C55E', 'Intermediário': '#3B82F6', 'Avançado': '#F59E0B' };
                  const color = rankColors[rank];
                  const isSelected = user?.rank === rank;
                  return (
                    <TouchableOpacity
                      key={rank}
                      style={[s.linkRow, i > 0 && { borderTopWidth: 1, borderTopColor: theme.border }, isSelected && { backgroundColor: color + '18' }]}
                      onPress={async () => { await updateRank(rank); setShowRankSelector(false); }}
                    >
                      <View>
                        <Text style={[s.linkText, { color: isSelected ? color : theme.text }]}>{rank}</Text>
                        {isSelected && <Text style={{ fontSize: 11, color, marginTop: 2 }}>Nível atual</Text>}
                      </View>
                      <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: color, backgroundColor: isSelected ? color : 'transparent' }} />
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity style={[s.linkRow, { borderTopWidth: 1, borderTopColor: theme.border }]} onPress={() => setShowRankSelector(false)}>
                  <Text style={[s.linkText, { color: theme.textDim }]}>Voltar</Text>
                  <Feather name="arrow-left" size={20} color={theme.textDim} />
                </TouchableOpacity>
              </View>

            ) : showEditProfile ? (
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

            ) : showNotifications ? (
              <View style={[s.linksCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                {/* Daily Reminder */}
                <View style={s.notifRow}>
                  <View style={s.notifInfo}>
                    <Text style={[s.notifLabel, { color: theme.text }]}>Lembrete diário</Text>
                    <Text style={[s.notifDesc, { color: theme.textDim }]}>Hora de praticar origami</Text>
                  </View>
                  <Switch
                    value={notifPrefs?.dailyReminder || false}
                    onValueChange={v => handleSaveNotifPrefs({ ...(notifPrefs || {}), dailyReminder: v })}
                    trackColor={{ false: theme.border, true: theme.primary }}
                    thumbColor="#fff"
                  />
                </View>
                {notifPrefs?.dailyReminder && (
                  <View style={[s.timeSelector, { borderTopWidth: 1, borderTopColor: theme.border }]}>
                    <Text style={[s.timeSelectorLabel, { color: theme.textDim }]}>Horário do lembrete</Text>
                    <View style={s.timePills}>
                      {['07:00', '09:00', '12:00', '18:00', '20:00', '22:00'].map(t => {
                        const active = (notifPrefs?.reminderTime || '20:00') === t;
                        return (
                          <TouchableOpacity
                            key={t}
                            onPress={() => handleSaveNotifPrefs({ ...(notifPrefs || {}), reminderTime: t })}
                            style={[s.timePill, { backgroundColor: active ? theme.primary : theme.bg, borderColor: active ? theme.primary : theme.border }]}
                          >
                            <Text style={{ color: active ? '#fff' : theme.textDim, fontSize: 13, fontWeight: '600' }}>{t}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
                {/* Streak Alert */}
                <View style={[s.notifRow, { borderTopWidth: 1, borderTopColor: theme.border }]}>
                  <View style={s.notifInfo}>
                    <Text style={[s.notifLabel, { color: theme.text }]}>Alerta de streak</Text>
                    <Text style={[s.notifDesc, { color: theme.textDim }]}>Aviso às 20:00 se não praticou hoje</Text>
                  </View>
                  <Switch
                    value={notifPrefs?.streakAlert || false}
                    onValueChange={v => handleSaveNotifPrefs({ ...(notifPrefs || {}), streakAlert: v })}
                    trackColor={{ false: theme.border, true: theme.primary }}
                    thumbColor="#fff"
                  />
                </View>
                <TouchableOpacity style={[s.linkRow, { borderTopWidth: 1, borderTopColor: theme.border }]} onPress={() => setShowNotifications(false)}>
                  <Text style={[s.linkText, { color: theme.textDim }]}>Voltar</Text>
                  <Feather name="arrow-left" size={20} color={theme.textDim} />
                </TouchableOpacity>
              </View>

            ) : showProPage ? (
              <View style={{ gap: 16 }}>
                {/* Header */}
                <View style={[s.proHeader, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Feather name="star" size={32} color={theme.primary} />
                  <Text style={[s.proHeaderTitle, { color: theme.text }]}>Plano Pro</Text>
                  <Text style={[s.proHeaderSub, { color: theme.textDim }]}>
                    {user?.isPro ? 'Você já é um membro Pro!' : 'Acesso completo ao OrigamiApp'}
                  </Text>
                </View>
                {/* Benefits */}
                <View style={[s.linksCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  {[
                    { icon: 'award',      text: 'Área exclusiva de professor' },
                    { icon: 'users',      text: 'Gestão de turmas e alunos' },
                    { icon: 'share-2',    text: 'Publique PDFs e atividades' },
                    { icon: 'bookmark',   text: 'Sem limite de origamis salvos' },
                    { icon: 'headphones', text: 'Suporte prioritário' },
                  ].map((b, i) => (
                    <View key={b.text} style={[s.benefitRow, i > 0 && { borderTopWidth: 1, borderTopColor: theme.border }]}>
                      <View style={[s.benefitIcon, { backgroundColor: theme.primaryLight }]}>
                        <Feather name={b.icon} size={18} color={theme.primary} />
                      </View>
                      <Text style={[s.benefitText, { color: theme.text }]}>{b.text}</Text>
                      <Feather name="check" size={16} color={theme.primary} />
                    </View>
                  ))}
                </View>
                {/* CTA */}
                {!user?.isPro ? (
                  <TouchableOpacity
                    style={[s.proBtn, { backgroundColor: theme.primary }]}
                    onPress={() => { upgradeToPro(true); setShowProPage(false); handleCloseSettings(); }}
                  >
                    <Text style={[s.proBtnText, { color: '#fff' }]}>Tornar-se Pro</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[s.proBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.danger }]}
                    onPress={() => { downgradeFromPro(); setShowProPage(false); handleCloseSettings(); }}
                  >
                    <Text style={[s.proBtnText, { color: theme.danger }]}>Cancelar assinatura</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[s.linkRow, { borderTopWidth: 0 }]} onPress={() => setShowProPage(false)}>
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
                <TouchableOpacity style={[s.linkRow, { borderTopWidth: 1, borderTopColor: theme.border }]} onPress={() => setShowRankSelector(true)}>
                  <View>
                    <Text style={[s.linkText, { color: theme.text }]}>Nível de Dobragem</Text>
                    <Text style={{ fontSize: 12, color: ({ 'Iniciante': '#22C55E', 'Intermediário': '#3B82F6', 'Avançado': '#F59E0B' })[user?.rank] || '#22C55E', marginTop: 1 }}>{user?.rank || 'Iniciante'}</Text>
                  </View>
                  <Feather name="bar-chart-2" size={20} color={theme.textDim} />
                </TouchableOpacity>
                <TouchableOpacity style={[s.linkRow, { borderTopWidth: 1, borderTopColor: theme.border }]} onPress={() => setShowNotifications(true)}>
                  <View>
                    <Text style={[s.linkText, { color: theme.text }]}>Notificações</Text>
                    <Text style={{ fontSize: 12, color: theme.textDim, marginTop: 1 }}>
                      {(notifPrefs?.dailyReminder || notifPrefs?.streakAlert) ? 'Ativas' : 'Desativadas'}
                    </Text>
                  </View>
                  <Feather name="bell" size={20} color={theme.textDim} />
                </TouchableOpacity>
                <TouchableOpacity style={[s.linkRow, { borderTopWidth: 1, borderTopColor: theme.border }]} onPress={() => setShowProPage(true)}>
                  <View>
                    <Text style={[s.linkText, { color: user?.isPro ? theme.primary : theme.text }]}>Assinatura Pro</Text>
                    <Text style={{ fontSize: 12, color: user?.isPro ? theme.primary : theme.textDim, marginTop: 1 }}>
                      {user?.isPro ? 'Ativo' : 'Plano gratuito'}
                    </Text>
                  </View>
                  <Feather name="star" size={20} color={user?.isPro ? theme.primary : theme.textDim} />
                </TouchableOpacity>
                <TouchableOpacity style={[s.linkRow, { borderTopWidth: 1, borderTopColor: theme.border }]} onPress={handleSupportEmail}>
                  <Text style={[s.linkText, { color: theme.text }]}>Ajuda e Suporte</Text>
                  <Feather name="mail" size={20} color={theme.textDim} />
                </TouchableOpacity>

                {/* Dev: simulate Pro */}
                {(user?.email === 'admin@exemplo.com' || user?.email === 'admin@exemplo.com' || user?.email === 'suporte@exemplo.com') && (
                  !user?.isPro ? (
                    <TouchableOpacity
                      style={[s.linkRow, { borderTopWidth: 1, borderTopColor: theme.border }]}
                      onPress={() => { upgradeToPro(true); handleCloseSettings(); }}
                    >
                      <Text style={[s.linkText, { color: theme.primary }]}>Simular Conta Pro/Origamista</Text>
                      <Feather name="zap" size={20} color={theme.primary} />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[s.linkRow, { borderTopWidth: 1, borderTopColor: theme.border }]}
                      onPress={() => { downgradeFromPro(); handleCloseSettings(); }}
                    >
                      <Text style={[s.linkText, { color: theme.danger }]}>Remover Conta Pro</Text>
                      <Feather name="zap" size={20} color={theme.danger} />
                    </TouchableOpacity>
                  )
                )}

                <TouchableOpacity
                  style={[s.linkRow, { borderTopWidth: 1, borderTopColor: theme.border }]}
                  onPress={() => { handleCloseSettings(); logout(); }}
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

  // Notifications sub-page
  notifRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  notifInfo: { flex: 1, marginRight: 12 },
  notifLabel: { fontSize: 15, fontWeight: '600' },
  notifDesc: { fontSize: 12, marginTop: 2 },
  timeSelector: { padding: 16 },
  timeSelectorLabel: { fontSize: 11, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  timePills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timePill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },

  // Pro sub-page
  proHeader: { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: 'center', gap: 8 },
  proHeaderTitle: { fontSize: 22, fontWeight: '800' },
  proHeaderSub: { fontSize: 14, textAlign: 'center' },
  benefitRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  benefitIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  benefitText: { flex: 1, fontSize: 15, fontWeight: '600' },
  proBtn: { borderRadius: 16, padding: 18, alignItems: 'center' },
  proBtnText: { fontSize: 17, fontWeight: '800' },
});
